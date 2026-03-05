import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface SystemStatus {
  id: string;
  status: 'maintenance' | 'error';
  message: string;
  estimated_resolution: string | null;
  maintenance_mode_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const useMaintenanceMode = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  // Query para buscar o status do sistema
  const { data: systemStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['system-status'],
    queryFn: async (): Promise<SystemStatus | null> => {
      const { data, error } = await supabase
        .from('system_status')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (!error.message?.includes('aborted')) {
          console.error('❌ Erro ao buscar status do sistema:', error);
        }
        throw error;
      }

      return data as SystemStatus;
    },
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60, // Refetch a cada minuto
  });

  // Função para verificar se o modo de manutenção está ativo via RPC
  const checkMaintenanceMode = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_maintenance_mode_active');
      
      if (error) {
        console.error('❌ Erro ao verificar modo de manutenção:', error);
        return false;
      }
      
      return data as boolean;
    } catch (error) {
      console.error('❌ Erro na função checkMaintenanceMode:', error);
      return false;
    }
  };

  // Atualizar estado quando systemStatus mudar
  useEffect(() => {
    if (systemStatus) {
      setIsMaintenanceMode(systemStatus.maintenance_mode_active);
    }
    setLoading(isLoading);
  }, [systemStatus, isLoading]);

  // Subscription para mudanças em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('system_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_status',
        },
        (payload) => {
          console.log('🔄 Status do sistema atualizado:', payload);
          refetch(); // Refetch os dados quando houver mudanças
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return {
    isMaintenanceMode,
    systemStatus,
    loading,
    error,
    checkMaintenanceMode,
    refetch,
  };
};