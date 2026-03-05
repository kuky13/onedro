import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrashStats {
  totalDeleted: number;
  deletedToday: number;
  deletedThisWeek: number;
  deletedThisMonth: number;
  expiringIn3Days: number;
  expiringIn7Days: number;
  totalValue: number;
  lastCleanupDate: string | null;
  lastCleanupCount: number;
}

interface DeletedServiceOrder {
  id: string;
  deleted_at: string;
  total_price: number;
}

export const useTrashStats = () => {
  return useQuery({
    queryKey: ['trashStats'],
    queryFn: async (): Promise<TrashStats> => {
      // Buscar ordens excluídas
      const { data: deletedOrders, error: ordersError } = await supabase
        .rpc('get_deleted_service_orders');
      
      if (ordersError) throw ordersError;

      // Buscar logs de limpeza mais recentes
      const { data: cleanupLogs, error: logsError } = await supabase
        .from('cleanup_logs')
        .select('cleanup_date, deleted_count')
        .order('cleanup_date', { ascending: false })
        .limit(1);

      if (logsError) throw logsError;

      const orders = (deletedOrders || []) as DeletedServiceOrder[];
      const now = new Date();
      
      // Calcular estatísticas
      const totalDeleted = orders.length;
      
      // Ordens excluídas hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deletedToday = orders.filter(order => {
        const deletedDate = new Date(order.deleted_at);
        deletedDate.setHours(0, 0, 0, 0);
        return deletedDate.getTime() === today.getTime();
      }).length;

      // Ordens excluídas esta semana
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const deletedThisWeek = orders.filter(order => {
        const deletedDate = new Date(order.deleted_at);
        return deletedDate >= weekStart;
      }).length;

      // Ordens excluídas este mês
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const deletedThisMonth = orders.filter(order => {
        const deletedDate = new Date(order.deleted_at);
        return deletedDate >= monthStart;
      }).length;

      // Função para calcular dias até exclusão automática
      const getDaysUntilAutoDelete = (deletedAt: string): number => {
        const deletedDate = new Date(deletedAt);
        const autoDeleteDate = new Date(deletedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
        const diffTime = autoDeleteDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      };

      // Ordens que expiram em 3 dias
      const expiringIn3Days = orders.filter(order => {
        const daysRemaining = getDaysUntilAutoDelete(order.deleted_at);
        return daysRemaining <= 3 && daysRemaining > 0;
      }).length;

      // Ordens que expiram em 7 dias
      const expiringIn7Days = orders.filter(order => {
        const daysRemaining = getDaysUntilAutoDelete(order.deleted_at);
        return daysRemaining <= 7 && daysRemaining > 0;
      }).length;

      // Valor total das ordens na lixeira
      const totalValue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);

      // Informações da última limpeza
      const lastCleanup = cleanupLogs?.[0];
      const lastCleanupDate = lastCleanup?.cleanup_date || null;
      const lastCleanupCount = lastCleanup?.deleted_count || 0;

      return {
        totalDeleted,
        deletedToday,
        deletedThisWeek,
        deletedThisMonth,
        expiringIn3Days,
        expiringIn7Days,
        totalValue,
        lastCleanupDate,
        lastCleanupCount,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    staleTime: 2 * 60 * 1000, // Considerar dados obsoletos após 2 minutos
  });
};

export type { TrashStats };