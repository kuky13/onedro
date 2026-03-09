import React, { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { routeMiddleware } from '../middleware/routeMiddleware';
import { supabase } from '../integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';

const devLog = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const devWarn = (...args: any[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};

interface LicenseStatusMonitorProps {
  onLicenseStatusChange?: (status: 'active' | 'inactive') => void;
}

/**
 * Componente invisível que monitora mudanças no status da licença em tempo real
 * Utiliza Supabase Realtime para detectar alterações e redirecionar automaticamente
 */
export const LicenseStatusMonitor: React.FC<LicenseStatusMonitorProps> = ({
  onLicenseStatusChange
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastStatusRef = useRef<string | null>(null);
  const monitorIntervalRef = useRef<NodeJS.Timeout>();
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      // Limpar monitoramento se usuário não estiver logado
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = undefined;
      }
      return;
    }

    devLog('🔍 Iniciando monitoramento de licença para usuário:', user.id);

    // Monitoramento em tempo real via Supabase Realtime
    const setupRealtimeMonitoring = () => {
      subscriptionRef.current = supabase
        .channel(`license_changes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'licenses',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            devLog('📡 Mudança detectada na licença:', payload);
            
            const oldLicense = payload.old as any;
            const newLicense = payload.new as any;
            
            // Ignorar mudanças que são apenas do last_validation (para evitar loops)
            if (oldLicense && newLicense && 
                oldLicense.is_active === newLicense.is_active &&
                oldLicense.expires_at === newLicense.expires_at &&
                oldLicense.user_id === newLicense.user_id) {
              devLog('🔍 Ignorando atualização de last_validation apenas');
              return;
            }
            
            const currentStatus = newLicense.is_active ? 'active' : 'inactive';
            
            if (lastStatusRef.current !== currentStatus) {
              lastStatusRef.current = currentStatus;
              
              devLog(`🔄 Status da licença alterado para: ${currentStatus}`);
              
              // Invalidar cache do middleware
              routeMiddleware.invalidateState();
              
              // Notificar mudança via callback
              onLicenseStatusChange?.(currentStatus);
              
              // Se licença foi desativada, forçar redirecionamento suave
              if (currentStatus === 'inactive') {
                devWarn('🚫 Licença desativada - redirecionando para verificação');
                
                // Aguardar um pouco para garantir que o estado foi invalidado
                setTimeout(() => {
                  if (location.pathname !== '/verify-licenca') {
                    navigate('/verify-licenca');
                  }
                }, 100);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            devLog('✅ Monitoramento em tempo real ativo');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro no canal de monitoramento');
            // Tentar reconectar após 5 segundos
            setTimeout(setupRealtimeMonitoring, 5000);
          }
        });
    };

    // Iniciar monitoramento em tempo real
    setupRealtimeMonitoring();

    // Verificação periódica como fallback (a cada 2 minutos)
    const setupPeriodicCheck = () => {
      monitorIntervalRef.current = setInterval(async () => {
        try {
          devLog('🔄 Verificação periódica de licença');
          
          const result = await routeMiddleware.canAccessRoute(location.pathname, true);
          
          if (!result.canAccess && result.licenseStatus === 'inactive') {
            devWarn('🚫 Licença inativa detectada na verificação periódica');
            
            // Invalidar estado e redirecionar
            routeMiddleware.invalidateState();
            
            onLicenseStatusChange?.('inactive');
            
            // Redirecionar para verificação suavemente
            if (location.pathname !== '/verify-licenca') {
              navigate('/verify-licenca');
            }
          }
        } catch (error) {
          console.error('❌ Erro na verificação periódica de licença:', error);
        }
      }, 10 * 60 * 1000); // 10 minutos (realtime é o canal principal)
    };

    setupPeriodicCheck();

    // Cleanup ao desmontar ou trocar usuário
    return () => {
      // evitar ruído em produção
      devLog('🧹 Limpando monitoramento de licença');
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = undefined;
      }
    };
  }, [user, onLicenseStatusChange, location.pathname, navigate]);

  // Verificação inicial do status da licença usando RPC com AbortController
  useEffect(() => {
    if (!user) return;

    const abortController = new AbortController();

    const checkInitialStatus = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_user_license_status', {
            p_user_id: user.id
          });

        if (abortController.signal.aborted) return;

        if (error) throw error;

        if (data && typeof data === 'object') {
          const licenseData = data as { 
            has_license: boolean; 
            is_valid: boolean; 
            requires_activation: boolean;
            requires_renewal: boolean;
          };
          
          // Determinar status com base nos novos critérios
          let initialStatus: 'active' | 'inactive';
          let shouldRedirect = false;
          let redirectPath = '';
          
          if (!licenseData.has_license) {
            initialStatus = 'inactive';
            shouldRedirect = true;
            redirectPath = '/licenca';
            devLog('📊 Nenhuma licença encontrada - redirecionando para ativação');
          } else if (licenseData.requires_activation || licenseData.requires_renewal || !licenseData.is_valid) {
            initialStatus = 'inactive';
            shouldRedirect = true;
            redirectPath = '/verify-licenca';
            devLog('📊 Licença inativa/expirada - redirecionando para verificação');
          } else if (licenseData.has_license && licenseData.is_valid) {
            initialStatus = 'active';
            devLog('📊 Licença válida - acesso permitido');
          } else {
            initialStatus = 'inactive';
            shouldRedirect = true;
            redirectPath = '/verify-licenca';
            devLog('📊 Status desconhecido - redirecionando para verificação');
          }
          
          lastStatusRef.current = initialStatus;
          
          // Notificar mudança via callback
          onLicenseStatusChange?.(initialStatus);
          
          // Redirecionar se necessário (apenas se não estivermos já na página correta)
          if (shouldRedirect && location.pathname !== redirectPath) {
            devLog(`🔄 Redirecionamento automático: ${location.pathname} → ${redirectPath}`);
            setTimeout(() => {
              if (location.pathname !== redirectPath) {
                navigate(redirectPath);
              }
            }, 100);
          }
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          devWarn('⚠️ Erro ao verificar status inicial da licença:', error);
          onLicenseStatusChange?.('inactive');
        }
      }
    };

    checkInitialStatus();

    return () => {
      abortController.abort();
    };
  }, [user, onLicenseStatusChange, location.pathname, navigate]);

  return null;
};

export default LicenseStatusMonitor;