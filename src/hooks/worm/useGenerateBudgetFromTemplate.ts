import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GenerateBudgetParams {
  templateIds: string[];
  clientId: string | null;
  clientData: {
    name: string;
    phone?: string;
  };
  notes?: string;
  validUntil?: string;
}

export const useGenerateBudgetFromTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ templateIds, clientId, clientData, notes, validUntil }: GenerateBudgetParams) => {
      // Buscar templates
      const { data: templates, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .in('id', templateIds);
      
      if (fetchError) throw fetchError;
      if (!templates || templates.length === 0) {
        throw new Error('Templates não encontrados');
      }

      // Criar novos orçamentos duplicando templates
      const newBudgets = templates.map(template => {
        const { id, created_at, updated_at, sequential_number, ...rest } = template;
        
        return {
          ...rest,
          client_id: clientId,
          client_name: clientData.name,
          client_phone: clientData.phone || null,
          workflow_status: 'pending',
          notes: notes || rest.notes,
          valid_until: validUntil || rest.valid_until,
        };
      });
      
      const { data, error } = await supabase
        .from('budgets')
        .insert(newBudgets)
        .select();
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['worm-budgets'] });
      toast.success(`${data.length} orçamento(s) gerado(s) com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao gerar orçamento:', error);
      toast.error('Erro ao gerar orçamento do template');
    }
  });
};
