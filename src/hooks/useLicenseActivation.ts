import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export interface LicenseActivationResult {
  success: boolean;
  message: string;
  license_code?: string;
  activated_at?: string;
  expires_at?: string;
  days_granted?: number;
  error_code?: string;
}

export interface LicensePreview {
  days: number;
  is_trial: boolean;
  is_legacy: boolean;
  valid_format: boolean;
}

export interface UseLicenseActivationReturn {
  activateLicense: (licenseCode: string) => Promise<LicenseActivationResult>;
  previewLicense: (licenseCode: string) => Promise<LicensePreview | null>;
  isActivating: boolean;
  isPreviewing: boolean;
  error: string | null;
  validateLicenseFormat: (code: string) => boolean;
}

export function useLicenseActivation(): UseLicenseActivationReturn {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isActivating, setIsActivating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validar formato do código de licença
  const validateLicenseFormat = useCallback((code: string): boolean => {
    if (!code || typeof code !== 'string') return false;
    
    // Remover espaços e converter para maiúsculo
    const cleanCode = code.trim().toUpperCase();
    
    // Verificar se tem 13 caracteres
    if (cleanCode.length !== 13) return false;
    
    // Aceitar qualquer string alfanumérica de 13 caracteres como válida
    // A validação real de estrutura (6 dígitos + 7 chars) será feita no backend se necessário
    // Isso evita falsos negativos no frontend
    return /^[A-Z0-9]{13}$/.test(cleanCode);
  }, []);

  // Preview da licença (quantos dias ela concederá)
  const previewLicense = useCallback(async (licenseCode: string): Promise<LicensePreview | null> => {
    if (!validateLicenseFormat(licenseCode)) {
      return null;
    }

    setIsPreviewing(true);
    setError(null);

    try {
      const cleanCode = licenseCode.trim().toUpperCase();
      
      // Verificar se é licença de teste
      if (cleanCode.startsWith('TRIAL')) {
        return {
          days: 7,
          is_trial: true,
          is_legacy: false,
          valid_format: true
        };
      }

      // Usar a função RPC para preview
      const { data, error: rpcError } = await supabase
        .rpc('preview_license_duration', {
          p_license_code: cleanCode
        });

      if (rpcError) {
        console.error('Erro no preview da licença:', rpcError);
        setError(rpcError.message);
        return null;
      }

      if (data && typeof data === 'object') {
        const preview = data as any;
        return {
          days: preview?.days || 0,
          is_trial: preview?.is_trial || false,
          is_legacy: preview?.is_legacy || false,
          valid_format: true
        };
      }

      return null;
    } catch (err) {
      console.error('Erro ao fazer preview da licença:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    } finally {
      setIsPreviewing(false);
    }
  }, [validateLicenseFormat]);

  // Ativar licença
  const activateLicense = useCallback(async (licenseCode: string): Promise<LicenseActivationResult> => {
    if (!user?.id) {
      const result = {
        success: false,
        message: 'Usuário não autenticado',
        error_code: 'UNAUTHENTICATED'
      };
      showError({
        title: 'Erro de Autenticação',
        description: result.message
      });
      return result;
    }

    if (!validateLicenseFormat(licenseCode)) {
      const result = {
        success: false,
        message: 'Formato de código inválido',
        error_code: 'INVALID_FORMAT'
      };
      showError({
        title: 'Código Inválido',
        description: result.message
      });
      return result;
    }

    setIsActivating(true);
    setError(null);

    try {
      const cleanCode = licenseCode.trim().toUpperCase();

      // Usar a função RPC corrigida para ativação
      const { data, error: rpcError } = await supabase
        .rpc('activate_license_fixed', {
          p_license_code: cleanCode,
          p_user_id: user.id
        });

      if (rpcError) {
        console.error('Erro na ativação da licença:', rpcError);
        const result = {
          success: false,
          message: rpcError.message || 'Erro ao ativar acesso ao suporte',
          error_code: 'RPC_ERROR'
        };
        showError({
          title: 'Erro na Ativação',
          description: result.message
        });
        setError(result.message);
        return result;
      }

      const isActivationPayload = (value: unknown): value is Record<string, any> => {
        return !!value && typeof value === 'object' && ('success' in (value as any) || 'error' in (value as any));
      };

      const payload = isActivationPayload(data) ? (data as any) : null;

      if (payload?.success === true) {
        const result: LicenseActivationResult = {
          success: true,
          message: payload.message || 'Acesso ao suporte ativado com sucesso',
          license_code: payload.license_code,
          activated_at: payload.activated_at,
          expires_at: payload.expires_at,
          days_granted: payload.days_granted
        };

        showSuccess({
          title: 'Acesso ao Suporte Ativado!',
          description: `${result.message}${result.days_granted ? ` (${result.days_granted} dias)` : ''}`
        });

        return result;
      }

      const result = {
        success: false,
        message: payload?.error || 'Falha na ativação do acesso ao suporte',
        error_code: payload?.error_code || 'ACTIVATION_FAILED'
      };

      showError({
        title: 'Falha na Ativação',
        description: result.message
      });
      setError(result.message);
      return result;
    } catch (err) {
      console.error('Erro ao ativar licença:', err);
      const result = {
        success: false,
        message: err instanceof Error ? err.message : 'Erro desconhecido',
        error_code: 'UNKNOWN_ERROR'
      };
      showError({
        title: 'Erro Inesperado',
        description: result.message
      });
      setError(result.message);
      return result;
    } finally {
      setIsActivating(false);
    }
  }, [user?.id, validateLicenseFormat, showSuccess, showError]);

  return {
    activateLicense,
    previewLicense,
    isActivating,
    isPreviewing,
    error,
    validateLicenseFormat
  };
}
