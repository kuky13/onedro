import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { storageManager } from '@/utils/localStorageManager';

export interface LicenseStatus {
  has_license: boolean;
  is_valid: boolean;
  license_code: string;
  expires_at: string | null;
  activated_at: string | null;
  days_remaining: number | null;
  message: string;
  requires_activation: boolean;
  requires_renewal: boolean;
  expired_at: string | null;
  validation_timestamp: string;
  // Novos campos para o sistema melhorado
  license_type: 'NORMAL' | 'TRIAL' | 'LEGACY' | 'NONE';
  days_granted: number | null;
  is_trial: boolean;
  is_legacy: boolean;
  can_create_trial: boolean;
}

export interface UseLicenseReturn {
  licenseStatus: LicenseStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshLicense: () => Promise<void>;
  hasValidLicense: boolean;
  isExpired: boolean;
  needsActivation: boolean;
  daysUntilExpiry: number | null;
  isOffline: boolean;
  isUsingCache: boolean;
  // Novos campos
  isTrial: boolean;
  isLegacy: boolean;
  daysGranted: number | null;
  canCreateTrial: boolean;
}

export function useLicense(): UseLicenseReturn {
  const { user } = useAuth();
  const { isOffline } = useOfflineDetection();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingCache, setIsUsingCache] = useState(false);

  const validateLicense = async () => {
    if (!user?.id) {
      setLicenseStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setIsUsingCache(false);

      // Se estiver offline, tentar usar cache
      if (isOffline) {
        const cachedLicense = storageManager.getLicenseCache();
        if (cachedLicense && storageManager.hasValidLicenseCache()) {
          setLicenseStatus({
            has_license: cachedLicense.hasValidLicense || false,
            is_valid: cachedLicense.hasValidLicense || false,
            license_code: '',
            expires_at: cachedLicense.expiresAt || null,
            activated_at: null,
            days_remaining: null,
            message: 'Acesso ao suporte válido (modo offline)',
            requires_activation: cachedLicense.needsActivation || false,
            requires_renewal: cachedLicense.isExpired || false,
            expired_at: null,
            validation_timestamp: new Date(cachedLicense.lastVerified || Date.now()).toISOString(),
            license_type: 'NORMAL',
            days_granted: null,
            is_trial: false,
            is_legacy: false,
            can_create_trial: false
          });
          setIsUsingCache(true);
          setIsLoading(false);
          return;
        } else {
          // Offline sem cache válido
          setLicenseStatus({
            has_license: false,
            is_valid: false,
            license_code: '',
            expires_at: null,
            activated_at: null,
            days_remaining: null,
            message: 'Sem conexão - verifique sua internet',
            requires_activation: true,
            requires_renewal: false,
            expired_at: null,
            validation_timestamp: new Date().toISOString(),
            license_type: 'NONE',
            days_granted: null,
            is_trial: false,
            is_legacy: false,
            can_create_trial: true
          });
          setError('Sem conexão com a internet');
          setIsLoading(false);
          return;
        }
      }

      // Online - verificar normalmente usando a função RPC atualizada
      const { data, error: rpcError } = await supabase
        .rpc('get_user_license_status', {
          p_user_id: user.id
        });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        // A função RPC agora retorna todas as informações necessárias diretamente
        const licenseData = data as any;
        
        const licenseStatus: LicenseStatus = {
          has_license: licenseData.has_license || false,
          is_valid: licenseData.is_valid || false,
          license_code: licenseData.license_code || '',
          expires_at: licenseData.expires_at || null,
          activated_at: licenseData.activated_at || null,
          days_remaining: licenseData.days_remaining || null,
          message: licenseData.message || 'Status desconhecido',
          requires_activation: licenseData.requires_activation || false,
          requires_renewal: licenseData.requires_renewal || false,
          expired_at: null, // Calculado baseado em expires_at se necessário
          validation_timestamp: licenseData.validation_timestamp || new Date().toISOString(),
          license_type: licenseData.license_type || 'NONE',
          days_granted: licenseData.days_granted || null,
          is_trial: licenseData.is_trial || false,
          is_legacy: licenseData.is_legacy || false,
          can_create_trial: licenseData.can_create_trial || false
        };

        setLicenseStatus(licenseStatus);

        // Salvar no cache se a licença for válida
        if (licenseStatus.has_license && licenseStatus.is_valid) {
          storageManager.setLicenseCache({
            hasValidLicense: true,
            licenseStatus: licenseData.license_code || '',
            ...(licenseStatus.expires_at ? { expiresAt: licenseStatus.expires_at } : {}),
            isExpired: licenseStatus.requires_renewal,
            needsActivation: licenseStatus.requires_activation
          });
        }
      } else {
        const defaultStatus: LicenseStatus = {
          has_license: false,
          is_valid: false,
          license_code: '',
          expires_at: null,
          activated_at: null,
          days_remaining: null,
          message: 'Nenhum acesso ao suporte encontrado',
          requires_activation: true,
          requires_renewal: false,
          expired_at: null,
          validation_timestamp: new Date().toISOString(),
          license_type: 'NONE',
          days_granted: null,
          is_trial: false,
          is_legacy: false,
          can_create_trial: true
        };
        setLicenseStatus(defaultStatus);
        
        // Limpar cache se não há licença
        storageManager.clearLicenseCache();
      }
    } catch (err) {
      console.error('Erro ao validar licença:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Em caso de erro online, tentar usar cache como fallback
      if (!isOffline) {
        const cachedLicense = storageManager.getLicenseCache();
        if (cachedLicense && storageManager.hasValidLicenseCache()) {
          setLicenseStatus({
            has_license: cachedLicense.hasValidLicense || false,
            is_valid: cachedLicense.hasValidLicense || false,
            license_code: '',
            expires_at: cachedLicense.expiresAt || null,
            activated_at: null,
            days_remaining: null,
            message: 'Acesso ao suporte válido (cache local)',
            requires_activation: cachedLicense.needsActivation || false,
            requires_renewal: cachedLicense.isExpired || false,
            expired_at: null,
            validation_timestamp: new Date(cachedLicense.lastVerified || Date.now()).toISOString(),
            license_type: 'NORMAL',
            days_granted: null,
            is_trial: false,
            is_legacy: false,
            can_create_trial: false
          });
          setIsUsingCache(true);
        } else {
          setLicenseStatus(null);
        }
      } else {
        setLicenseStatus(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateLicense();
  }, [user?.id, isOffline]);

  const refreshLicense = async () => {
    await validateLicense();
  };

  const hasValidLicense = licenseStatus?.has_license === true && licenseStatus?.is_valid === true;
  const isExpired = licenseStatus?.requires_renewal === true;
  const needsActivation = licenseStatus?.requires_activation === true;
  const daysUntilExpiry = licenseStatus?.days_remaining || null;
  const isTrial = licenseStatus?.is_trial === true;
  const isLegacy = licenseStatus?.is_legacy === true;
  const daysGranted = licenseStatus?.days_granted || null;
  const canCreateTrial = licenseStatus?.can_create_trial === true;

  return {
    licenseStatus,
    isLoading,
    error,
    refreshLicense,
    hasValidLicense,
    isExpired,
    needsActivation,
    daysUntilExpiry,
    isOffline,
    isUsingCache,
    isTrial,
    isLegacy,
    daysGranted,
    canCreateTrial
  };
}
