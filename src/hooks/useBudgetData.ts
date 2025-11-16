import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type Budget = Tables<'budgets'>;

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
    
    const { data, error: fetchError } = await supabase
      .from('budgets')
      .select('*')
      .eq('owner_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    return data || [];
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

  // Função para invalidar e recarregar dados
  const invalidateAndRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
    queryClient.refetchQueries({ queryKey: ['budgets', userId] });
  }, [queryClient, userId]);

  return {
    budgets,
    loading,
    error: error?.message || null,
    refreshing,
    fetchBudgets: refetch,
    handleRefresh,
    invalidateAndRefresh
  };
};