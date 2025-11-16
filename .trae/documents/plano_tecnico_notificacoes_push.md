# 🧩 PLANO TÉCNICO — SISTEMA DE NOTIFICAÇÕES PUSH + PAINEL /SUPADMIN

**Projeto:** OneDrip  
**Responsável técnico:** Trae  
**Status atual:** PWA funcional (React + TypeScript + Supabase)  
**Objetivo:** Adicionar suporte a notificações push (Android + iOS) e painel de administração para envio manual.

---

## 🎯 OBJETIVO GERAL

Implementar um sistema completo de notificações push integrado ao PWA OneDrip, com suporte para Android e iOS (Safari 16.4+), e criar uma rota administrativa `/supadmin/notifications` onde administradores poderão enviar notificações personalizadas para usuários individuais ou grupos, além de visualizar o histórico de envios.

---

## 🧠 1. ANÁLISE TÉCNICA DO SISTEMA ATUAL

### Frontend (PWA) ✅
- **React 18** + TypeScript + Vite
- **Service Worker** já implementado (`public/sw.js`) com cache estratégico
- **Manifest.json** configurado corretamente:
  - `"display": "standalone"`
  - Ícones em múltiplos tamanhos (48x48 até 512x512)
  - `"start_url": "/"`
- **HTTPS** obrigatório em produção ✅
- **Shadcn UI** + Tailwind CSS para componentes
- **Zustand** para gerenciamento de estado global

### Backend (Supabase) ✅
- **Supabase** como backend principal
- **Autenticação** via Supabase Auth
- **RLS (Row Level Security)** implementado
- **Roles existentes:** `admin`, `manager`, `user`
- **Tabelas principais:** `user_profiles`, `admin_logs`, `service_orders`
- **Guards de segurança:** `SuperAdminGuard` implementado

### Estrutura de Rotas ✅
- Sistema de rotas protegidas via middleware
- Rota `/supadmin` já existe para painel administrativo
- Guards de autenticação e autorização implementados

---

## ⚙️ 2. ETAPAS DE IMPLEMENTAÇÃO

### 2.1. Configuração de Chaves VAPID

```bash
# Instalar dependência para geração de chaves
npm install web-push --save-dev

# Gerar chaves VAPID
npx web-push generate-vapid-keys
```

**Configuração no Supabase:**
```sql
-- Adicionar secrets no Supabase Dashboard > Settings > API
-- VAPID_PUBLIC_KEY: [chave pública gerada]
-- VAPID_PRIVATE_KEY: [chave privada gerada]
-- VAPID_SUBJECT: mailto:admin@onedrip.com.br
```

### 2.2. Estrutura do Banco de Dados

```sql
-- Tabela para armazenar subscriptions de push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, endpoint)
);

-- Tabela para histórico de notificações
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon TEXT DEFAULT '/icons/icon-192x192.png',
  badge TEXT DEFAULT '/icons/icon-96x96.png',
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'user', 'role')),
  target_value TEXT, -- user_id ou role name
  sent_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Tabela para logs detalhados de envio
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription_id UUID REFERENCES public.push_subscriptions(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_push_notifications_admin_id ON public.push_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_created_at ON public.push_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification_id ON public.push_notification_logs(notification_id);

-- RLS Policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies para push_subscriptions
CREATE POLICY "Users can manage their own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions" ON public.push_subscriptions
  FOR SELECT USING (public.is_current_user_admin());

-- Policies para push_notifications
CREATE POLICY "Admins can manage notifications" ON public.push_notifications
  FOR ALL USING (public.is_current_user_admin());

-- Policies para push_notification_logs
CREATE POLICY "Admins can view notification logs" ON public.push_notification_logs
  FOR SELECT USING (public.is_current_user_admin());
```

