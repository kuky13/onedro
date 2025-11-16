import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

export interface UpdateLicenseData {
  license_id: string;
  license_code?: string;
  expires_at?: string;
  is_active?: boolean;
  notes?: string;
}

export interface UseUpdateLicenseReturn {
  updateLicense: (data: UpdateLicenseData) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const useUpdateLicense = (): UseUpdateLicenseReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const updateLicense = async (data: UpdateLicenseData): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validações básicas
      if (!data.license_id) {
        throw new Error('ID da licença é obrigatório');
      }

      if (data.license_code && data.license_code.trim().length < 3) {
        throw new Error('Código da licença deve ter pelo menos 3 caracteres');
      }

      if (data.expires_at) {
        const expirationDate = new Date(data.expires_at);
        const now = new Date();
        if (expirationDate <= now) {
          throw new Error('Data de expiração deve ser no futuro');
        }
      }

      // Chamar a função admin_update_license
      const { data: result, error: updateError } = await supabase.rpc('admin_update_license', {
        p_license_id: data.license_id,
        p_license_code: data.license_code || null,
        p_expires_at: data.expires_at || null,
        p_is_active: data.is_active !== undefined ? data.is_active : null,
        p_notes: data.notes || null
      });

      if (updateError) {
        throw updateError;
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Erro ao atualizar licença');
      }

      showSuccess({
        title: 'Licença atualizada',
        description: 'A licença foi atualizada com sucesso'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar licença';
      setError(errorMessage);
      
      showError({
        title: 'Erro ao atualizar licença',
        description: errorMessage
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateLicense,
    isLoading,
    error
  };
};