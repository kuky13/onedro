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
          const term = filters.search.replace(/,/g, ' ');
          const baseOr = `client_name.ilike.%${term}%,device_model.ilike.%${term}%,device_type.ilike.%${term}%`;
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

        const { data, error } = await query;
        if (error) return [];
        return data || [];
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