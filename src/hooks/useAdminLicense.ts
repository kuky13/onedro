import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminLicenseStats {
  total_licenses: number;
  active_licenses: number;
  expired_licenses: number;
  trial_licenses: number;
  legacy_licenses: number;
  normal_licenses: number;
  licenses_by_days: Array<{
    days: number;
    count: number;
    percentage: number;
  }>;
}

export interface CreateLicenseParams {
  days: number;
  quantity: number;
  description?: string;
}

export interface CreateMixedLicensesParams {
  licenses: Array<{
    days: number;
    quantity: number;
  }>;
  description?: string;
}

export interface ConvertLegacyParams {
  license_code: string;
  new_days: number;
}

export function useAdminLicense() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLicenseWithDays = async (params: CreateLicenseParams): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_create_license_with_days', {
          p_days: params.days,
          p_quantity: params.quantity,
          p_description: params.description || null
        });

      if (rpcError) {
        throw rpcError;
      }

      if (!data || !Array.isArray(data)) {
        throw new Error('Resposta inválida do servidor');
      }

      toast.success(`${data.length} licença(s) criada(s) com sucesso!`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao criar licenças: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createMixedLicenses = async (params: CreateMixedLicensesParams): Promise<string[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_create_mixed_licenses', {
          p_licenses: params.licenses,
          p_description: params.description || null
        });

      if (rpcError) {
        throw rpcError;
      }

      if (!data || !Array.isArray(data)) {
        throw new Error('Resposta inválida do servidor');
      }

      const totalLicenses = data.length;
      toast.success(`${totalLicenses} licença(s) mista(s) criada(s) com sucesso!`);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao criar licenças mistas: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getLicenseStatsByDays = async (): Promise<AdminLicenseStats> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_get_license_stats_by_days');

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error('Nenhum dado retornado');
      }

      return data as AdminLicenseStats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao obter estatísticas: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const convertLegacyLicense = async (params: ConvertLegacyParams): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_convert_legacy_license', {
          p_old_license_code: params.license_code,
          p_new_days: params.new_days
        });

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error('Falha na conversão da licença');
      }

      toast.success('Licença legada convertida com sucesso!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao converter licença: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createTrialForUser = async (userId: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_create_trial_for_user', {
          p_user_id: userId
        });

      if (rpcError) {
        throw rpcError;
      }

      if (!data) {
        throw new Error('Falha na criação da licença de teste');
      }

      toast.success('Licença de teste criada com sucesso!');
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao criar licença de teste: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const repairMissingTrialLicenses = async (): Promise<number> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_repair_missing_trial_licenses');

      if (rpcError) {
        throw rpcError;
      }

      const repaired = data || 0;
      if (repaired > 0) {
        toast.success(`${repaired} licença(s) de teste reparada(s)!`);
      } else {
        toast.info('Nenhuma licença de teste precisava ser reparada');
      }

      return repaired;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao reparar licenças: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getDatabaseStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_get_database_stats');

      if (rpcError) {
        throw rpcError;
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao obter estatísticas do banco: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const optimizeDatabase = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_optimize_database');

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        toast.success('Banco de dados otimizado com sucesso!');
      }

      return data || false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao otimizar banco: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const manualLicenseCleanup = async (): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('admin_manual_license_cleanup');

      if (rpcError) {
        throw rpcError;
      }

      const totalDeleted = data?.total_deleted || 0;
      const totalUpdated = data?.total_updated || 0;
      
      if (totalDeleted > 0 || totalUpdated > 0) {
        toast.success(`Limpeza concluída: ${totalDeleted} licenças removidas, ${totalUpdated} licenças desativadas`);
      } else {
        toast.info('Nenhuma licença precisava ser limpa');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro na limpeza de licenças: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getLicenseCleanupLogs = async (): Promise<any[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('license_cleanup_logs')
        .select('*')
        .order('cleanup_date', { ascending: false })
        .limit(50);

      if (queryError) {
        throw queryError;
      }

      return data || [];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast.error(`Erro ao obter logs de limpeza: ${errorMessage}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    createLicenseWithDays,
    createMixedLicenses,
    getLicenseStatsByDays,
    convertLegacyLicense,
    createTrialForUser,
    repairMissingTrialLicenses,
    getDatabaseStats,
    optimizeDatabase,
    manualLicenseCleanup,
    getLicenseCleanupLogs
  };
}