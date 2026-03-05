import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface LicenseVerificationData {
  has_license: boolean;
  is_valid: boolean;
  license_code?: string;
  expires_at?: string;
  activated_at?: string;
  days_remaining?: number;
  message: string;
  requires_activation: boolean;
  requires_renewal: boolean;
  expired_at?: string;
  validation_timestamp: string;
}

interface UseLicenseVerificationOptions {
  cacheTTL?: number;
  enableWebSocket?: boolean;
  enablePolling?: boolean;
}

export const useLicenseVerification = (
  userId: string | null,
  options: UseLicenseVerificationOptions = {}
) => {
  const {
    cacheTTL = 5 * 60 * 1000, // 5 minutos padrão
    enableWebSocket = false,
    enablePolling = false
  } = options;

  const location = useLocation();
  const [data, setData] = useState<LicenseVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const fetchInProgress = useRef(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Evitar consultas automáticas na página de verificação de licença
  const isVerifyLicensePage = location.pathname === '/verify-licenca';

  const fetchLicenseData = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    // Se estivermos na página de verificação, não fazer consultas automáticas
    if (isVerifyLicensePage && !forceRefresh) {
      // Verification page detected - query blocked
      setIsLoading(false);
      return;
    }

    // Verificar cache
    const now = Date.now();
    if (!forceRefresh && lastFetch && (now - lastFetch) < cacheTTL && data) {
      // Using cached data
      return;
    }

    // Evitar múltiplas chamadas simultâneas
    if (fetchInProgress.current) {
      // Fetch already in progress, ignoring
      return;
    }

    try {
      fetchInProgress.current = true;
      setIsLoading(true);
      setError(null);
      
      // Fetching license data

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_license_status', {
          p_user_id: userId
        });

      if (rpcError) {
        throw rpcError;
      }

      const status = (rpcData as any) || {};

      const licenseData: LicenseVerificationData = {
        has_license: Boolean(status.has_license),
        is_valid: Boolean(status.is_valid),
        license_code: status.license_code || '',
        expires_at: status.expires_at ?? undefined,
        activated_at: status.activated_at ?? undefined,
        days_remaining: status.days_remaining ?? undefined,
        message: status.message || 'Status desconhecido',
        requires_activation: Boolean(status.requires_activation),
        requires_renewal: Boolean(status.requires_renewal),
        expired_at: status.expired_at ?? undefined,
        validation_timestamp: status.validation_timestamp || new Date().toISOString()
      };

      // License data processed
      setData(licenseData);
      setLastFetch(now);
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
        console.error('❌ [useLicenseVerification] Erro:', err);
        setError(err instanceof Error ? err.message : 'Erro ao verificar licença');
      }
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, [userId, cacheTTL, isVerifyLicensePage]);

  // Debounced fetch para evitar múltiplas chamadas
  const debouncedFetch = useCallback((forceRefresh = false) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    debounceTimeout.current = setTimeout(() => {
      fetchLicenseData(forceRefresh);
    }, 100);
  }, [fetchLicenseData]);

  // Effect principal para carregar dados
  useEffect(() => {
    // Não executar carregamento automático na página de verificação
    if (isVerifyLicensePage) {
      // Effect blocked on verification page
      return;
    }
    
    debouncedFetch();

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [debouncedFetch, isVerifyLicensePage]);

  // Polling opcional
  useEffect(() => {
    if (!enablePolling || !userId || isVerifyLicensePage) return;

    pollInterval.current = setInterval(() => {
      debouncedFetch();
    }, cacheTTL);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [enablePolling, userId, cacheTTL, debouncedFetch, isVerifyLicensePage]);

  // WebSocket opcional
  useEffect(() => {
    if (!enableWebSocket || !userId || isVerifyLicensePage) return;

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
          // Change detected, updating...
          debouncedFetch(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableWebSocket, userId, debouncedFetch, isVerifyLicensePage]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const refetch = useCallback(() => {
    debouncedFetch(true);
  }, [debouncedFetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isFromCache: lastFetch && data && (Date.now() - lastFetch) < cacheTTL
  };
};