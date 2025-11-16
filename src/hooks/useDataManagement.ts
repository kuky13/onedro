import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

// Interfaces
export interface TableStats {
  table_name: string;
  record_count: number;
  table_size: string;
  last_modified: string;
}

export interface DatabaseStats {
  total_tables: number;
  total_records: number;
  database_size: string;
  last_backup: string;
}

export interface ExportData {
  id: string;
  [key: string]: any;
}

export interface CleanupResult {
  deleted_count: number;
  operation_status: string;
}

export interface OptimizeResult {
  table_name: string;
  operation_status: string;
}

// Hook principal
export const useDataManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Query para estatísticas de tabelas
  const {
    data: tableStats,
    isLoading: isLoadingTableStats,
    refetch: refetchTableStats
  } = useQuery({
    queryKey: ['admin', 'table-stats'],
    queryFn: async (): Promise<TableStats[]> => {
      try {
        const { data, error } = await supabase.rpc('admin_get_table_stats');
        if (error) {
          if (error.message.includes('Could not find the function')) {
            console.warn('Função admin_get_table_stats não encontrada, retornando dados vazios');
            return [];
          }
          throw error;
        }
        return data || [];
      } catch (error) {
        console.warn('Erro ao buscar estatísticas de tabelas:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // Não tentar novamente se a função não existir
  });

  // Query para estatísticas do banco
  const {
    data: databaseStats,
    isLoading: isLoadingDatabaseStats,
    refetch: refetchDatabaseStats
  } = useQuery({
    queryKey: ['admin', 'database-stats'],
    queryFn: async (): Promise<DatabaseStats> => {
      try {
        const { data, error } = await supabase.rpc('admin_get_database_stats');
        if (error) {
          if (error.message.includes('Could not find the function')) {
            console.warn('Função admin_get_database_stats não encontrada, retornando dados padrão');
            return {
              total_tables: 0,
              total_records: 0,
              database_size: '0 MB',
              last_backup: new Date().toISOString()
            };
          }
          throw error;
        }
        return data?.[0] || {
          total_tables: 0,
          total_records: 0,
          database_size: '0 MB',
          last_backup: new Date().toISOString()
        };
      } catch (error) {
        console.warn('Erro ao buscar estatísticas do banco:', error);
        return {
          total_tables: 0,
          total_records: 0,
          database_size: '0 MB',
          last_backup: new Date().toISOString()
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: false, // Não tentar novamente se a função não existir
  });

  // Função para download de CSV
  const downloadCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportação",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escapar aspas e vírgulas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mutation para exportar usuários
  const exportUsersMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_export_users_data');
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('Função de exportação não disponível. Verifique se as migrações foram aplicadas.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      downloadCSV(data, 'usuarios');
      toast({
        title: "Sucesso",
        description: "Dados de usuários exportados com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao exportar usuários: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutation para exportar logs
  const exportLogsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_export_logs_data');
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('Função de exportação não disponível. Verifique se as migrações foram aplicadas.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      downloadCSV(data, 'logs_administrativos');
      toast({
        title: "Sucesso",
        description: "Logs administrativos exportados com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao exportar logs: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutation para exportar orçamentos
  const exportBudgetsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_export_budgets_data');
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('Função de exportação não disponível. Verifique se as migrações foram aplicadas.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      downloadCSV(data, 'orcamentos');
      toast({
        title: "Sucesso",
        description: "Dados de orçamentos exportados com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao exportar orçamentos: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutation para limpeza de logs antigos
  const cleanupLogsMutation = useMutation({
    mutationFn: async (daysToKeep: number = 90) => {
      const { data, error } = await supabase.rpc('admin_cleanup_old_logs', { days_to_keep: daysToKeep });
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('Função de limpeza não disponível. Verifique se as migrações foram aplicadas.');
        }
        throw error;
      }
      return data?.[0];
    },
    onSuccess: (result: CleanupResult) => {
      toast({
        title: "Sucesso",
        description: `${result.operation_status}. ${result.deleted_count} registros removidos.`,
      });
      refetchTableStats();
      refetchDatabaseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro na limpeza: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutation para otimização de tabelas
  const optimizeTablesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('admin_optimize_tables');
      if (error) {
        if (error.message.includes('Could not find the function')) {
          throw new Error('Função de otimização não disponível. Verifique se as migrações foram aplicadas.');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (results: OptimizeResult[]) => {
      const successCount = results.filter(r => r.operation_status.includes('sucesso')).length;
      toast({
        title: "Sucesso",
        description: `${successCount} tabelas otimizadas com sucesso`,
      });
      refetchTableStats();
      refetchDatabaseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro na otimização: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Função para simular backup completo
  const createBackup = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simular progresso
      const steps = [
        { progress: 20, message: "Preparando backup..." },
        { progress: 40, message: "Exportando usuários..." },
        { progress: 60, message: "Exportando orçamentos..." },
        { progress: 80, message: "Exportando logs..." },
        { progress: 100, message: "Finalizando backup..." }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setExportProgress(step.progress);
      }

      // Exportar todos os dados com tratamento de erro
      const exportPromises = [
        supabase.rpc('admin_export_users_data').catch(error => {
          console.warn('Erro ao exportar usuários:', error);
          return { data: [], error };
        }),
        supabase.rpc('admin_export_budgets_data').catch(error => {
          console.warn('Erro ao exportar orçamentos:', error);
          return { data: [], error };
        }),
        supabase.rpc('admin_export_logs_data').catch(error => {
          console.warn('Erro ao exportar logs:', error);
          return { data: [], error };
        })
      ];

      const [usersData, budgetsData, logsData] = await Promise.all(exportPromises);

      // Criar arquivo de backup combinado
      const backupData = {
        timestamp: new Date().toISOString(),
        users: usersData.data || [],
        budgets: budgetsData.data || [],
        logs: logsData.data || [],
        errors: {
          users: usersData.error ? usersData.error.message : null,
          budgets: budgetsData.error ? budgetsData.error.message : null,
          logs: logsData.error ? logsData.error.message : null
        }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { 
        type: 'application/json;charset=utf-8;' 
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `backup_completo_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Sucesso",
        description: "Backup completo criado com sucesso",
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: `Erro ao criar backup: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return {
    // Estados
    isExporting,
    exportProgress,
    
    // Dados
    tableStats,
    databaseStats,
    isLoadingTableStats,
    isLoadingDatabaseStats,
    
    // Funções de exportação
    exportUsers: () => exportUsersMutation.mutate(),
    exportLogs: () => exportLogsMutation.mutate(),
    exportBudgets: () => exportBudgetsMutation.mutate(),
    createBackup,
    
    // Funções de manutenção
    cleanupOldLogs: (days?: number) => cleanupLogsMutation.mutate(days),
    optimizeTables: () => optimizeTablesMutation.mutate(),
    
    // Estados de loading
    isExportingUsers: exportUsersMutation.isPending,
    isExportingLogs: exportLogsMutation.isPending,
    isExportingBudgets: exportBudgetsMutation.isPending,
    isCleaningLogs: cleanupLogsMutation.isPending,
    isOptimizing: optimizeTablesMutation.isPending,
    
    // Funções de refresh
    refetchStats: () => {
      refetchTableStats();
      refetchDatabaseStats();
    }
  };
};