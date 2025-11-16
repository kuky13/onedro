import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  service_orders_count: number;
  budgets_count: number;
  // Real license fields from licenses table
  license_id: string | null;
  license_code: string | null;
  license_user_id: string | null;
  license_is_active: boolean | null;
  license_created_at: string | null;
  license_activated_at: string | null;
  license_last_validation: string | null;
  license_notes: string | null;
}

export interface UsersFilters {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useSuperAdminUsers(filters: UsersFilters = {}) {
  const {
    search = '',
    role = '',
    status = '',
    limit = 50,
    offset = 0
  } = filters;

  return useQuery({
    queryKey: ['super-admin-users', { search, role, status, limit, offset }],
    queryFn: async (): Promise<SuperAdminUser[]> => {
      const { data, error } = await supabase.rpc('admin_get_all_users_detailed', {
        p_limit: limit,
        p_offset: offset,
        p_search: search || null,
        p_role_filter: (role && role !== 'all') ? role : null,
        p_status_filter: (status && status !== 'all') ? status : null
      });

      if (error) {
        throw new Error(`Erro ao carregar usuários: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 30000, // 30 segundos
  });
}



export function useUserServiceOrders(userId: string, filters: {
  includeDeleted?: boolean;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const {
    includeDeleted = false,
    status = '',
    dateFrom = '',
    dateTo = '',
    limit = 50,
    offset = 0
  } = filters;

  return useQuery({
    queryKey: ['user-service-orders', userId, { includeDeleted, status, dateFrom, dateTo, limit, offset }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_user_service_orders', {
        p_user_id: userId,
        p_include_deleted: includeDeleted,
        p_status_filter: status || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_limit: limit,
        p_offset: offset
      });

      if (error) {
        throw new Error(`Erro ao carregar ordens de serviço: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}