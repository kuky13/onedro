import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { licenseCache } from './useLicenseCache';
import { LicenseVerificationData } from './useLicenseVerification';

interface UseLicenseVerificationOptimizedOptions {
  skipCache?: boolean;
  enableRealtime?: boolean;
}

/**
 * Hook otimizado para verificação de licença que evita consultas desnecessárias
 * e implementa cache inteligente para prevenir loops infinitos
 */
export const useLicenseVerificationOptimized = (
  userId: string | null,
  options: UseLicenseVerificationOptimizedOptions = {}
) => {
  const { skipCache = false, enableRealtime = false } = options;
  
  const location = useLocation();
  const [data, setData] = useState<LicenseVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchInProgress = useRef(false);
  const hasInitialFetch = useRef(false);

  // Detectar se estamos na página de verificação
  const isVerifyLicensePage = location.pathname === '/verify-licenca';

  const fetchLicenseData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Evitar múltiplas chamadas simultâneas
    if (fetchInProgress.current) {
      console.log('🔍 [useLicenseVerificationOptimized] Fetch já em progresso, ignorando');
      return;
    }

    // Verificar cache primeiro (se não for skip cache e não for força refresh)
    if (!skipCache && !forceRefresh) {
      const cachedData = licenseCache.get(userId);
      if (cachedData) {
        console.log('🔍 [useLicenseVerificationOptimized] Usando dados do cache');
        setData(cachedData);
        setIsLoading(false);
        return;
      }
    }

    try {
      fetchInProgress.current = true;
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 [useLicenseVerificationOptimized] Buscando dados da licença para:', userId);

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_license_status', {
          p_user_id: userId
        });

      if (rpcError) {
        throw rpcError;
      }

      const licenseData: LicenseVerificationData = {
        has_license: rpcData?.has_license || false,
        is_valid: rpcData?.is_valid || false,
        license_code: rpcData?.license_code || '',
        expires_at: rpcData?.expires_at || null,
        activated_at: rpcData?.activated_at || null,
        days_remaining: rpcData?.days_remaining || null,
        message: rpcData?.message || 'Status desconhecido',
        requires_activation: rpcData?.requires_activation || false,
        requires_renewal: rpcData?.requires_renewal || false,
        expired_at: rpcData?.expired_at || null,
        validation_timestamp: rpcData?.validation_timestamp || new Date().toISOString()
      };

      console.log('✅ [useLicenseVerificationOptimized] Dados processados:', licenseData);
      
      // Salvar no cache
      licenseCache.set(userId, licenseData);
      setData(licenseData);
      
    } catch (err) {
      console.error('❌ [useLicenseVerificationOptimized] Erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao verificar licença');
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [userId, skipCache]);

  // Effect principal - executa apenas uma vez quando o userId muda
  useEffect(() => {
    if (!userId) {
      setData(null);
      setIsLoading(false);
      hasInitialFetch.current = false;
      return;
    }

    // Na página de verificação, permitir um único fetch controlado
    if (isVerifyLicensePage) {
      console.log('🔍 [useLicenseVerificationOptimized] Página de verificação - fetch único permitido');
    }

    // Fazer apenas um fetch inicial
    if (!hasInitialFetch.current) {
      hasInitialFetch.current = true;
      fetchLicenseData();
    }
  }, [userId, isVerifyLicensePage, fetchLicenseData]);

  // WebSocket opcional para atualizações em tempo real
  useEffect(() => {
    if (!enableRealtime || !userId || isVerifyLicensePage) return;

    console.log('🔍 [useLicenseVerificationOptimized] Configurando WebSocket');
    
    const channel = supabase
      .channel(`license_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'licenses',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('🔔 [useLicenseVerificationOptimized] Mudança detectada, invalidando cache...');
          licenseCache.invalidate(userId);
          fetchLicenseData(true);
        }
      )
      .subscribe();

    return () => {
      console.log('🔍 [useLicenseVerificationOptimized] Removendo WebSocket');
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, userId, fetchLicenseData, isVerifyLicensePage]);

  // Reset quando sair da página de verificação
  useEffect(() => {
    if (!isVerifyLicensePage) {
      hasInitialFetch.current = false;
    }
  }, [isVerifyLicensePage]);

  const refetch = useCallback(() => {
    if (userId) {
      licenseCache.invalidate(userId);
      fetchLicenseData(true);
    }
  }, [userId, fetchLicenseData]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
};