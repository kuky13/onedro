import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { getVapidPublicKey, isVapidConfigured } from '@/lib/vapid-config';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
  isServiceWorkerReady: boolean;
}

interface UserPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    permission: 'default',
    isSupported: false,
    isServiceWorkerReady: false,
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [userSubscriptions, setUserSubscriptions] = useState<UserPushSubscription[]>([]);

  // Verificar suporte e estado inicial
  useEffect(() => {
    checkNotificationSupport();
  }, []);

  // Registrar service worker quando o usuário fizer login
  useEffect(() => {
    if (user && permissionState.isSupported) {
      registerServiceWorker();
      loadUserSubscriptions();
    }
  }, [user, permissionState.isSupported, loadUserSubscriptions]);

  // Carregar subscriptions do usuário
  const loadUserSubscriptions = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      setUserSubscriptions(data || []);
      setIsSubscribed((data || []).length > 0);
    } catch (error) {
      console.error('Erro ao carregar subscriptions:', error);
    }
  }, [user]);

  const checkNotificationSupport = async () => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = Notification.permission;
    
    let serviceWorkerReady = false;
    if (isSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        serviceWorkerReady = !!registration;
        
        // Verificar se já existe uma subscription ativa
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
          setSubscription({
            endpoint: existingSubscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(existingSubscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(existingSubscription.getKey('auth')!),
            },
          });
        }
      } catch (error) {
        console.error('Service Worker não está pronto:', error);
      }
    }
    
    setPermissionState({
      permission,
      isSupported,
      isServiceWorkerReady: serviceWorkerReady,
    });
  };

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      
      // Aguardar o service worker estar pronto
      await navigator.serviceWorker.ready;
      
      // Verificar se já existe uma subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setPermissionState(prev => ({ ...prev, subscription: existingSubscription }));
      }
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  };

  // Salvar subscription no Supabase
  const saveSubscriptionToDatabase = useCallback(async (subscriptionData: PushSubscription) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          user_agent: navigator.userAgent,
          is_active: true,
        }, {
          onConflict: 'user_id,endpoint'
        });
      
      if (error) throw error;
      
      await loadUserSubscriptions();
      return true;
    } catch (error) {
      console.error('Erro ao salvar subscription:', error);
      return false;
    }
  }, [user, loadUserSubscriptions]);
  
  // Remover subscription do Supabase
  const removeSubscriptionFromDatabase = useCallback(async (endpoint: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);
      
      if (error) throw error;
      
      await loadUserSubscriptions();
      return true;
    } catch (error) {
      console.error('Erro ao remover subscription:', error);
      return false;
    }
  }, [user, loadUserSubscriptions]);

  const requestPermission = async (): Promise<boolean> => {
    if (!permissionState.isSupported) {
      showError({ title: 'Notificações push não são suportadas neste navegador' });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        showSuccess({ title: 'Permissão concedida para notificações!' });
        return true;
      } else {
        showError({ title: 'Permissão negada. Você pode alterar isso nas configurações do navegador.' });
        return false;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      showError({ title: 'Erro ao solicitar permissão de notificação' });
      return false;
    }
  };

  const subscribe = useCallback(async () => {
    console.log('🔔 [PushNotifications] Iniciando processo de subscription...');
    
    if (!user) {
      console.error('❌ [PushNotifications] Usuário não logado');
      showError({ title: 'Você precisa estar logado para se inscrever em notificações' });
      return false;
    }
    
    if (!permissionState.isSupported) {
      console.error('❌ [PushNotifications] Push notifications não suportadas');
      showError({ title: 'Notificações push não são suportadas neste navegador' });
      return false;
    }
    
    if (!permissionState.isServiceWorkerReady) {
      console.error('❌ [PushNotifications] Service Worker não está pronto');
      showError({ title: 'Service Worker não está pronto. Tente novamente em alguns segundos.' });
      return false;
    }
    
    if (permissionState.permission !== 'granted') {
      console.log('🔔 [PushNotifications] Solicitando permissão...');
      const granted = await requestPermission();
      if (!granted) return false;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔔 [PushNotifications] Obtendo Service Worker registration...');
      const registration = await navigator.serviceWorker.ready;
      
      const vapidKey = getVapidPublicKey();
      if (!vapidKey || !isVapidConfigured()) {
        console.error('❌ [PushNotifications] Chave VAPID não disponível');
        throw new Error('Chave VAPID não disponível');
      }
      
      console.log('🔔 [PushNotifications] Chave VAPID:', vapidKey.substring(0, 20) + '...');

      console.log('🔔 [PushNotifications] Criando subscription...');
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      
      console.log('✅ [PushNotifications] Subscription criada:', pushSubscription.endpoint);
      
      const subscriptionData = {
        endpoint: pushSubscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(pushSubscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(pushSubscription.getKey('auth')!),
        },
      };
      
      console.log('🔔 [PushNotifications] Salvando subscription no banco de dados...');
      // Salvar no Supabase
      const saved = await saveSubscriptionToDatabase(subscriptionData);
      if (!saved) {
        throw new Error('Falha ao salvar subscription no banco de dados');
      }
      
      console.log('✅ [PushNotifications] Subscription salva com sucesso!');
      setSubscription(subscriptionData);
      setIsSubscribed(true);
      showSuccess({ title: 'Inscrito em notificações push com sucesso!' });
      return true;
    } catch (error) {
      console.error('❌ [PushNotifications] Erro ao se inscrever:', error);
      showError({ 
        title: 'Erro ao se inscrever em notificações push',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, permissionState, requestPermission, saveSubscriptionToDatabase]);

  const unsubscribe = useCallback(async () => {
    if (!subscription || !user) {
      showError({ title: 'Nenhuma inscrição ativa encontrada' });
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();
      
      if (pushSubscription) {
        await pushSubscription.unsubscribe();
      }
      
      // Remover do banco de dados
      const removed = await removeSubscriptionFromDatabase(subscription.endpoint);
      if (!removed) {
        throw new Error('Falha ao remover subscription do banco de dados');
      }
      
      setSubscription(null);
      setIsSubscribed(false);
      showSuccess({ title: 'Notificações push desativadas' });
      return true;
    } catch (error) {
      console.error('Erro ao cancelar subscription:', error);
      showError({ title: 'Erro ao desativar notificações push' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, subscription, removeSubscriptionFromDatabase]);

  // Enviar notificação de teste
  const sendTestNotification = useCallback(async () => {
    if (!user) {
      showError({ title: 'Você precisa estar logado' });
      return false;
    }
    
    if (!isSubscribed) {
      showError({ title: 'Você precisa estar inscrito em notificações push' });
      return false;
    }
    
    try {
      setIsLoading(true);
      
      // Usar a nova Edge Function para enviar notificação
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          target_type: 'user',
          target_user_id: user.id,
          title: 'Notificação de Teste',
          body: 'Esta é uma notificação de teste do OneDrip!',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        }
      });
      
      if (error) throw error;
      
      console.log('Notificação de teste enviada com sucesso:', data);
      showSuccess({ title: 'Notificação de teste enviada!' });
      return true;
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      showError({ title: 'Erro ao enviar notificação de teste' });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSubscribed]);

  // Função para converter VAPID key
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
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
  };

  // Função para converter ArrayBuffer para Base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Obter estatísticas de notificações
  const getNotificationStats = useCallback(async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('push_notification_logs')
        .select('status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        delivered: data?.filter(log => log.status === 'delivered').length || 0,
        failed: data?.filter(log => log.status === 'failed').length || 0,
        recent: data?.slice(0, 10) || []
      };
      
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }, [user]);

  return {
    // Estados
    permissionState,
    isSubscribed,
    isLoading,
    subscription,
    userSubscriptions,
    vapidPublicKey,
    
    // Ações
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    loadUserSubscriptions,
    getNotificationStats,
    
    // Utilitários
    isSupported: permissionState.isSupported,
    hasPermission: permissionState.permission === 'granted',
    isServiceWorkerReady: permissionState.isServiceWorkerReady,
    urlBase64ToUint8Array,
    arrayBufferToBase64,
  };
};

export default usePushNotifications;