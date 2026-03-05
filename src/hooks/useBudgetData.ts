import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Budget } from '@/types/budget';
import { useRealtimeQueryInvalidation } from './useSupabaseRealtime';
import { budgetsApi } from '@/services/api/budgetsApi';

export interface BudgetStats {
  totalBudgets: number;
  deletedBudgets: number;
}

export const useBudgetData = (userId: string) => {
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Função para buscar orçamentos
  const fetchBudgets = useCallback(async (): Promise<Budget[]> => {
    if (!userId) return [];

    // Preferir leitura via API (GET). Se falhar (CORS/5xx/etc), cai no Supabase.
    try {
      const apiData = await budgetsApi.list();
      const scoped = (apiData ?? []).filter((b: any) => {
        if (typeof b?.owner_id !== 'string') return false;
        return b.owner_id === userId && b.deleted_at == null;
      });

      // Se a API retornou dados mas nenhum está no escopo, evitamos exibir dados globais.
      if ((apiData?.length ?? 0) > 0 && scoped.length === 0) {
        throw new Error('API retornou dados fora do escopo do usuário');
      }

      return scoped as Budget[];
    } catch {
      const { data, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    }
  }, [userId]);

  // Query usando React Query
  const {
    data: budgets = [],
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['budgets', userId],
    queryFn: fetchBudgets,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refreshing]);

  // Real-time: invalidar budgets quando houver mudanças na tabela
  useRealtimeQueryInvalidation({
    queryKey: ['budgets', userId],
    channelName: `budgets-${userId}`,
    table: 'budgets',
    event: '*',
    schema: 'public',
    filter: `owner_id=eq.${userId}`,
    enabled: !!userId,
    debounceMs: 500,
  });

  // Função para invalidar e recarregar dados
  const invalidateAndRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
    queryClient.refetchQueries({ queryKey: ['budgets', userId] });
  }, [queryClient, userId]);

  // Apenas marcar como desatualizado (evita refetch imediato em cenários como visibilitychange)
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
  }, [queryClient, userId]);

  return {
    budgets,
    loading,
    error: error?.message || null,
    refreshing,
    fetchBudgets: refetch,
    handleRefresh,
    invalidate,
    invalidateAndRefresh
  };
};
