import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BudgetFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export const useWormBudgets = (userId: string | undefined, filters: BudgetFilters = {}) => {
  return useQuery({
    queryKey: ['worm-budgets', userId, filters],
    queryFn: async () => {
      try {
        if (!userId) return [];

        const { data, error } = await supabase
          .rpc('get_optimized_budgets', {
            p_user_id: userId,
            p_search_term: filters.search || null,
            p_status_filter: filters.status || null,
            p_limit: filters.limit || 50,
            p_offset: filters.offset || 0,
          });

        if (!error && data) {
          return data;
        }

        const numericSearch = (filters.search || '').trim();
        const searchNum = numericSearch && /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null;

        let query = supabase
          .from('budgets')
          .select('*')
          .eq('owner_id', userId)
          .neq('workflow_status', 'template')
          .neq('client_name', 'TEMPLATE')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (filters.search) {
          const baseOr = `client_name.ilike.%${filters.search}%,device_model.ilike.%${filters.search}%,device_type.ilike.%${filters.search}%`;
          query = searchNum != null
            ? query.or(`${baseOr},sequential_number.eq.${searchNum}`)
            : query.or(baseOr);
        }

        if (filters.status) {
          query = query.eq('workflow_status', filters.status);
        }

        if (typeof filters.offset === 'number') {
          const limit = typeof filters.limit === 'number' ? filters.limit : 50;
          query = query.range(filters.offset, filters.offset + limit - 1);
        } else if (typeof filters.limit === 'number') {
          query = query.limit(filters.limit);
        }

        const { data: fallbackData, error: fallbackError } = await query;
        if (fallbackError) {
          return [];
        }
        return fallbackData || [];
      } catch {
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};