import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LicenseRedirectOptions {
  enabled?: boolean;
  skipRoutes?: string[];
  debug?: boolean;
}

/**
 * Hook especializado para gerenciar redirecionamentos automáticos baseados no status da licença
 * Implementa a lógica robusta de:
 * 1. Sem licença -> /licenca (ativação)
 * 2. Licença inativa/expirada -> /verify-licenca 
 * 3. Licença válida -> acesso normal
 */
export const useLicenseRedirect = (options: LicenseRedirectOptions = {}) => {
  const { enabled = true, skipRoutes = ['/auth', '/verify', '/'], debug = false } = options;
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const isCheckingRef = useRef(false);
  const hasCheckedRef = useRef(false);

  const log = (message: string, data?: any) => {
    if (debug) {
      console.log(`🔄 [useLicenseRedirect] ${message}`, data);
    }
  };

  useEffect(() => {
    if (!enabled || !user || isCheckingRef.current || hasCheckedRef.current) {
      return;
    }

    // Pular verificação em rotas específicas
    if (skipRoutes.some(route => location.pathname.startsWith(route))) {
      log('Pulando verificação - rota na lista de exclusão', { path: location.pathname });
      return;
    }

    // Evitar redirecionamento se já estivermos nas páginas de licença
    if (location.pathname === '/licenca' || location.pathname === '/verify-licenca') {
      log('Já na página de licença - não redirecionando');
      return;
    }

    const checkLicenseAndRedirect = async () => {
      isCheckingRef.current = true;
      log('Iniciando verificação de licença', { userId: user.id, currentPath: location.pathname });

      try {
        const { data: licenseData, error } = await supabase
          .rpc('get_user_license_status', { p_user_id: user.id });

        if (error) {
          log('Erro na RPC - assumindo sem licença', error);
          navigate('/licenca', { replace: true });
          return;
        }

        if (!licenseData) {
          log('Nenhum dado retornado - assumindo sem licença');
          navigate('/licenca', { replace: true });
          return;
        }

        log('Dados da licença recebidos', licenseData);

        // Lógica de redirecionamento baseada no status
        if (!licenseData.has_license) {
          // Caso 1: Usuário sem licença -> /licenca
          log('Redirecionando para ativação - nenhuma licença encontrada');
          navigate('/licenca', { replace: true });
        } else if (licenseData.requires_activation || licenseData.requires_renewal || !licenseData.is_valid) {
          // Caso 2: Licença inativa/expirada -> /verify-licenca
          const reason = licenseData.requires_renewal ? 'expirada' : 
                        licenseData.requires_activation ? 'precisa ativação' : 'inválida';
          log(`Redirecionando para verificação - licença ${reason}`);
          navigate('/verify-licenca', { replace: true });
        } else if (licenseData.has_license && licenseData.is_valid) {
          // Caso 3: Licença válida -> continuar normalmente
          log('Licença válida - acesso permitido');
          hasCheckedRef.current = true; // Marcar como verificado para evitar verificações futuras
        } else {
          // Fallback - redirecionar para verificação
          log('Status desconhecido - redirecionando para verificação');
          navigate('/verify-licenca', { replace: true });
        }

      } catch (error) {
        log('Erro crítico na verificação', error);
        // Em caso de erro, redirecionar para verificação por segurança
        navigate('/verify-licenca', { replace: true });
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Aguardar um pouco para evitar conflitos com outros hooks
    const timer = setTimeout(checkLicenseAndRedirect, 100);

    return () => {
      clearTimeout(timer);
      isCheckingRef.current = false;
    };
  }, [enabled, user, location.pathname, navigate, skipRoutes, debug]);

  // Reset quando usuário muda
  useEffect(() => {
    hasCheckedRef.current = false;
  }, [user?.id]);

  return {
    isChecking: isCheckingRef.current,
    hasChecked: hasCheckedRef.current
  };
};