import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';

export interface PushNotificationPayload {
  target_type: 'all' | 'role' | 'user';
  target_user_id?: string;
  target_role?: 'admin' | 'manager' | 'user';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
  silent?: boolean;
}

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  recent_notifications: any[];
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_role?: string;
  target_user_id?: string;
  created_at: string;
  created_by: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
}

export const usePushAdmin = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Verificar se o usuário é admin ou super_admin
  const checkAdminPermission = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('❌ Erro ao verificar permissão de admin:', error);
        throw error;
      }
      
      return data?.role === 'admin' || data?.role === 'super_admin';
    } catch (error) {
      console.error('❌ Erro na verificação de admin:', error);
      return false;
    }
  }, [user?.id]);

  // Buscar estatísticas de notificações
  const {
    data: notificationStats,
    isLoading: isLoadingStats,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['push-notification-stats'],
    queryFn: async (): Promise<NotificationStats> => {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado: apenas administradores podem acessar estas estatísticas');
      }

      const { data, error } = await supabase.rpc('get_push_notification_stats');
      
      if (error) throw error;
      
      return data || {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        delivery_rate: 0,
        recent_notifications: []
      };
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar histórico de notificações
  const {
    data: notificationHistory,
    isLoading: isLoadingHistory,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['push-notification-history'],
    queryFn: async (): Promise<NotificationHistory[]> => {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado: apenas administradores podem acessar o histórico');
      }

      const { data, error } = await supabase
        .from('push_notifications')
        .select(`
          id,
          title,
          body,
          target_type,
          target_role,
          target_user_id,
          created_at,
          created_by,
          total_sent,
          total_delivered,
          total_failed
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Buscar usuários ativos para targeting
  const {
    data: activeUsers,
    isLoading: isLoadingUsers
  } = useQuery({
    queryKey: ['active-users-for-notifications'],
    queryFn: async () => {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mutation para enviar notificação push
  const sendPushNotificationMutation = useMutation({
    mutationFn: async (payload: PushNotificationPayload) => {
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado: apenas administradores podem enviar notificações');
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload
      });
      
      if (error) throw error;
      
      return data;
    },
    onSuccess: (result, variables) => {
      showSuccess({
        title: 'Notificação enviada com sucesso!',
        description: `${result?.sent_count || 0} destinatários alcançados`
      });
      
      // Invalidar queries para atualizar estatísticas
      queryClient.invalidateQueries({ queryKey: ['push-notification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['push-notification-history'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro ao enviar notificação:', error);
      showError({
        title: 'Erro ao enviar notificação',
        description: error.message || 'Erro desconhecido ao enviar notificação'
      });
    },
  });

  // Função para enviar notificação para todos os usuários
  const sendToAllUsers = useCallback(async (notification: Omit<PushNotificationPayload, 'target_type'>) => {
    return sendPushNotificationMutation.mutateAsync({
      ...notification,
      target_type: 'all'
    });
  }, [sendPushNotificationMutation]);

  // Função para enviar notificação por role
  const sendToRole = useCallback(async (
    role: 'admin' | 'manager' | 'user',
    notification: Omit<PushNotificationPayload, 'target_type' | 'target_role'>
  ) => {
    return sendPushNotificationMutation.mutateAsync({
      ...notification,
      target_type: 'role',
      target_role: role
    });
  }, [sendPushNotificationMutation]);

  // Função para enviar notificação para usuário específico
  const sendToUser = useCallback(async (
    userId: string,
    notification: Omit<PushNotificationPayload, 'target_type' | 'target_user_id'>
  ) => {
    return sendPushNotificationMutation.mutateAsync({
      ...notification,
      target_type: 'user',
      target_user_id: userId
    });
  }, [sendPushNotificationMutation]);

  // Função para obter logs detalhados de uma notificação
  const getNotificationLogs = useCallback(async (notificationId: string) => {
    try {
      setIsLoading(true);
      
      const isAdmin = await checkAdminPermission();
      if (!isAdmin) {
        throw new Error('Acesso negado');
      }

      const { data, error } = await supabase
        .from('push_notification_logs')
        .select(`
          id,
          user_id,
          status,
          error_message,
          delivered_at,
          created_at,
          user_profiles!inner(email, role)
        `)
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar logs:', error);
      showError({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível carregar os logs da notificação'
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [checkAdminPermission, showError]);

  // Função para testar notificação (enviar para o próprio admin)
  const sendTestNotification = useCallback(async (notification: Omit<PushNotificationPayload, 'target_type' | 'target_user_id'>) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    return sendToUser(user.id, {
      ...notification,
      title: `[TESTE] ${notification.title}`,
      data: {
        ...notification.data,
        test: true
      }
    });
  }, [user?.id, sendToUser]);

  return {
    // Estados
    isLoading: isLoading || sendPushNotificationMutation.isPending,
    isLoadingStats,
    isLoadingHistory,
    isLoadingUsers,
    
    // Dados
    notificationStats,
    notificationHistory,
    activeUsers,
    
    // Ações
    sendPushNotification: sendPushNotificationMutation.mutate,
    sendToAllUsers,
    sendToRole,
    sendToUser,
    sendTestNotification,
    getNotificationLogs,
    checkAdminPermission,
    
    // Utilitários
    refetchStats,
    refetchHistory,
    
    // Estados de erro
    error: sendPushNotificationMutation.error,
  };
};