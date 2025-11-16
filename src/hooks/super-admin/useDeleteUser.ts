import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DeleteUserParams {
  userId: string;
  confirmationText: string;
  deleteAuthUser?: boolean;
}

interface DeleteUserResponse {
  success: boolean;
  message: string;
  deleted_data: {
    user_profile: boolean;
    transactions: number;
    files: number;
    clients: number;
    notifications_as_target: number;
    notifications_created_by_nullified: number;
    push_subscriptions: number;
    user_notifications: number;
    user_license_history: number;
    user_cookie_preferences: number;
    whatsapp_analytics_sessions: number;
    whatsapp_analytics_messages: number;
    sequential_numbers: number;
    company_share_settings: number;
    user_updates: number;
    budgets_owner_nullified: number;
    budgets_created_by_nullified: number;
    budgets_updated_by_nullified: number;
    total_tables_affected: number;
    user_email: string;
    user_name: string;
    deleted_at: string;
    deleted_by_admin: string;
    auth_user_deleted?: boolean;
  };
}

const deleteUserCompletely = async ({ 
  userId, 
  confirmationText, 
  deleteAuthUser = true 
}: DeleteUserParams): Promise<DeleteUserResponse> => {
  console.log('Iniciando exclusão completa do usuário:', { userId, confirmationText, deleteAuthUser });
  
  try {
    // Use only the enhanced function to avoid duplicate logs
    const { data, error } = await supabase.rpc('admin_delete_user_completely_enhanced', {
      p_user_id: userId,
      p_confirmation_code: confirmationText,
      p_delete_auth_user: deleteAuthUser
    });
    
    if (error) {
      console.error('Erro ao excluir usuário:', error);
      
      // If enhanced function is not found, try the fallback function
      if (error.message?.includes('Could not find the function') && 
          error.message?.includes('admin_delete_user_completely_enhanced')) {
        console.log('Função enhanced não encontrada, tentando função de compatibilidade...');
        
        const { data: fallbackData, error: fallbackError } = await supabase.rpc('admin_delete_user_completely', {
          p_user_id: userId,
          p_confirmation_code: confirmationText,
          p_delete_auth_user: deleteAuthUser
        });
        
        if (fallbackError) {
          console.error('Erro na função de fallback:', fallbackError);
          throw new Error(`Erro ao excluir usuário: ${fallbackError.message}`);
        }
        
        if (!fallbackData?.success) {
          throw new Error(fallbackData?.message || 'Falha ao excluir usuário');
        }
        
        console.log('Usuário excluído com sucesso usando função de compatibilidade:', fallbackData);
        return fallbackData;
      }
      
      throw new Error(`Erro ao excluir usuário: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.message || 'Falha ao excluir usuário');
    }

    console.log('Usuário excluído com sucesso:', data);
    return data;
  } catch (err) {
    console.error('Erro inesperado na exclusão do usuário:', err);
    throw err;
  }
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserCompletely,
    onSuccess: (data, variables) => {
      console.log('Exclusão bem-sucedida, atualizando cache...', data);
      
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ 
        queryKey: ['super-admin', 'users'] 
      });
      
      // Invalidate super-admin-users queries (new pattern)
      queryClient.invalidateQueries({ 
        queryKey: ['super-admin-users'] 
      });
      
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ 
        queryKey: ['super-admin', 'dashboard-stats'] 
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['admin-dashboard-stats'] 
      });

      // Remove the specific user from cache
      queryClient.removeQueries({ 
        queryKey: ['super-admin', 'user', variables.userId] 
      });

      // Invalidate any user-specific service orders
      queryClient.invalidateQueries({ 
        queryKey: ['user-service-orders', variables.userId] 
      });

      console.log('Usuário excluído completamente:', {
        userId: variables.userId,
        email: data.deleted_data.user_email,
        name: data.deleted_data.user_name,
        tablesAffected: data.deleted_data.total_tables_affected,
        authUserDeleted: data.deleted_data.auth_user_deleted
      });
    },
    onError: (error, variables) => {
      console.error('Erro na exclusão do usuário:', {
        error: error.message,
        userId: variables.userId,
        confirmationText: variables.confirmationText
      });
    },
  });
};