/**
 * Push Notifications Helper
 * Funções utilitárias para acionar notificações push em eventos da aplicação
 */

import { supabase } from '@/integrations/supabase/client';

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, any>;
  silent?: boolean;
}

/**
 * Envia notificação push para um usuário específico
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        target_type: 'user',
        target_user_id: userId,
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        url: notification.url,
        data: notification.data,
        silent: notification.silent || false
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Notificação push enviada com sucesso:', data);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar notificação push:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Envia notificação push para todos os usuários
 */
export async function sendPushToAll(
  notification: PushNotificationPayload
): Promise<{ success: boolean; error?: string; sent_count?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        target_type: 'all',
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        url: notification.url,
        data: notification.data,
        silent: notification.silent || false
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Notificação push enviada para todos:', data);
    return { 
      success: true, 
      sent_count: data?.sent_count || 0 
    };
  } catch (error) {
    console.error('❌ Erro ao enviar notificação push:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Envia notificação push por role (admin, manager, user)
 */
export async function sendPushToRole(
  role: 'admin' | 'manager' | 'user',
  notification: PushNotificationPayload
): Promise<{ success: boolean; error?: string; sent_count?: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        target_type: 'role',
        target_role: role,
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/badge-72x72.png',
        url: notification.url,
        data: notification.data,
        silent: notification.silent || false
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Notificação push enviada para role ${role}:`, data);
    return { 
      success: true, 
      sent_count: data?.sent_count || 0 
    };
  } catch (error) {
    console.error('❌ Erro ao enviar notificação push:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

// ===== EXEMPLOS DE USO EM EVENTOS =====

/**
 * Exemplo: Notificar quando uma nova mensagem é recebida
 */
export async function notifyNewMessage(
  recipientUserId: string,
  senderName: string,
  messagePreview: string
) {
  return sendPushToUser(recipientUserId, {
    title: `Nova mensagem de ${senderName}`,
    body: messagePreview,
    icon: '/icons/icon-192x192.png',
    url: '/messages',
    data: {
      type: 'new_message',
      sender: senderName,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Exemplo: Notificar quando um orçamento é atualizado
 */
export async function notifyBudgetUpdate(
  userId: string,
  budgetId: string,
  status: string
) {
  const statusMessages = {
    approved: 'Seu orçamento foi aprovado!',
    rejected: 'Seu orçamento precisa de ajustes',
    completed: 'Seu orçamento foi concluído'
  };

  return sendPushToUser(userId, {
    title: 'Atualização de Orçamento',
    body: statusMessages[status as keyof typeof statusMessages] || 'Seu orçamento foi atualizado',
    icon: '/icons/icon-192x192.png',
    url: `/budgets/${budgetId}`,
    data: {
      type: 'budget_update',
      budget_id: budgetId,
      status,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Exemplo: Notificar todos os admins sobre um evento importante
 */
export async function notifyAdminsAlert(
  title: string,
  message: string,
  url?: string
) {
  return sendPushToRole('admin', {
    title,
    body: message,
    icon: '/icons/icon-192x192.png',
    url: url || '/supadmin',
    data: {
      type: 'admin_alert',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Exemplo: Notificar sobre uma nova ordem de serviço
 */
export async function notifyNewServiceOrder(
  userId: string,
  orderId: string,
  deviceType: string
) {
  return sendPushToUser(userId, {
    title: 'Nova Ordem de Serviço',
    body: `Ordem criada para ${deviceType}`,
    icon: '/icons/icon-192x192.png',
    url: `/service-orders/${orderId}`,
    data: {
      type: 'new_service_order',
      order_id: orderId,
      device_type: deviceType,
      timestamp: new Date().toISOString()
    }
  });
}