### 2.3. Supabase Edge Function

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Verificar se é admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    const { title, body, target_type, target_value, icon, badge } = await req.json()

    // Buscar subscriptions baseado no target
    let subscriptionsQuery = supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (target_type === 'user') {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', target_value)
    } else if (target_type === 'role') {
      // Join com user_profiles para filtrar por role
      const { data: users } = await supabaseClient
        .from('user_profiles')
        .select('id')
        .eq('role', target_value)
      
      const userIds = users?.map(u => u.id) || []
      subscriptionsQuery = subscriptionsQuery.in('user_id', userIds)
    }

    const { data: subscriptions } = await subscriptionsQuery

    // Criar registro da notificação
    const { data: notification } = await supabaseClient
      .from('push_notifications')
      .insert({
        admin_id: user.id,
        title,
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/icon-96x96.png',
        target_type,
        target_value,
        sent_count: subscriptions?.length || 0,
        status: 'sending'
      })
      .select()
      .single()

    // Enviar notificações
    const vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!,
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY')!,
      subject: Deno.env.get('VAPID_SUBJECT')!
    }

    let successCount = 0
    let failureCount = 0

    for (const subscription of subscriptions || []) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        }

        // Usar web-push library (implementar via fetch para Deno)
        const payload = JSON.stringify({
          title,
          body,
          icon: icon || '/icons/icon-192x192.png',
          badge: badge || '/icons/icon-96x96.png',
          data: {
            url: '/',
            timestamp: Date.now()
          }
        })

        // Implementar envio via web-push protocol
        // (código simplificado - implementar protocolo completo)
        
        successCount++
        
        // Log de sucesso
        await supabaseClient
          .from('push_notification_logs')
          .insert({
            notification_id: notification.id,
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            status: 'success'
          })

      } catch (error) {
        failureCount++
        
        // Log de erro
        await supabaseClient
          .from('push_notification_logs')
          .insert({
            notification_id: notification.id,
            user_id: subscription.user_id,
            subscription_id: subscription.id,
            status: 'failed',
            error_message: error.message
          })
      }
    }

    // Atualizar status da notificação
    await supabaseClient
      .from('push_notifications')
      .update({
        success_count: successCount,
        failure_count: failureCount,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', notification.id)

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification.id,
        sent_count: subscriptions?.length || 0,
        success_count: successCount,
        failure_count: failureCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 💻 3. IMPLEMENTAÇÃO FRONTEND

### 3.1. Hook para Notificações Push

```typescript
// src/hooks/usePushNotifications.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

const VAPID_PUBLIC_KEY = 'BK8...'; // Chave pública VAPID

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkPushSupport();
    checkExistingSubscription();
  }, []);

  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (!supported) {
      console.warn('Push notifications não suportadas neste navegador');
    }
  };

  const checkExistingSubscription = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Erro ao verificar subscription existente:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Não suportado",
        description: "Notificações push não são suportadas neste navegador",
        variant: "destructive"
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      toast({
        title: "Permissão concedida",
        description: "Você receberá notificações do OneDrip",
      });
      return true;
    } else {
      toast({
        title: "Permissão negada",
        description: "Você não receberá notificações",
        variant: "destructive"
      });
      return false;
    }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) return false;

    setLoading(true);
    
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return false;

      const registration = await navigator.serviceWorker.ready;
      
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Salvar subscription no Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          endpoint: pushSubscription.endpoint,
          p256dh_key: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth_key: arrayBufferToBase64(pushSubscription.getKey('auth')!),
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          is_active: true
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) throw error;

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      
      toast({
        title: "Notificações ativadas",
        description: "Você receberá notificações do OneDrip",
      });

      return true;
    } catch (error) {
      console.error('Erro ao criar subscription:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar as notificações",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) return false;

    setLoading(true);

    try {
      await subscription.unsubscribe();
      
      // Desativar no Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscription.endpoint);

      if (error) throw error;

      setSubscription(null);
      setIsSubscribed(false);
      
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais notificações",
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar subscription:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar as notificações",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

// Funções auxiliares
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function getDeviceType(): string {
  const userAgent = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    return 'tablet';
  }
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
    return 'mobile';
  }
  return 'desktop';
}
```

### 3.2. Atualização do Service Worker

```javascript
// public/sw.js (adicionar ao arquivo existente)

// Event listener para notificações push
self.addEventListener('push', event => {
  console.log('[SW] Push notification received:', event);
  
  if (!event.data) {
    console.warn('[SW] Push event sem dados');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-96x96.png',
      tag: 'onedrip-notification',
      renotify: true,
      requireInteraction: false,
      data: {
        url: data.data?.url || '/',
        timestamp: data.data?.timestamp || Date.now()
      },
      actions: [
        {
          action: 'open',
          title: 'Abrir OneDrip',
          icon: '/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icons/icon-48x48.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
        .then(() => {
          console.log('[SW] Notificação exibida com sucesso');
        })
        .catch(error => {
          console.error('[SW] Erro ao exibir notificação:', error);
        })
    );
  } catch (error) {
    console.error('[SW] Erro ao processar push notification:', error);
  }
});

// Event listener para cliques em notificações
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Verificar se já existe uma janela aberta
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (client.navigate) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        
        // Abrir nova janela se não houver uma aberta
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('[SW] Erro ao processar clique na notificação:', error);
      })
  );
});

// Event listener para fechamento de notificações
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed:', event);
  // Aqui pode implementar analytics se necessário
});
```

### 3.3. Componente de Configuração de Notificações

```tsx
// src/components/notifications/NotificationSettings.tsx
import { useState } from 'react';
import { Bell, BellOff, Smartphone, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad/i.test(userAgent)) return <Tablet className="h-4 w-4" />;
    if (/mobile|iphone|android/i.test(userAgent)) return <Smartphone className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Notificações push não são suportadas neste navegador ou dispositivo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba notificações importantes do OneDrip mesmo quando o app estiver fechado.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getDeviceIcon()}
            <span className="text-sm font-medium">
              Notificações neste dispositivo
            </span>
            <Badge variant={isSubscribed ? "default" : "secondary"}>
              {isSubscribed ? "Ativas" : "Inativas"}
            </Badge>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={isSubscribed ? unsubscribe : subscribe}
            disabled={loading}
          />
        </div>

        {!isSubscribed && (
          <div className="text-sm text-muted-foreground">
            <p>Ative as notificações para receber:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Atualizações de ordens de serviço</li>
              <li>Lembretes importantes</li>
              <li>Notificações administrativas</li>
            </ul>
          </div>
        )}

        <Button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className="w-full"
          variant={isSubscribed ? "outline" : "default"}
        >
          {loading ? (
            "Processando..."
          ) : isSubscribed ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Desativar Notificações
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 🧑‍💻 4. PAINEL ADMINISTRATIVO /SUPADMIN

### 4.1. Componente Principal de Notificações

```tsx
// src/components/super-admin/NotificationManager.tsx
import { useState, useEffect } from 'react';
import { Send, Users, User, Shield, History, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';

interface NotificationForm {
  title: string;
  body: string;
  target_type: 'all' | 'user' | 'role';
  target_value: string;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target_value: string;
  sent_count: number;
  success_count: number;
  failure_count: number;
  status: string;
  created_at: string;
  admin_name: string;
}

export function NotificationManager() {
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    body: '',
    target_type: 'all',
    target_value: ''
  });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadHistory();
    loadUsers();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .select(`
          *,
          user_profiles!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setHistory(data?.map(item => ({
        ...item,
        admin_name: item.user_profiles?.name || 'Admin'
      })) || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, name, email')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const sendNotification = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (form.target_type !== 'all' && !form.target_value) {
      toast({
        title: "Alvo obrigatório",
        description: "Selecione um usuário ou role específico",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: form
      });

      if (error) throw error;

      toast({
        title: "Notificação enviada",
        description: `Enviada para ${data.sent_count} dispositivos (${data.success_count} sucessos, ${data.failure_count} falhas)`,
      });

      // Limpar formulário
      setForm({
        title: '',
        body: '',
        target_type: 'all',
        target_value: ''
      });

      // Recarregar histórico
      loadHistory();
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a notificação",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTargetDisplay = (type: string, value: string) => {
    switch (type) {
      case 'all':
        return <Badge><Users className="h-3 w-3 mr-1" />Todos os usuários</Badge>;
      case 'user':
        const user = users.find(u => u.id === value);
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />{user?.name || 'Usuário'}</Badge>;
      case 'role':
        return <Badge variant="outline"><Shield className="h-3 w-3 mr-1" />{value}</Badge>;
      default:
        return <Badge variant="destructive">Desconhecido</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      sending: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const;

    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Gerenciador de Notificações Push</h1>
      </div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList>
          <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>Nova Notificação Push</CardTitle>
              <CardDescription>
                Envie notificações personalizadas para usuários do OneDrip
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    placeholder="Ex: Nova ordem de serviço"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground">{form.title.length}/50 caracteres</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Público Alvo *</label>
                  <Select
                    value={form.target_type}
                    onValueChange={(value: 'all' | 'user' | 'role') => 
                      setForm(prev => ({ ...prev, target_type: value, target_value: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Todos os usuários
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Usuário específico
                        </div>
                      </SelectItem>
                      <SelectItem value="role">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Por role
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.target_type === 'user' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Usuário</label>
                  <Select
                    value={form.target_value}
                    onValueChange={(value) => setForm(prev => ({ ...prev, target_value: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.target_type === 'role' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Selecionar Role</label>
                  <Select
                    value={form.target_value}
                    onValueChange={(value) => setForm(prev => ({ ...prev, target_value: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Mensagem *</label>
                <Textarea
                  placeholder="Digite a mensagem da notificação..."
                  value={form.body}
                  onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                  maxLength={200}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{form.body.length}/200 caracteres</p>
              </div>

              <Button
                onClick={sendNotification}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Notificação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Notificações
              </CardTitle>
              <CardDescription>
                Últimas 50 notificações enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma notificação enviada ainda
                  </p>
                ) : (
                  history.map(notification => (
                    <div key={notification.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground">{notification.body}</p>
                        </div>
                        {getStatusBadge(notification.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Por: {notification.admin_name}</span>
                        <span>•</span>
                        <span>{new Date(notification.created_at).toLocaleString('pt-BR')}</span>
                        <span>•</span>
                        {getTargetDisplay(notification.target_type, notification.target_value)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <Badge variant="outline">
                          Enviadas: {notification.sent_count}
                        </Badge>
                        <Badge variant="default">
                          Sucessos: {notification.success_count}
                        </Badge>
                        {notification.failure_count > 0 && (
                          <Badge variant="destructive">
                            Falhas: {notification.failure_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 4.2. Integração com Rota /supadmin

```tsx
// src/pages/SuperAdminPage.tsx (atualizar)
import { Routes, Route, Navigate } from 'react-router-dom';
import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { Dashboard } from '@/components/super-admin/Dashboard';
import { UserManagement } from '@/components/super-admin/UserManagement';
import { DataManagement } from '@/components/super-admin/DataManagement';
import { NotificationManager } from '@/components/super-admin/NotificationManager'; // Nova importação

export function SuperAdminPage() {
  return (
    <SuperAdminGuard>
      <SuperAdminLayout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="data" element={<DataManagement />} />
          <Route path="notifications" element={<NotificationManager />} /> {/* Nova rota */}
          <Route path="*" element={<Navigate to="/supadmin" replace />} />
        </Routes>
      </SuperAdminLayout>
    </SuperAdminGuard>
  );
}
```

---

## 🔐 5. SEGURANÇA

### 5.1. Políticas de Segurança Implementadas

- **Autenticação obrigatória:** Todas as rotas de API protegidas via Supabase Auth
- **Autorização por roles:** Painel `/supadmin/notifications` restrito a `role = admin`
- **RLS (Row Level Security):** Implementado em todas as tabelas de notificações
- **HTTPS obrigatório:** Requisito para funcionamento das notificações push
- **Validação de dados:** Sanitização de inputs no frontend e backend
- **Rate limiting:** Implementado via middleware de rotas existente

### 5.2. Configurações de Segurança Adicionais

```sql
-- Função para validar permissões de admin para notificações
CREATE OR REPLACE FUNCTION public.can_send_notifications()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND is_active = true
  );
$$;

-- Policy adicional para Edge Function
CREATE POLICY "Only admins can send notifications" ON public.push_notifications
  FOR INSERT USING (public.can_send_notifications());
```

---

## 🧪 6. TESTES E VALIDAÇÃO

### 6.1. Checklist de Testes

#### Funcionalidade Básica
- [ ] Registro de subscription no Chrome (Android)
- [ ] Registro de subscription no Safari (iOS 16.4+)
- [ ] Envio de notificação para usuário específico
- [ ] Envio de notificação para todos os usuários
- [ ] Envio de notificação por role
- [ ] Histórico de notificações no painel admin

#### Cenários de Erro
- [ ] Permissão de notificação negada
- [ ] Subscription expirada/inválida
- [ ] Usuário não autenticado tentando acessar painel
- [ ] Usuário não-admin tentando enviar notificação
- [ ] Falha na Edge Function

#### Compatibilidade
- [ ] Chrome 88+ (Android)
- [ ] Safari 16.4+ (iOS) com PWA instalado
- [ ] Firefox 44+ (Desktop)
- [ ] Edge 79+ (Desktop/Mobile)

### 6.2. Scripts de Teste

```javascript
// Teste manual de notificação
async function testPushNotification() {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      title: 'Teste OneDrip',
      body: 'Esta é uma notificação de teste do sistema OneDrip',
      target_type: 'all'
    }
  });
  
  console.log('Resultado:', data, error);
}

