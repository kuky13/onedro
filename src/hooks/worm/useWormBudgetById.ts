import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WormBudgetByIdOptions {
  id?: string;
  /**
   * Quando true, não busca o orçamento em si, só verifica se é IA via whatsapp_zapi_logs.
   * Útil quando já temos o orçamento em memória (ex: vindo do /worm).
   */
  skipBudgetFetch?: boolean;
}

export const useWormBudgetById = ({ id, skipBudgetFetch }: WormBudgetByIdOptions) => {
  return useQuery({
    queryKey: ['worm-budget-by-id', id, skipBudgetFetch],
    queryFn: async () => {
      if (!id) return null;

      let budget: any = null;

      if (!skipBudgetFetch) {
        const { data, error } = await supabase
          .from('budgets')
          .select('*, budget_parts(*)')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching budget:', error);
          return null;
        }

        if (!data) {
          console.log('No budget found for id:', id);
          return null;
        }

        budget = data;
      }

      const { data: logs, error: logsError } = await supabase
        .from('whatsapp_zapi_logs')
        .select('id')
        .eq('budget_id', id)
        .limit(1);

      const isAiBudget = !logsError && !!logs && logs.length > 0;

      // Quando só queremos saber se é IA, retornamos apenas o flag
      if (skipBudgetFetch && !budget) {
        return { _isAiBudget: isAiBudget } as any;
      }

      return { ...budget, _isAiBudget: isAiBudget } as any;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
