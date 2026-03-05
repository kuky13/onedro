import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { validateInput, logSecurityEvent } from '@/utils/security/inputValidation';
import { toast } from 'sonner';

export type WarrantyStatus = 'in_progress' | 'completed' | 'delivered';

export type Warranty = {
  id: string;
  owner_id: string;
  service_order_id: string | null;
  repair_service_id: string | null;
  reason: string;
  status: WarrantyStatus;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  device_name: string | null;
  service_description: string | null;
  imei_serial: string | null;
  client_name: string | null;
  client_phone: string | null;
  technician_name: string | null;
  charged_amount: number | null;
  cost_amount: number | null;
  reopen_count: number;
  device_checklist: any | null;
  service_order: {
    sequential_number: number | null;
  } | null;
};

interface WarrantyFilters {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const useWarranties = (userId: string | undefined, filters: WarrantyFilters = {}) => {
  const queryClient = useQueryClient();

  const warrantiesQuery = useQuery({
    queryKey: ['warranties', userId, filters],
    queryFn: async (): Promise<Warranty[]> => {
      if (!userId || !isValidUUID(userId)) return [];

      let query = supabase
        .from('warranties')
        .select(`
          *,
          service_order:service_orders (
            sequential_number
          )
        `)
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        const v = validateInput(filters.search, 'search');
        if (!v.isValid) {
          logSecurityEvent('INVALID_SEARCH_INPUT_WARRANTIES', { threats: v.threats });
        } else {
          query = query.or(`reason.ilike.%${v.sanitized}%`);
        }
      }
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      } else {
        query = query.limit(filters.limit || 50);
      }

      const { data, error } = await query;
      if (error) {
        // Log error but don't crash if table missing (just return empty to avoid UI break)
        console.error('Error fetching warranties:', error);
        return [];
      }
      return (data as unknown as Warranty[]) || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const createWarrantyMutation = useMutation({
    mutationFn: async (params: { 
      service_order_id?: string; 
      repair_service_id?: string;
      reason: string;
      device_name?: string;
      service_description?: string;
      imei_serial?: string;
      client_name?: string;
      client_phone?: string;
      technician_name?: string;
      charged_amount?: number;
      cost_amount?: number;
    }) => {
      if (!userId || !isValidUUID(userId)) throw new Error('ID do usuário inválido');
      if (!params.service_order_id && !params.repair_service_id) throw new Error('Vincule a uma OS ou reparo');
      if (params.service_order_id && !isValidUUID(params.service_order_id)) throw new Error('OS inválida');
      if (params.repair_service_id && !isValidUUID(params.repair_service_id)) throw new Error('Reparo inválido');
      const v = validateInput(params.reason, 'form');
      if (!v.isValid) throw new Error('Motivo inválido');

      const { data, error } = await supabase
        .from('warranties')
        .insert([{ 
          owner_id: userId, 
          service_order_id: params.service_order_id || null,
          repair_service_id: params.repair_service_id || null,
          reason: v.sanitized, 
          status: 'in_progress' as const,
          device_name: params.device_name || null,
          service_description: params.service_description || null,
          imei_serial: params.imei_serial || null,
          client_name: params.client_name || null,
          client_phone: params.client_phone || null,
          technician_name: params.technician_name || null,
          charged_amount: params.charged_amount ?? null,
          cost_amount: params.cost_amount ?? null,
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating warranty:', error);
        throw error;
      }
      return data as unknown as Warranty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast.success('Garantia criada com sucesso');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar garantia')
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WarrantyStatus }) => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('warranties')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Warranty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast.success('Status atualizado');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar status')
  });

  const reopenWarrantyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      // Get current reopen_count
      const { data: current, error: fetchError } = await supabase
        .from('warranties')
        .select('reopen_count')
        .eq('id', id)
        .eq('owner_id', userId)
        .single();
      
      if (fetchError) throw fetchError;

      const newCount = ((current as any)?.reopen_count || 0) + 1;

      const { data, error } = await supabase
        .from('warranties')
        .update({ 
          status: 'in_progress', 
          reopen_count: newCount,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .eq('owner_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Warranty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast.success('Garantia reaberta com sucesso');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao reabrir garantia')
  });

  const deleteWarrantyMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('warranties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
      toast.success('Garantia removida com sucesso');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover garantia')
  });

  return {
    warranties: warrantiesQuery.data || [],
    isLoading: warrantiesQuery.isLoading,
    error: warrantiesQuery.error as any,
    refetch: warrantiesQuery.refetch,
    createWarranty: createWarrantyMutation.mutate,
    isCreating: createWarrantyMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
    reopenWarranty: reopenWarrantyMutation.mutate,
    isReopening: reopenWarrantyMutation.isPending,
    deleteWarranty: deleteWarrantyMutation.mutate,
    isDeleting: deleteWarrantyMutation.isPending
  };
};
