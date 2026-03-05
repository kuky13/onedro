import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { budgetsApi } from '@/services/api/budgetsApi';

interface BudgetFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const buildFiltersKey = (filters: BudgetFilters) => {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search.trim());
  if (filters.status) params.set('status', filters.status);
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));
  if (typeof filters.offset === 'number') params.set('offset', String(filters.offset));
  const key = params.toString();
  return key.length > 0 ? key : 'all';
};

export const useWormBudgets = (userId: string | undefined, filters: BudgetFilters = {}) => {
  return useQuery({
    queryKey: ['worm-budgets', userId, filters],
    queryFn: async () => {
      try {
        if (!userId) return [];

        const filtersKey = buildFiltersKey(filters);
        // VPS removida: cache agora é somente React Query (staleTime/gcTime)
        void filtersKey; // mantém intenção de key sem depender de cache externo

        const numericSearch = (filters.search || '').trim();
        const searchNum = numericSearch && /^\d+$/.test(numericSearch) ? parseInt(numericSearch, 10) : null;

        // Preferir leitura via API (GET). Se falhar, cai para Supabase.
        try {
          const params: Record<string, string | number> = {};
          if (filters.search) params.search = filters.search;
          if (filters.status) params.status = filters.status;
          if (typeof filters.limit === 'number') params.limit = filters.limit;
          if (typeof filters.offset === 'number') params.offset = filters.offset;

          const apiData = await budgetsApi.list(params as any);

          const scoped = (apiData ?? []).filter((b: any) => {
            if (typeof b?.owner_id !== 'string') return false;
            if (b.owner_id !== userId) return false;
            if (b.deleted_at != null) return false;
            if (b.workflow_status === 'template') return false;
            return true;
          });

          // Se a API retornou dados mas nenhum está no escopo, não exibimos dados globais.
          if ((apiData?.length ?? 0) > 0 && scoped.length === 0) {
            throw new Error('API retornou dados fora do escopo do usuário');
          }

          // Garantir ordenação por created_at desc
          scoped.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          return scoped;
        } catch {
          let query = supabase
            .from('budgets')
            // Evitar select('*') para reduzir payload e acelerar listagem
            .select(
              'id,sequential_number,created_at,owner_id,workflow_status,deleted_at,client_id,client_name,client_phone,device_type,device_model,issue,part_quality,notes,custom_services,total_price,cash_price,installment_price,installments,payment_condition,warranty_months,includes_delivery,includes_screen_protector,valid_until,expires_at,is_paid,is_delivered'
            )
            .eq('owner_id', userId)
            .neq('workflow_status', 'template')
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
        }
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