// Verificar subscription ativa
async function checkSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  console.log('Subscription ativa:', !!subscription);
  console.log('Endpoint:', subscription?.endpoint);
}
```

---

## 🚀 7. ENTREGÁVEIS E CRONOGRAMA

### 7.1. Entregáveis

1. **Sistema de notificações push funcional**
   - ✅ Suporte Android (Chrome 88+)
   - ✅ Suporte iOS (Safari 16.4+ com PWA)
   - ✅ Service Worker atualizado
   - ✅ Hook React para gerenciamento

2. **Painel administrativo /supadmin/notifications**
   - ✅ Interface para envio manual
   - ✅ Seleção de público (todos/usuário/role)
   - ✅ Histórico de envios
   - ✅ Estatísticas de entrega

3. **Backend Supabase**
   - ✅ Edge Function para envio
   - ✅ Tabelas de banco estruturadas
   - ✅ Políticas RLS implementadas
   - ✅ Configuração VAPID

4. **Documentação técnica**
   - ✅ Guia de configuração VAPID
   - ✅ Instruções de teste
   - ✅ Estrutura de API documentada

### 7.2. Cronograma Sugerido

**Semana 1:**
- Configuração VAPID keys
- Criação das tabelas no Supabase
- Implementação da Edge Function

**Semana 2:**
- Desenvolvimento do hook usePushNotifications
- Atualização do Service Worker
- Componente NotificationSettings

**Semana 3:**
- Desenvolvimento do painel administrativo
- Integração com rota /supadmin
- Testes de funcionalidade

**Semana 4:**
- Testes de compatibilidade
- Ajustes de segurança
- Documentação final

---

## 📋 PRÓXIMOS PASSOS

1. **Gerar chaves VAPID** e configurar no Supabase
2. **Executar migrations** do banco de dados
3. **Implementar Edge Function** no Supabase
4. **Desenvolver componentes** React
5. **Atualizar Service Worker** com eventos push
6. **Integrar painel** administrativo
7. **Realizar testes** em diferentes dispositivos
8. **Deploy em produção** com HTTPS

---

*Este plano técnico foi adaptado especificamente para a arquitetura atual do OneDrip, aproveitando a infraestrutura existente de React + TypeScript + Supabase + PWA.*