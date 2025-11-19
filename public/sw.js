importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
self.__PWA_INSTALLED__ = false;
const CACHE_NAME = 'one-drip-pwa-v2.9.0';
const STATIC_CACHE_NAME = 'one-drip-static-v2.9.0';
const DYNAMIC_CACHE_NAME = 'one-drip-dynamic-v2.9.0';

// Recursos essenciais para cache - atualizados para Vite
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192.png',
  '/icons/icon-180x180.png',
  '/icons/icon-128x128.png',
  '/icons/icon-96x96.png',
  '/icons/icon-72x72.png',
  '/icons/icon-48x48.png'
];

// Recursos que podem ser armazenados dinamicamente
const CACHE_STRATEGIES = {
  // Cache primeiro para recursos estáticos
  CACHE_FIRST: 'cache-first',
  // Rede primeiro para dados dinâmicos
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate para recursos semi-estáticos
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing One Drip Service Worker v2.9.0...');
  
  event.waitUntil(
    Promise.all([
      // Cache dos recursos estáticos com retry
      cacheStaticAssetsWithRetry(),
      // Forçar ativação imediata
      self.skipWaiting()
    ]).catch(error => {
      console.error('[SW] Erro durante instalação:', error);
      // Não falhar completamente, permitir que o SW seja instalado
      return Promise.resolve();
    })
  );
});

// Função para cache com retry
async function cacheStaticAssetsWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const cache = await caches.open(STATIC_CACHE_NAME);
      console.log(`[SW] Tentativa ${attempt} de cache dos recursos estáticos`);
      
      // Tentar cache individual para identificar problemas específicos
      const results = await Promise.allSettled(
        STATIC_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
            return { asset, success: true };
          } catch (error) {
            console.warn(`[SW] Falha ao cachear ${asset}:`, error.message);
            return { asset, success: false, error };
          }
        })
      );
      
      const failed = results.filter(r => r.value && !r.value.success);
      if (failed.length > 0) {
        console.warn(`[SW] ${failed.length} recursos falharam no cache:`, failed.map(f => f.value.asset));
      }
      
      console.log('[SW] Cache de recursos estáticos concluído');
      return;
      
    } catch (error) {
      console.error(`[SW] Tentativa ${attempt} falhou:`, error);
      
      if (attempt === maxRetries) {
        console.error('[SW] Todas as tentativas de cache falharam');
        throw error;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating One Drip Service Worker v2.8.3...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos com tratamento de erro
      cleanOldCachesOnActivate(),
      // Assumir controle de todas as páginas
      self.clients.claim().catch(error => {
        console.error('[SW] Erro ao assumir controle das páginas:', error);
        return Promise.resolve();
      })
    ]).catch(error => {
      console.error('[SW] Erro durante ativação:', error);
      return Promise.resolve();
    })
  );
});

// Função para limpeza de caches com tratamento de erro
async function cleanOldCachesOnActivate() {
  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(async (cacheName) => {
      if (cacheName !== STATIC_CACHE_NAME && 
          cacheName !== DYNAMIC_CACHE_NAME && 
          cacheName !== CACHE_NAME) {
        try {
          console.log('[SW] Deleting old cache:', cacheName);
          await caches.delete(cacheName);
          return { cacheName, success: true };
        } catch (error) {
          console.error(`[SW] Erro ao deletar cache ${cacheName}:`, error);
          return { cacheName, success: false, error };
        }
      }
      return { cacheName, success: true, skipped: true };
    });
    
    const results = await Promise.allSettled(deletePromises);
    const failed = results.filter(r => r.value && !r.value.success);
    
    if (failed.length > 0) {
      console.warn(`[SW] ${failed.length} caches falharam na limpeza`);
    }
    
    console.log('[SW] Limpeza de caches concluída');
  } catch (error) {
    console.error('[SW] Erro na limpeza de caches:', error);
  }
}

// Interceptação de requisições
self.addEventListener('fetch', event => {
  try {
    const request = event.request;
    
    // Ignorar requisições não-HTTP
    if (!request.url.startsWith('http')) {
      return;
    }
    
    // Ignorar requisições que não são GET para evitar erros de cache
    // POST, PUT, DELETE, PATCH não devem ser interceptados pelo SW
    if (request.method !== 'GET') {
      console.debug(`[SW] Ignorando requisição ${request.method} para ${request.url}`);
      return;
    }
    
    // Ignorar requisições para Supabase e APIs externas
    if (request.url.includes('supabase.co') || 
        request.url.includes('/api/') ||
        request.url.includes('googleapis.com') ||
        request.url.includes('stripe.com')) {
      console.debug(`[SW] Ignorando requisição para API externa: ${request.url}`);
      return;
    }
    
    // Verificar se a URL é válida
    let url;
    try {
      url = new URL(request.url);
    } catch (error) {
      console.warn('[SW] URL inválida:', request.url);
      return;
    }
    
    // Estratégia baseada no tipo de recurso com fallback
    let strategy;
    try {
      if (isStaticAsset(url)) {
        strategy = cacheFirstStrategy(request);
      } else if (isApiRequest(url)) {
        strategy = networkFirstStrategy(request);
      } else if (isNavigationRequest(request)) {
        strategy = staleWhileRevalidateStrategy(request);
      } else {
        strategy = networkFirstStrategy(request);
      }
      
      // Adicionar fallback global para erros não tratados
      event.respondWith(
        strategy.catch(error => {
          console.error('[SW] Erro na estratégia de fetch:', error);
          return handleFetchError(request, error);
        })
      );
    } catch (error) {
      console.error('[SW] Erro ao determinar estratégia:', error);
      event.respondWith(handleFetchError(request, error));
    }
  } catch (error) {
    console.error('[SW] Erro crítico no listener de fetch:', error);
  }
});

