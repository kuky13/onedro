import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export interface TrialLicenseStatus {
  has_trial: boolean;
  is_active: boolean;
  license_code: string | null;
  created_at: string | null;
  expires_at: string | null;
  days_remaining: number | null;
  is_expired: boolean;
  can_create_trial: boolean;
  message: string;
}

export interface TrialLicenseStatistics {
  total_trials: number;
  active_trials: number;
  expired_trials: number;
  trials_created_today: number;
  trials_created_this_week: number;
  trials_created_this_month: number;
  conversion_rate: number;
}

export interface UseTrialLicenseReturn {
  trialStatus: TrialLicenseStatus | null;
  isLoading: boolean;
  error: string | null;
  createTrialLicense: () => Promise<boolean>;
  refreshTrialStatus: () => Promise<void>;
  isCreatingTrial: boolean;
}

export function useTrialLicense(): UseTrialLicenseReturn {
  const { user } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [trialStatus, setTrialStatus] = useState<TrialLicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTrial, setIsCreatingTrial] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar status da licença de teste
  const fetchTrialStatus = useCallback(async () => {
    if (!user?.id) {
      setTrialStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_trial_license_status', {
          p_user_id: user.id
        });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        const d: any = data as any;
        const status: TrialLicenseStatus = {
          has_trial: d.has_trial || false,
          is_active: d.is_active || false,
          license_code: d.license_code || null,
          created_at: d.created_at || null,
          expires_at: d.expires_at || null,
          days_remaining: d.days_remaining || null,
          is_expired: d.is_expired || false,
          can_create_trial: d.can_create_trial || false,
          message: d.message || 'Status do acesso de teste'
        };

        setTrialStatus(status);
      } else {
        // Usuário sem licença de teste
        setTrialStatus({
          has_trial: false,
          is_active: false,
          license_code: null,
          created_at: null,
          expires_at: null,
          days_remaining: null,
          is_expired: false,
          can_create_trial: true,
          message: 'Nenhum acesso de teste encontrado'
        });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
        console.error('Erro ao buscar status da licença de teste:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      }
      setTrialStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Criar licença de teste
  const createTrialLicense = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      showError({
        title: 'Erro de Autenticação',
        description: 'Usuário não autenticado'
      });
      return false;
    }

    if (trialStatus?.has_trial) {
      showInfo({
        title: 'Acesso de Teste Existente',
        description: 'Você já possui um acesso de teste'
      });
      return false;
    }

    setIsCreatingTrial(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('create_trial_license', {
          p_user_id: user.id
        });

      if (rpcError) {
        throw rpcError;
      }

      const d: any = data as any;
      if (d && d.success) {
        showSuccess({
          title: 'Acesso de Teste Criado!',
          description: `Seu acesso de teste de 7 dias foi ativado. Chave: ${d.license_code}`
        });

        // Atualizar status
        await fetchTrialStatus();
        return true;
      } else {
        const errorMessage = d?.error || 'Falha ao criar acesso de teste';
        showError({
          title: 'Erro na Criação',
          description: errorMessage
        });
        setError(errorMessage);
        return false;
      }
    } catch (err) {
      console.error('Erro ao criar licença de teste:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      showError({
        title: 'Erro Inesperado',
        description: errorMessage
      });
      setError(errorMessage);
      return false;
    } finally {
      setIsCreatingTrial(false);
    }
  }, [user?.id, trialStatus?.has_trial, showSuccess, showError, showInfo, fetchTrialStatus]);

  // Atualizar status
  const refreshTrialStatus = useCallback(async () => {
    await fetchTrialStatus();
  }, [fetchTrialStatus]);

  // Carregar status inicial
  useEffect(() => {
    fetchTrialStatus();
  }, [fetchTrialStatus]);

  return {
    trialStatus,
    isLoading,
    error,
    createTrialLicense,
    refreshTrialStatus,
    isCreatingTrial
  };
}

// Hook para administradores visualizarem estatísticas de licenças de teste
export function useTrialLicenseStatistics() {
  const [statistics, setStatistics] = useState<TrialLicenseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_trial_license_statistics');

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        const d: any = data as any;
        setStatistics({
          total_trials: d?.total_trials || 0,
          active_trials: d?.active_trials || 0,
          expired_trials: d?.expired_trials || 0,
          trials_created_today: d?.trials_created_today || 0,
          trials_created_this_week: d?.trials_created_this_week || 0,
          trials_created_this_month: d?.trials_created_this_month || 0,
          conversion_rate: d?.conversion_rate || 0
        });
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas de licenças de teste:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refresh: fetchStatistics
  };
}

// Hook para limpeza manual de licenças de teste (admin)
export function useTrialLicenseCleanup() {
  const { showSuccess, showError } = useToast();
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const cleanupExpiredTrials = useCallback(async () => {
    setIsCleaningUp(true);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('cleanup_expired_trial_licenses');

      if (rpcError) {
        throw rpcError;
      }

      const d: any = data as any;
      if (d && d.success) {
        showSuccess({
          title: 'Limpeza Concluída',
          description: `${d.deactivated_count || 0} licenças desativadas, ${d.deleted_count || 0} licenças removidas`
        });
        return true;
      } else {
        throw new Error(d?.error || 'Falha na limpeza');
      }
    } catch (err) {
      console.error('Erro na limpeza de licenças de teste:', err);
      showError({
        title: 'Erro na Limpeza',
        description: err instanceof Error ? err.message : 'Erro desconhecido'
      });
      return false;
    } finally {
      setIsCleaningUp(false);
    }
  }, [showSuccess, showError]);

  return {
    cleanupExpiredTrials,
    isCleaningUp
  };
}
