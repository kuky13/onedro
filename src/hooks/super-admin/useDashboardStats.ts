import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  total_users: number;
  active_users_last_30_days: number;
  total_revenue: number;
  users_growth_percentage: number;
  revenue_growth_percentage: number;
  recent_activities: Array<{
    action: string;
    created_at: string;
    admin_name: string;
  }>;
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
    
    if (error) {
      if (error.message.includes('Could not find the function')) {
        console.warn('Função admin_get_dashboard_stats não encontrada, retornando dados padrão');
        return {
          total_users: 0,
          active_users_last_30_days: 0,
          total_revenue: 0,
          users_growth_percentage: 0,
          revenue_growth_percentage: 0,
          recent_activities: []
        };
      }
      throw error;
    }

    return data || {
      total_users: 0,
      active_users_last_30_days: 0,
      total_revenue: 0,
      users_growth_percentage: 0,
      revenue_growth_percentage: 0,
      recent_activities: []
    };
  } catch (error) {
    console.warn('Erro ao buscar estatísticas do dashboard:', error);
    return {
      total_users: 0,
      active_users_last_30_days: 0,
      total_revenue: 0,
      users_growth_percentage: 0,
      revenue_growth_percentage: 0,
      recent_activities: []
    };
  }
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['super-admin', 'dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    retry: false, // Não tentar novamente se a função não existir
  });
};