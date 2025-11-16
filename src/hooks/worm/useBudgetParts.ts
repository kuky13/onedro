import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetPart {
  id?: string;
  budget_id?: string;
  name: string;
  part_type?: string;
  brand_id?: string;
  quantity: number;
  price: number;
  cash_price?: number;
  installment_price?: number;
  installment_count?: number;
  warranty_months?: number;
}

export const useBudgetParts = (budgetId: string | undefined) => {
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
    mutationFn: async (part: BudgetPart) => {
      const { data, error } = await supabase
        .from('budget_parts')
        .insert({
          budget_id: part.budget_id,
          name: part.name,
          part_type: part.part_type,
          brand_id: part.brand_id,
          quantity: part.quantity,
          price: Math.round(part.price * 100),
          cash_price: part.cash_price ? Math.round(part.cash_price * 100) : null,
          installment_price: part.installment_price ? Math.round(part.installment_price * 100) : null,
          // ensure integer NOT NULL column gets a value
          installment_count: part.installment_count ?? 0,
          warranty_months: part.warranty_months || 3,
        })
        .select()
        .single();

      if (error) throw error;
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
    mutationFn: async (part: BudgetPart) => {
      if (!part.id) throw new Error('ID da peça é obrigatório');

      const { data, error } = await supabase
        .from('budget_parts')
        .update({
          name: part.name,
          part_type: part.part_type,
          brand_id: part.brand_id,
          quantity: part.quantity,
          price: Math.round(part.price * 100),
          cash_price: part.cash_price ? Math.round(part.cash_price * 100) : null,
          installment_price: part.installment_price ? Math.round(part.installment_price * 100) : null,
          // ensure integer NOT NULL column gets a value
          installment_count: part.installment_count ?? 0,
          warranty_months: part.warranty_months || 3,
        })
        .eq('id', part.id)
        .select()
        .single();

      if (error) throw error;
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
    mutationFn: async ({ id, budgetId }: { id: string; budgetId: string }) => {
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
