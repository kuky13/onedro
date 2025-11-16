import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  license_status: string;
  license_expires_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  budgets_count: number;
  service_orders_count: number;
  // Real license fields from licenses table
  license_id: string | null;
  license_code: string | null;
  license_user_id: string | null;
  license_is_active: boolean | null;
  license_created_at: string | null;
  license_activated_at: string | null;
  license_last_validation: string | null;
  license_notes: string | null;
  // Calculated fields for compatibility
  license_type?: string;
  days_remaining?: number | null;
}

interface UseSuperAdminUsersParams {
  search?: string;
  role?: string;
  status?: string;
  sortBy?: 'created_at' | 'name' | 'email' | 'last_login';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

const fetchSuperAdminUsers = async (params: UseSuperAdminUsersParams = {}): Promise<SuperAdminUser[]> => {
  try {
    const { data, error } = await supabase.rpc('admin_get_all_users_detailed', {
      p_search: params.search || null,
      p_role_filter: params.role || null,
      p_status_filter: params.status || null,
      p_limit: params.limit || 50,
      p_offset: params.offset || 0
    });
    
    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.warn('Função admin_get_all_users_detailed não encontrada, retornando lista vazia');
        return [];
      }
      throw error;
    }

    // Add calculated fields for compatibility
    const processedData = (data || []).map((user: any) => {
      let days_remaining = null;
      if (user.license_expires_at && user.license_status === 'active') {
        const expirationDate = new Date(user.license_expires_at);
        const today = new Date();
        const diffTime = expirationDate.getTime() - today.getTime();
        days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...user,
        license_type: 'Standard', // Default license type
        days_remaining
      };
    });

    return processedData;
  } catch (error) {
    console.warn('Erro ao buscar usuários:', error);
    return [];
  }
};

export const useSuperAdminUsers = (params: UseSuperAdminUsersParams = {}) => {
  return useQuery({
    queryKey: ['super-admin', 'users', params],
    queryFn: () => fetchSuperAdminUsers(params),
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Não tentar novamente se a função não existir
  });
};

// Hook for getting a single user
export const useSuperAdminUser = (userId: string) => {
  return useQuery({
    queryKey: ['super-admin', 'user', userId],
    queryFn: async () => {
      const users = await fetchSuperAdminUsers();
      return users.find(user => user.id === userId) || null;
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    retry: false, // Não tentar novamente se a função não existir
  });
};