// Função para tratar erros de fetch
async function handleFetchError(request, error) {
  console.error('[SW] Tratando erro de fetch para:', request.url);
  
  try {
    // Tentar buscar no cache como último recurso
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Retornando resposta do cache como fallback');
      return cachedResponse;
    }
    
    // Para navegação, retornar página offline
    if (request.destination === 'document' || request.mode === 'navigate') {
      const offlineResponse = await caches.match('/index.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Resposta de erro genérica
    return new Response('Serviço temporariamente indisponível', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (fallbackError) {
    console.error('[SW] Erro no fallback:', fallbackError);
    return new Response('Erro interno', {
      status: 500,
      statusText: 'Internal Error'
    });
  }
}

// Estratégia: Cache First (para recursos estáticos)
async function cacheFirstStrategy(request) {
  try {
    // Apenas buscar no cache para requisições GET
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    const networkResponse = await fetch(request);
    // Apenas cachear requisições GET que foram bem-sucedidas
    if (networkResponse.ok && request.method === 'GET') {
      try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Falha silenciosa no cache - não impede o retorno da resposta
        console.log('[SW] Cache put failed:', cacheError);
      }
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed:', error);
    return await caches.match('/index.html') || new Response('Offline');
  }
}

// Estratégia: Network First (para dados dinâmicos)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Apenas cachear requisições GET que foram bem-sucedidas
    if (networkResponse.ok && request.method === 'GET') {
      try {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        // Falha silenciosa no cache - não impede o retorno da resposta
        console.log('[SW] Cache put failed:', cacheError);
      }
    }
    return networkResponse;
  } catch (error) {
    // Apenas tentar buscar no cache para requisições GET
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // Fallback para navegação
    if (request.destination === 'document') {
      return await caches.match('/index.html') || new Response('Offline');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Estratégia: Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  // Apenas aplicar cache para requisições GET
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || await fetchPromise;
}

// Helpers para identificar tipos de requisição
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.includes(ext)) || 
         url.pathname.includes('/static/') ||
         url.pathname.includes('/lovable-uploads/') ||
         url.pathname.includes('/icons/');
}

function isApiRequest(url) {
  return url.pathname.includes('/api/') || 
         url.hostname.includes('supabase') ||
         url.hostname.includes('api.');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

// Limpeza periódica do cache e gerenciamento de notificações
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_PWA_INSTALLED') {
    self.__PWA_INSTALLED__ = Boolean(event.data.value);
    return;
  }
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    cleanOldCaches();
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'GET_VAPID_PUBLIC_KEY') {
    event.ports[0].postMessage({ 
      type: 'VAPID_PUBLIC_KEY', 
      key: getVapidPublicKey() 
    });
  }
  
  if (event.data && event.data.type === 'SUBSCRIBE_PUSH') {
    event.waitUntil(subscribeToPushNotifications(event.data.userId));
  }
  
  if (event.data && event.data.type === 'UNSUBSCRIBE_PUSH') {
    event.waitUntil(unsubscribeFromPushNotifications());
  }
});

// Função para inscrever-se em notificações push
async function subscribeToPushNotifications(userId) {
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey())
    });
    
    // Enviar subscription para o servidor
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: subscription,
        userId: userId
      })
    });
    
    console.log('[SW] Successfully subscribed to push notifications');
  } catch (error) {
    console.log('[SW] Error subscribing to push notifications:', error);
  }
}

// Função para cancelar inscrição em notificações push
async function unsubscribeFromPushNotifications() {
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[SW] Successfully unsubscribed from push notifications');
    }
  } catch (error) {
    console.log('[SW] Error unsubscribing from push notifications:', error);
  }
}

// Função para converter VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// VAPID public key - será injetada via ambiente
function getVapidPublicKey() {
  // Esta chave será substituída dinamicamente quando os secrets forem configurados
  // Por enquanto, retorna a chave padrão (será atualizada após configurar os secrets)
  return self.VAPID_PUBLIC_KEY || 'VAPID_KEY_NOT_CONFIGURED';
}

// Limpeza automática de caches antigos
async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.includes('oliver-') && 
    name !== STATIC_CACHE_NAME && 
    name !== DYNAMIC_CACHE_NAME
  );
  
  return Promise.all(
    oldCaches.map(cacheName => caches.delete(cacheName))
  );
}

// Background sync para ações offline
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Implementar sincronização de dados offline
  console.log('[SW] Handling background sync...');
}

