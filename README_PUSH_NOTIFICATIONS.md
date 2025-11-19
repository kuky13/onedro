# 📱 Sistema de Notificações Push - OneDrip

Sistema completo de notificações push PWA com suporte para Android (Chrome) e iOS 16.4+ (Safari).

## 🎯 Funcionalidades

✅ Notificações push no navegador (PWA)  
✅ Suporte Android via Chrome  
✅ Suporte iOS 16.4+ via Safari (PWA instalado)  
✅ Autenticação VAPID  
✅ Armazenamento em Supabase  
✅ Painel admin completo  
✅ Estatísticas e logs  
✅ Envio segmentado (todos/role/usuário)  

## 🏗️ Arquitetura

```
Frontend (React)
  ├── usePushNotifications.ts      # Hook para gerenciar subscriptions
  ├── usePushAdmin.ts              # Hook admin para envio
  └── pushNotifications.ts         # Helpers para acionar notificações

Service Worker (sw.js)
  ├── Registro de subscriptions
  ├── Recepção de push events
  └── Exibição de notificações

Backend (Supabase)
  ├── send-push-notification       # Edge Function para envio
  ├── user_push_subscriptions      # Tabela de inscrições
  ├── push_notifications           # Histórico de notificações
  └── push_notification_logs       # Logs de entrega
```

## 🔧 Configuração

### 1. Chaves VAPID (✅ Já configuradas)

As chaves VAPID já estão configuradas como secrets no Supabase:
- `VITE_VAPID_PUBLIC_KEY` - Chave pública (frontend)
- `VAPID_PRIVATE_KEY` - Chave privada (backend)
- `VAPID_SUBJECT` - Email de contato

Para gerar novas chaves (se necessário):
```bash
npm run generate-vapid
```

### 2. Service Worker (✅ Já implementado)

O Service Worker em `public/sw.js` já está configurado e registrado automaticamente.

### 3. Banco de Dados (✅ Já criado)

Tabelas necessárias já existem:
- `user_push_subscriptions` - Armazena inscrições dos usuários
- `push_notifications` - Histórico de notificações enviadas
- `push_notification_logs` - Logs de entrega por usuário

## 📚 Como Usar

### Inscrever Usuário em Notificações

```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { 
    permissionState, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    requestPermission 
  } = usePushNotifications();

  const handleEnableNotifications = async () => {
    // 1. Solicitar permissão
    const granted = await requestPermission();
    if (!granted) return;

    // 2. Inscrever usuário
    const success = await subscribe();
    if (success) {
      console.log('✅ Inscrito em notificações push!');
    }
  };

  return (
    <button onClick={handleEnableNotifications}>
      {isSubscribed ? 'Notificações Ativas' : 'Ativar Notificações'}
    </button>
  );
}
```

### Enviar Notificação para Usuário Específico

```typescript
import { sendPushToUser } from '@/lib/pushNotifications';

// Exemplo: Nova mensagem
await sendPushToUser(userId, {
  title: 'Nova Mensagem',
  body: 'Você recebeu uma nova mensagem!',
  icon: '/icons/icon-192x192.png',
  url: '/messages',
  data: {
    type: 'new_message',
    timestamp: new Date().toISOString()
  }
});
```

### Enviar Notificação para Todos

```typescript
import { sendPushToAll } from '@/lib/pushNotifications';

// Exemplo: Promoção
const result = await sendPushToAll({
  title: '🎉 Promoção Especial',
  body: '50% de desconto em todos os serviços!',
  url: '/promotions'
});

console.log(`Enviado para ${result.sent_count} usuários`);
```

### Enviar por Role (admin/manager/user)

```typescript
import { sendPushToRole } from '@/lib/pushNotifications';

// Notificar apenas admins
await sendPushToRole('admin', {
  title: '⚠️ Alerta do Sistema',
  body: 'Novo erro detectado no sistema',
  url: '/supadmin/logs'
});
```

## 🎮 Acionar Notificações em Eventos

### Exemplo 1: Nova Mensagem no Chat

```typescript
import { notifyNewMessage } from '@/lib/pushNotifications';

// Quando uma nova mensagem é criada
async function onMessageCreated(message: ChatMessage) {
  await notifyNewMessage(
    message.recipient_id,
    message.sender_name,
    message.content
  );
}
```

### Exemplo 2: Atualização de Orçamento

```typescript
import { notifyBudgetUpdate } from '@/lib/pushNotifications';

// Quando um orçamento muda de status
async function onBudgetStatusChange(budget: Budget) {
  await notifyBudgetUpdate(
    budget.owner_id,
    budget.id,
    budget.status
  );
}
```

### Exemplo 3: Integração com Realtime

