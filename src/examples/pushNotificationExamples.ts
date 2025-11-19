/**
 * EXEMPLOS DE USO DO SISTEMA DE NOTIFICAÇÕES PUSH
 * 
 * Este arquivo contém exemplos práticos de como usar o sistema de notificações
 * push em diferentes situações da sua aplicação.
 */

import { 
  sendPushToUser, 
  sendPushToAll, 
  sendPushToRole,
  notifyNewMessage,
  notifyBudgetUpdate,
  notifyAdminsAlert,
  notifyNewServiceOrder
} from '@/lib/pushNotifications';

// ============================================
// EXEMPLO 1: Nova Mensagem no Chat
// ============================================
export async function onNewChatMessage(messageData: {
  recipientId: string;
  senderName: string;
  messageText: string;
}) {
  await notifyNewMessage(
    messageData.recipientId,
    messageData.senderName,
    messageData.messageText.substring(0, 100) // Preview limitado
  );
}

// ============================================
// EXEMPLO 2: Atualização de Orçamento
// ============================================
export async function onBudgetStatusChange(budgetData: {
  userId: string;
  budgetId: string;
  newStatus: string;
}) {
  await notifyBudgetUpdate(
    budgetData.userId,
    budgetData.budgetId,
    budgetData.newStatus
  );
}

// ============================================
// EXEMPLO 3: Lembrete de Pagamento
// ============================================
export async function sendPaymentReminder(userId: string, amountDue: number) {
  await sendPushToUser(userId, {
    title: '💰 Lembrete de Pagamento',
    body: `Você tem um pagamento pendente de R$ ${amountDue.toFixed(2)}`,
    icon: '/icons/icon-192x192.png',
    url: '/payments',
    data: {
      type: 'payment_reminder',
      amount: amountDue
    }
  });
}

// ============================================
// EXEMPLO 4: Promoção para Todos
// ============================================
export async function sendPromotionToAll(promotionTitle: string, promotionDetails: string) {
  const result = await sendPushToAll({
    title: `🎉 ${promotionTitle}`,
    body: promotionDetails,
    icon: '/icons/icon-192x192.png',
    url: '/promotions',
    data: {
      type: 'promotion',
      timestamp: new Date().toISOString()
    }
  });
  
  console.log(`Promoção enviada para ${result.sent_count || 0} usuários`);
}

// ============================================
// EXEMPLO 5: Alerta para Admins
// ============================================
export async function alertAdminsSystemIssue(issueDescription: string) {
  await notifyAdminsAlert(
    '⚠️ Alerta do Sistema',
    issueDescription,
    '/supadmin/logs'
  );
}

// ============================================
// EXEMPLO 6: Confirma ção de Entrega
// ============================================
export async function notifyDeliveryConfirmation(userId: string, orderId: string) {
  await sendPushToUser(userId, {
    title: '✅ Entrega Confirmada',
    body: 'Seu pedido foi entregue com sucesso!',
    icon: '/icons/icon-192x192.png',
    url: `/orders/${orderId}`,
    data: {
      type: 'delivery_confirmation',
      order_id: orderId
    }
  });
}

// ============================================
// EXEMPLO 7: Notificação Silenciosa (Background Sync)
// ============================================
export async function sendSilentDataUpdate(userId: string, dataType: string) {
  await sendPushToUser(userId, {
    title: 'Atualização de Dados',
    body: 'Seus dados foram sincronizados',
    silent: true, // Não mostra notificação visual
    data: {
      type: 'background_sync',
      data_type: dataType,
      timestamp: new Date().toISOString()
    }
  });
}

// ============================================
// EXEMPLO 8: Integração com Realtime Database
// ============================================
import { supabase } from '@/integrations/supabase/client';

export function setupRealtimeNotifications() {
  // Escutar novos orçamentos em tempo real
  const budgetsChannel = supabase
    .channel('budgets-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'budgets'
      },
      async (payload) => {
        const newBudget = payload.new;
        
        // Notificar o proprietário do orçamento
        if (newBudget.owner_id) {
          await notifyNewServiceOrder(
            newBudget.owner_id,
            newBudget.id,
            newBudget.device_type
          );
        }
        
        // Notificar admins
        await notifyAdminsAlert(
          'Novo Orçamento',
          `Novo orçamento criado para ${newBudget.device_type}`,
          `/budgets/${newBudget.id}`
        );
      }
    )
    .subscribe();

  // Retornar função de cleanup
  return () => {
    supabase.removeChannel(budgetsChannel);
  };
}

// ============================================
// EXEMPLO 9: Hook React para Notificações
// ============================================
import { useEffect } from 'react';

export function useNotifyOnNewMessage(currentUserId: string) {
  useEffect(() => {
    const messagesChannel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Notificar apenas se a mensagem não foi enviada pelo usuário atual
          if (newMessage.user_id !== currentUserId) {
            await notifyNewMessage(
              currentUserId,
              'Novo Usuário', // Você pode buscar o nome do usuário
              newMessage.content
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [currentUserId]);
}

// ============================================
// EXEMPLO 10: Scheduled Notifications (Cron)
// ============================================
/**
 * Para notificações agendadas, você pode criar uma Edge Function
 * que é chamada pelo pg_cron do Supabase.
 * 
 * Crie uma função em: supabase/functions/scheduled-notifications/index.ts
 * 
 * E agende com SQL:
 * 
 * SELECT cron.schedule(
 *   'daily-reminder',
 *   '0 9 * * *', -- Todos os dias às 9h
 *   $$
 *   SELECT net.http_post(
 *     url:='https://oghjlypdnmqecaavekyr.supabase.co/functions/v1/scheduled-notifications',
 *     headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
 *   ) as request_id;
 *   $$
 * );
 */
