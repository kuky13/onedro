import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { SystemStatus } from './useMaintenanceMode';

export interface UpdateStatusData {
  status: 'maintenance' | 'error';
  message: string;
  estimated_resolution?: string | null;
}

export const useSystemStatus = () => {
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar o status atual
  const {
    data: systemStatus,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['system-status'],
    queryFn: async (): Promise<SystemStatus | null> => {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar status do sistema:', error);
        throw error;
      }

      return data as SystemStatus;
    },
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutation para atualizar o status
  const updateStatusMutation = useMutation({
    mutationFn: async (data: UpdateStatusData) => {
      if (!systemStatus?.id) {
        throw new Error('ID do status não encontrado');
      }

      const updateData: any = {
        status: data.status,
        message: data.message,
        updated_at: new Date().toISOString(),
      };

      // Só incluir estimated_resolution se não estiver vazio
      if (data.estimated_resolution?.trim()) {
        updateData.estimated_resolution = new Date(data.estimated_resolution).toISOString();
      } else {
        updateData.estimated_resolution = null;
      }

      const { error } = await supabase
        .from('system_status')
        .update(updateData)
        .eq('id', systemStatus.id);

      if (error) throw error;

      return updateData;
    },
    onSuccess: () => {
      showSuccess({ title: 'Status do sistema atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar status:', error);
      showError({ title: 'Erro ao atualizar status: ' + error.message });
    },
  });

  // Mutation para alternar modo de manutenção
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('toggle_maintenance_mode');
      
      if (error) throw error;
      
      return data as boolean;
    },
    onSuccess: (newStatus) => {
      showSuccess(
        newStatus 
          ? 'Modo de manutenção ativado!' 
          : 'Modo de manutenção desativado!'
      );
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
    onError: (error: any) => {
      console.error('Erro ao alternar modo de manutenção:', error);
      showError('Erro ao alternar modo de manutenção: ' + error.message);
    },
  });

  // Função para verificar se o modo de manutenção está ativo
  const checkMaintenanceMode = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_maintenance_mode_active');
      
      if (error) {
        console.error('❌ Erro ao verificar modo de manutenção:', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      console.error('❌ Erro na função checkMaintenanceMode:', error);
      return false;
    }
  };

  return {
    // Data
    systemStatus,
    isLoading,
    error,
    
    // Actions
    updateStatus: updateStatusMutation.mutate,
    toggleMaintenance: toggleMaintenanceMutation.mutate,
    checkMaintenanceMode,
    refetch,
    
    // Loading states
    isUpdating: updateStatusMutation.isPending,
    isToggling: toggleMaintenanceMutation.isPending,
  };
};