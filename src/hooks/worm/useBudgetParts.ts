import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRealtimeQueryInvalidation } from '@/hooks/useSupabaseRealtime';
import { syncPartToStore, unlinkPart, type SyncableBudget } from '@/hooks/useServiceSync';

export interface BudgetPart {
  id?: string;
  budget_id?: string;
  name: string;
  part_type?: string | null;
  brand_id?: string | null;
  quantity: number;
  price: number;
  cash_price?: number | null;
  installment_price?: number | null;
  installment_count?: number;
  warranty_months?: number | null;
}

export const useBudgetParts = (budgetId: string | undefined) => {
  // Realtime com debounce para evitar tempestade de refetch/invalidações
  useRealtimeQueryInvalidation({
    queryKey: ['budget-parts', budgetId],
    channelName: `budget-parts-${budgetId}`,
    table: 'budget_parts',
    event: '*',
    schema: 'public',
    filter: budgetId ? `budget_id=eq.${budgetId}` : undefined,
    enabled: !!budgetId,
    debounceMs: 600,
  });

  return useQuery({
    queryKey: ['budget-parts', budgetId],
    queryFn: async () => {
      if (!budgetId) return [];

      const { data, error } = await supabase
        .from('budget_parts')
        .select('*')
        .eq('budget_id', budgetId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });
};

export const useAddBudgetPart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (part: BudgetPart & { _syncMeta?: { storeId: string; userId: string; budget: SyncableBudget } }) => {
      if (!part.budget_id) throw new Error('ID do orçamento é obrigatório');

      const { data, error } = await supabase
        .from('budget_parts')
        .insert([
          {
            budget_id: part.budget_id,
            name: part.name,
            part_type: part.part_type ?? null,
            brand_id: part.brand_id ?? null,
            quantity: part.quantity,
            price: Math.round(part.price * 100),
            cash_price: part.cash_price ? Math.round(part.cash_price * 100) : null,
            installment_price: part.installment_price ? Math.round(part.installment_price * 100) : null,
            installment_count: part.installment_count ?? 0,
            warranty_months: part.warranty_months || 3,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Auto-sync to store if meta provided
      if (part._syncMeta && data) {
        const { storeId, userId, budget } = part._syncMeta;
        syncPartToStore(storeId, userId, data, budget).catch(console.error);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget-parts', variables.budget_id] });
      toast.success('Serviço/Peça adicionado');
    },
    onError: (error: any) => {
      const msg = error?.message || 'Erro ao adicionar serviço/peça';
      toast.error(msg);
      console.error('Erro ao adicionar serviço/peça:', error);
    },
  });
};

export const useUpdateBudgetPart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (part: BudgetPart & { _syncMeta?: { storeId: string; userId: string; budget: SyncableBudget } }) => {
      if (!part.id) throw new Error('ID da peça é obrigatório');

      const { data, error } = await supabase
        .from('budget_parts')
        .update({
          name: part.name,
          part_type: part.part_type ?? null,
          brand_id: part.brand_id ?? null,
          quantity: part.quantity,
          price: Math.round(part.price * 100),
          cash_price: part.cash_price ? Math.round(part.cash_price * 100) : null,
          installment_price: part.installment_price ? Math.round(part.installment_price * 100) : null,
          installment_count: part.installment_count ?? 0,
          warranty_months: part.warranty_months || 3,
        })
        .eq('id', part.id)
        .select()
        .single();

      if (error) throw error;

      // Auto-sync to store if meta provided
      if (part._syncMeta && data) {
        const { storeId, userId, budget } = part._syncMeta;
        syncPartToStore(storeId, userId, data, budget).catch(console.error);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget-parts', variables.budget_id] });
      toast.success('Serviço/Peça atualizado');
    },
    onError: (error: any) => {
      const msg = error?.message || 'Erro ao atualizar serviço/peça';
      toast.error(msg);
      console.error('Erro ao atualizar serviço/peça:', error);
    },
  });
};

export const useDeleteBudgetPart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; budgetId: string }) => {
      const { id } = variables;

      // Remove sync link first (cascade will also handle this, but be explicit)
      unlinkPart(id).catch(console.error);

      const { error } = await supabase
        .from('budget_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget-parts', variables.budgetId] });
      toast.success('Serviço/Peça removido');
    },
    onError: (error: any) => {
      const msg = error?.message || 'Erro ao remover serviço/peça';
      toast.error(msg);
      console.error('Erro ao remover serviço/peça:', error);
    },
  });
};