// Push notifications melhoradas
self.addEventListener('push', event => {
  try {
    if (!self.__PWA_INSTALLED__) {
      console.log('🔔 [SW] Push recebido, mas PWA não está instalado — ignorando exibição');
      return;
    }
    // Evitar duplicidade quando OneSignal já está gerenciando
    if (typeof self.OneSignal !== 'undefined') {
      console.log('🔔 [SW] OneSignal ativo — deixando o SDK gerenciar a notificação');
      return;
    }
  } catch (e) {}
  console.log('🔔 [SW] Push message received');
  
  let notificationData = {
    title: 'OneDrip',
    body: 'Nova notificação disponível!',
    type: 'info',
    id: Date.now().toString(),
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    url: '/',
    data: {}
  };
  
  // Parse dos dados da notificação se disponível
  if (event.data) {
    try {
      const pushData = JSON.parse(event.data.text());
      console.log('🔔 [SW] Dados da notificação recebidos:', pushData);
      notificationData = {
        ...notificationData,
        ...pushData,
        id: pushData.id || pushData.notification_id || notificationData.id
      };
    } catch (error) {
      console.error('❌ [SW] Erro ao fazer parse dos dados da notificação:', error);
      notificationData.body = event.data.text();
    }
  } else {
    console.log('🔔 [SW] Nenhum dado recebido com a notificação');
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192x192.png',
    badge: notificationData.badge || '/badge-72x72.png',
    vibrate: getVibrationPattern(notificationData.type),
    data: {
      dateOfArrival: Date.now(),
      notificationId: notificationData.id,
      type: notificationData.type,
      url: notificationData.url || '/',
      ...notificationData.data
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/icon-96x96.png'
      },
      {
        action: 'mark-read',
        title: 'Marcar como lida',
        icon: '/icon-96x96.png'
      }
    ],
    tag: notificationData.id, // Evita notificações duplicadas
    requireInteraction: notificationData.type === 'error' || notificationData.type === 'warning',
    silent: notificationData.silent || false,
    renotify: true,
    // Otimizações para mobile
    image: notificationData.image,
    timestamp: Date.now(),
    dir: 'ltr',
    lang: 'pt-BR'
  };
  
  console.log('🔔 [SW] Exibindo notificação:', notificationData.title, options);
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'OneDrip', options)
  );
});

// Função para definir padrão de vibração baseado no tipo
function getVibrationPattern(type) {
  // Verificar se o dispositivo suporta vibração
  if (!('vibrate' in navigator)) {
    return [];
  }
  
  switch (type) {
    case 'error':
      return [300, 100, 300, 100, 300]; // Vibração mais intensa para erros
    case 'warning':
      return [200, 100, 200]; // Vibração moderada para avisos
    case 'success':
      return [100, 50, 100]; // Vibração suave para sucesso
    case 'urgent':
      return [500, 200, 500, 200, 500]; // Vibração muito intensa para urgente
    case 'info':
    default:
      return [150]; // Vibração simples para informações
  }
}

self.addEventListener('notificationclick', event => {
  console.log('🔔 [SW] Notification click received.');
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data;
  
  console.log('🔔 [SW] Notification data:', { action, data });
  
  notification.close();
  
  if (action === 'open' || !action) {
    // Abrir a aplicação na URL específica ou página inicial
    const urlToOpen = data.url || '/';
    console.log('🔔 [SW] Abrindo URL:', urlToOpen);
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          console.log('🔔 [SW] Clientes encontrados:', clientList.length);
          
          // Verificar se já existe uma janela aberta
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              console.log('✅ [SW] Focando cliente existente:', client.url);
              client.focus();
              client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                notificationId: data.notificationId,
                url: urlToOpen,
                data: data
              });
              return;
            }
          }
          // Se não há janela aberta, abrir uma nova
          if (clients.openWindow) {
            console.log('🔔 [SW] Abrindo nova janela:', urlToOpen);
            return clients.openWindow(urlToOpen);
          }
        })
        .catch(error => {
          console.error('❌ [SW] Erro ao processar clique na notificação:', error);
        })
    );
  } else if (action === 'mark-read') {
    console.log('🔔 [SW] Marcando notificação como lida:', data.notificationId);
    // Marcar notificação como lida
    event.waitUntil(
      markNotificationAsRead(data.notificationId)
    );
  }
});

// Event listener para quando notificação é fechada
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notification closed.');
  
  const notification = event.notification;
  const data = notification.data;
  
  // Enviar evento para a aplicação principal
  event.waitUntil(
    clients.matchAll().then(clientList => {
      clientList.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSED',
          notificationId: data.notificationId,
          data: data
        });
      });
    })
  );
});

// Função para marcar notificação como lida via API
async function markNotificationAsRead(notificationId) {
  try {
    // Enviar mensagem para a aplicação principal para marcar como lida
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'MARK_NOTIFICATION_READ',
        notificationId: notificationId
      });
    });
  } catch (error) {
    console.log('[SW] Error marking notification as read:', error);
  }
}

console.log('[SW] Service Worker loaded successfully');