/**
 * Hook para criar ordem de serviço a partir de orçamento
 * Integra com useSecureServiceOrders e useBudgetServiceOrder
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TablesInsert, Tables } from '@/integrations/supabase/types';

interface BudgetData {
  id: string;
  client_name?: string;
  client_phone?: string;
  device_model?: string;
  device_type?: string;
  total_price?: number;
  cash_price?: number;
  part_quality?: string;
  warranty_months?: number;
  notes?: string;
}

interface CreateServiceOrderFromBudgetData {
  budget: BudgetData;
  customization?: {
    priority?: 'low' | 'medium' | 'high';
    additional_notes?: string;
    photos?: File[];
  };
}

type ServiceOrderRow = Tables<'service_orders'>;

export const useCreateServiceOrderFromBudget = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const createServiceOrderFromBudgetMutation = useMutation<ServiceOrderRow, Error, CreateServiceOrderFromBudgetData>({
    mutationFn: async ({ budget, customization }: CreateServiceOrderFromBudgetData): Promise<ServiceOrderRow> => {
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // 1. Verificar/criar cliente se necessário
      let clientId: string | null = null;
      
      if (budget.client_name && budget.client_phone) {
        // Buscar cliente existente usando user_id
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', userId) // Usar user_id ao invés de owner_id
          .eq('phone', budget.client_phone)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Criar novo cliente usando user_id ao invés de owner_id
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: budget.client_name,
              phone: budget.client_phone,
              user_id: userId // Usar user_id, não owner_id
            })
            .select('id')
            .single();

          if (clientError) {
            console.error('Erro ao criar cliente:', clientError);
            // Continuar sem cliente se falhar
          } else {
            clientId = newClient.id;
          }
        }
      }

      // 2. Mapear dados do orçamento para ordem de serviço (sem budget_source_id)
      const serviceOrderData: TablesInsert<'service_orders'> = {
        owner_id: userId,
        client_id: clientId,
        device_type: budget.device_type || 'Dispositivo',
        device_model: budget.device_model || '',
        reported_issue: budget.part_quality ? `Troca de peça - ${budget.part_quality}` : 'Reparo solicitado',
        // As notas serão atualizadas após a criação para incluir o código formatado da OS
        notes: [
          budget.notes,
          customization?.additional_notes
        ].filter(Boolean).join('\n'),
        status: 'opened',
        priority: customization?.priority || 'medium',
        labor_cost: 0,
        parts_cost: budget.cash_price || budget.total_price || 0,
        total_price: budget.cash_price || budget.total_price || 0,
        warranty_months: budget.warranty_months || 3,
        is_paid: false
        // Removido budget_source_id que não existe na tabela
      };

      // 3. Criar a ordem de serviço diretamente no Supabase
      const { data: createdOrder, error } = await supabase
        .from('service_orders')
        .insert([serviceOrderData])
        .select()
        .single();

      if (error) {
        throw error;
      }
      if (!createdOrder) {
        throw new Error('Falha ao criar ordem de serviço');
      }

      // 3.5. Upload das fotos de entrada (se houver)
      if (customization?.photos && customization.photos.length > 0) {
        try {
          console.log(`[CreateOS] Iniciando upload de ${customization.photos.length} fotos...`);
          
          await Promise.all(customization.photos.map(async (file) => {
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${createdOrder.id}/${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            
            // Upload para o bucket
            const { error: uploadError } = await supabase.storage
              .from('service-order-photos')
              .upload(fileName, file, {
                upsert: false
              });

            if (uploadError) {
              console.error('Erro no upload:', uploadError);
              throw uploadError;
            }

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
              .from('service-order-photos')
              .getPublicUrl(fileName);

            // Inserir registro na tabela
            await (supabase as any).from('service_order_photos').insert({
              service_order_id: createdOrder.id,
              photo_url: publicUrl,
              photo_type: 'other',
              created_by: userId
            });
          }));
          
          console.log('[CreateOS] Fotos enviadas com sucesso');
        } catch (photoError) {
          console.error('Erro ao fazer upload das fotos:', photoError);
          // Não falhar a criação da OS por causa das fotos, mas avisar
          toast.error('OS criada, mas houve erro ao salvar algumas fotos.');
        }
      }

      // 4. Atualizar notas para incluir o código da OS (sequential_number formatado)
      const seq = createdOrder.sequential_number;
      const formattedOsCode = seq != null
        ? `OR: ${String(seq).padStart(4, '0')}`
        : `OR: ${createdOrder.id.slice(-8)}`;

      const updatedNotes = [
        budget.notes,
        customization?.additional_notes,
        `Criado a partir do orçamento: ${formattedOsCode}`
      ].filter(Boolean).join('\n');

      const { data: updatedOrder, error: updateError } = await supabase
        .from('service_orders')
        .update({ notes: updatedNotes })
        .eq('id', createdOrder.id)
        .select()
        .single();

      if (updateError) {
        // Se falhar a atualização, continuar com createdOrder
        console.warn('Falha ao atualizar notas com código da OS:', updateError);
        return createdOrder;
      }

      return updatedOrder as ServiceOrderRow;
    },
    onSuccess: (createdOrder: ServiceOrderRow) => {
      // Invalidar queries relevantes - incluindo budgets com userId específico
      queryClient.invalidateQueries({ queryKey: ['secure-service-orders'] });
      queryClient.invalidateQueries({ queryKey: ['worm-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] }); // Query key específica para useBudgetData
      
      // Forçar atualização imediata dos dados de orçamentos
      queryClient.refetchQueries({ queryKey: ['budgets', userId] });
      
      toast.success('Ordem de serviço criada com sucesso!', {
        description: `OS ${createdOrder.sequential_number != null ? String(createdOrder.sequential_number).padStart(4, '0') : createdOrder.id.slice(-8)} - Agora você pode gerenciar o reparo.`
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error('Erro ao criar ordem de serviço', {
        description: error.message || 'Tente novamente em alguns instantes.'
      });
    }
  });

  return {
    createServiceOrderFromBudget: createServiceOrderFromBudgetMutation.mutate,
    isCreating: createServiceOrderFromBudgetMutation.isPending,
    error: createServiceOrderFromBudgetMutation.error,
    isSuccess: createServiceOrderFromBudgetMutation.isSuccess,
    data: createServiceOrderFromBudgetMutation.data
  };
};