```typescript
import { supabase } from '@/integrations/supabase/client';
import { notifyNewServiceOrder } from '@/lib/pushNotifications';

// Escutar novos orçamentos em tempo real
function setupRealtimeNotifications() {
  const channel = supabase
    .channel('budgets-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'budgets' },
      async (payload) => {
        const newBudget = payload.new;
        
        // Notificar o dono do orçamento
        await notifyNewServiceOrder(
          newBudget.owner_id,
          newBudget.id,
          newBudget.device_type
        );
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

## 🎯 Exemplos Práticos

Veja mais exemplos em `src/examples/pushNotificationExamples.ts`:

1. **Nova mensagem no chat**
2. **Atualização de orçamento**
3. **Lembrete de pagamento**
4. **Promoção para todos**
5. **Alerta para admins**
6. **Confirmação de entrega**
7. **Notificação silenciosa**
8. **Integração com Realtime**
9. **Hook React personalizado**
10. **Notificações agendadas (Cron)**

## 🔐 Painel Admin

Acesse `/supadmin/notifications` para:

- ✅ Enviar notificações manualmente
- 📊 Ver estatísticas de envio
- 📜 Histórico completo de notificações
- 🔍 Logs detalhados por notificação
- 👥 Selecionar destinatários (todos/role/usuário)

## 📱 Suporte PWA

### Android (Chrome)
✅ Suporte completo  
✅ Notificações em background  
✅ Ícones e badges personalizados  

### iOS (Safari 16.4+)
✅ Requer instalação na Tela Inicial  
✅ Suporte a partir do iOS 16.4  
✅ Push via Web Push API  

### Desktop
✅ Chrome, Edge, Firefox  
✅ Notificações nativas do SO  

## 🧪 Testando

### 1. Habilitar Notificações

1. Acesse sua aplicação
2. Vá em Configurações → Notificações
3. Clique em "Ativar Notificações"
4. Permita notificações no navegador

### 2. Enviar Teste

**Via UI:**
1. Acesse `/supadmin/notifications`
2. Clique em "Enviar Teste"

**Via Código:**
```typescript
import { sendPushToUser } from '@/lib/pushNotifications';

await sendPushToUser('user-id', {
  title: 'Teste',
  body: 'Esta é uma notificação de teste!'
});
```

## 📊 Monitoramento

### Ver Estatísticas

```typescript
import { usePushAdmin } from '@/hooks/usePushAdmin';

function AdminStats() {
  const { notificationStats } = usePushAdmin();

  return (
    <div>
      <p>Total Enviadas: {notificationStats?.total_sent}</p>
      <p>Entregues: {notificationStats?.total_delivered}</p>
      <p>Falharam: {notificationStats?.total_failed}</p>
      <p>Taxa: {notificationStats?.delivery_rate}%</p>
    </div>
  );
}
```

### Ver Logs

```typescript
const { getNotificationLogs } = usePushAdmin();

const logs = await getNotificationLogs('notification-id');
console.log(logs); // Array de logs por usuário
```

## 🚀 Deploy

As notificações push funcionam automaticamente em produção:

✅ Edge Function deploy automático  
✅ Service Worker cacheado  
✅ VAPID keys seguras em secrets  
✅ Tabelas criadas no Supabase  

## 🛠️ Troubleshooting

### Notificações não chegam

1. **Verificar permissão:**
```typescript
if (Notification.permission !== 'granted') {
  await requestPermission();
}
```

2. **Verificar subscription:**
```typescript
const { isSubscribed } = usePushNotifications();
console.log('Inscrito:', isSubscribed);
```

3. **Ver logs da Edge Function:**
   - Acesse Supabase Dashboard
   - Functions → send-push-notification → Logs

### iOS não funciona

- ✅ Certifique-se de ter iOS 16.4+
- ✅ Instale o app na Tela Inicial (Add to Home Screen)
- ✅ Permita notificações quando solicitado

## 📝 API Reference

### sendPushToUser
```typescript
sendPushToUser(
  userId: string,
  notification: PushNotificationPayload
): Promise<{ success: boolean; error?: string }>
```

### sendPushToAll
```typescript
sendPushToAll(
  notification: PushNotificationPayload
): Promise<{ success: boolean; sent_count?: number }>
```

### sendPushToRole
```typescript
sendPushToRole(
  role: 'admin' | 'manager' | 'user',
  notification: PushNotificationPayload
): Promise<{ success: boolean; sent_count?: number }>
```

### PushNotificationPayload
```typescript
interface PushNotificationPayload {
  title: string;              // Título da notificação
  body: string;               // Mensagem
  icon?: string;              // URL do ícone
  badge?: string;             // URL do badge
  url?: string;               // URL para abrir ao clicar
  data?: Record<string, any>; // Dados customizados
  silent?: boolean;           // Notificação silenciosa
}
```

## 🔗 Links Úteis

- [Painel Admin](/supadmin/notifications)
- [Configurações de Usuário](/settings/notifications)
- [Logs do Supabase](https://supabase.com/dashboard/project/oghjlypdnmqecaavekyr/functions/send-push-notification/logs)
- [Web Push API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

## 💡 Dicas

1. **Performance**: Use notificações silenciosas para atualizações em background
2. **Engagement**: Personalize título e mensagem baseado no contexto
3. **Timing**: Evite enviar muitas notificações seguidas
4. **A/B Testing**: Teste diferentes mensagens e veja as taxas de clique
5. **Unsubscribe**: Sempre permita que usuários desativem notificações facilmente

---

✨ Sistema de notificações push totalmente funcional e pronto para produção!
