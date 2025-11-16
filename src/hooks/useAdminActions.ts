import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';

export interface AdminActionData {
  action: string;
  details?: Record<string, any>;
  target_id?: string;
}

export const useAdminActions = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Verificar se o usuário é admin
  const checkAdminPermission = async (): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: user.id
      });
      
      if (error) {
        console.error('❌ Erro ao verificar permissão de admin:', error);
        throw error;
      }
      
      return data as boolean;
    } catch (error) {
      console.error('❌ Erro na verificação de admin:', error);
      return false;
    }
  };

  // Mutation para executar ações administrativas
  const executeAdminActionMutation = useMutation({
    mutationFn: async (actionData: AdminActionData) => {
      // Verificar permissão antes de executar
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado: apenas administradores podem executar esta ação');
      }

      // Log da ação administrativa
      const logData = {
        user_id: user?.id,
        action: actionData.action,
        details: actionData.details || {},
        target_id: actionData.target_id,
        timestamp: new Date().toISOString(),
      };

      // Aqui você pode implementar diferentes tipos de ações
      switch (actionData.action) {
        case 'toggle_maintenance':
          const { data: toggleResult, error: toggleError } = await supabase.rpc('toggle_maintenance_mode');
          if (toggleError) throw toggleError;
          return { success: true, result: toggleResult, log: logData };

        case 'update_system_status':
          if (!actionData.details?.status_id) {
            throw new Error('ID do status é obrigatório');
          }
          
          const { error: updateError } = await supabase
            .from('system_status')
            .update({
              status: actionData.details.status,
              message: actionData.details.message,
              estimated_resolution: actionData.details.estimated_resolution,
              updated_at: new Date().toISOString(),
            })
            .eq('id', actionData.details.status_id);
          
          if (updateError) throw updateError;
          return { success: true, log: logData };

        case 'force_refresh_status':
          // Invalidar todas as queries relacionadas ao status
          queryClient.invalidateQueries({ queryKey: ['system-status'] });
          queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
          return { success: true, log: logData };

        default:
          throw new Error(`Ação não reconhecida: ${actionData.action}`);
      }
    },
    onSuccess: (result, variables) => {
      const actionMessages: Record<string, string> = {
        'toggle_maintenance': 'Modo de manutenção alterado com sucesso!',
        'update_system_status': 'Status do sistema atualizado!',
        'force_refresh_status': 'Status atualizado!',
      };
      
      const message = actionMessages[variables.action] || 'Ação executada com sucesso!';
      showSuccess(message);
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
    },
    onError: (error: any, variables) => {
      console.error(`❌ Erro ao executar ação ${variables.action}:`, error);
      showError({ title: `Erro ao executar ação: ${error.message}` });
    },
  });

  // Função para alternar modo de manutenção
  const toggleMaintenance = () => {
    executeAdminActionMutation.mutate({
      action: 'toggle_maintenance',
      details: { timestamp: new Date().toISOString() }
    });
  };

  // Função para atualizar status do sistema
  const updateSystemStatus = (statusData: {
    status_id: string;
    status: 'maintenance' | 'error';
    message: string;
    estimated_resolution?: string | null;
  }) => {
    executeAdminActionMutation.mutate({
      action: 'update_system_status',
      details: statusData
    });
  };

  // Função para forçar atualização do status
  const forceRefreshStatus = () => {
    executeAdminActionMutation.mutate({
      action: 'force_refresh_status'
    });
  };

  return {
    // Verificações
    checkAdminPermission,
    
    // Ações
    executeAdminAction: executeAdminActionMutation.mutate,
    toggleMaintenance,
    updateSystemStatus,
    forceRefreshStatus,
    
    // Estados
    isExecuting: executeAdminActionMutation.isPending,
    error: executeAdminActionMutation.error,
  };
};