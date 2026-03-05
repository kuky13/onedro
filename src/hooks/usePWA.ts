import { useState, useEffect, useRef } from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { APP_CONFIG } from '@/config/app';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  platform: 'web' | 'ios' | 'android' | 'standalone';
}

interface PWAActions {
  installApp: () => Promise<boolean>;
  updateApp: () => Promise<void>;
  shareApp: () => Promise<boolean>;
  refreshApp: () => void;
}

// Global flag para evitar múltiplos registros
declare global {
  interface Window {
    __SW_REGISTRATION_PROMISE__?: Promise<ServiceWorkerRegistration>;
    __SW_REGISTERED__?: boolean;
    __CONTROLLER_CHANGED__?: boolean;
  }
}

export const usePWA = (): PWAState & PWAActions => {
  const device = useDeviceDetection();
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    platform: 'web'
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const registrationAttempted = useRef(false);
  const cleanupFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Detectar plataforma
    const detectPlatform = (): PWAState['platform'] => {
      if (device.isStandalone) return 'standalone';
      if (device.isIOS) return 'ios';
      if (device.isAndroid) return 'android';
      return 'web';
    };

    // Verificar se está instalado
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone;
      return isStandalone || isIOSStandalone;
    };

    // Atualizar estado inicial
    setState(prev => ({
      ...prev,
      isInstalled: checkInstalled(),
      platform: detectPlatform()
    }));

    // Event listeners
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState(prev => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        platform: 'standalone'
      }));
      setDeferredPrompt(null);
    };

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    // Service Worker para updates
    const handleSWUpdate = () => {
      setState(prev => ({ ...prev, isUpdateAvailable: true }));
    };

    // Adicionar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Armazenar funções de cleanup
    cleanupFunctions.current = [
      () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt),
      () => window.removeEventListener('appinstalled', handleAppInstalled),
      () => window.removeEventListener('online', handleOnline),
      () => window.removeEventListener('offline', handleOffline)
    ];

    // Service Worker registration com verificações robustas
    const registerServiceWorker = async () => {
      // Desabilitar Service Worker temporariamente em desenvolvimento para resolver problemas de cache
      if ((import.meta as any).env?.DEV && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        console.log('[PWA] Service Worker desabilitado em desenvolvimento para resolver problemas de cache');
        return;
      }

      // Verificar se já foi tentado o registro neste hook
      if (registrationAttempted.current) {
        return;
      }

      // Verificar compatibilidade
      if (!('serviceWorker' in navigator)) {
        if ((import.meta as any).env?.DEV) {
          console.log('[PWA] Service Worker não suportado');
        }
        return;
      }

      // Verificar estado do documento
      if (document.readyState === 'loading') {
        if ((import.meta as any).env?.DEV) {
          console.log('[PWA] Aguardando DOM estar pronto...');
        }
        return;
      }

      // Verificar se já existe uma promise de registro global
      if (window.__SW_REGISTRATION_PROMISE__) {
        try {
          await window.__SW_REGISTRATION_PROMISE__;
          return;
        } catch (error) {
          // Se falhou, permitir nova tentativa
          delete window.__SW_REGISTRATION_PROMISE__;
          window.__SW_REGISTERED__ = false;
        }
      }

      // Marcar tentativa
      registrationAttempted.current = true;

      try {
        // Verificar se já existe um registro ativo (com verificação de estado)
        let existingRegistration;
        try {
          existingRegistration = await navigator.serviceWorker.getRegistration();
        } catch (getRegError: any) {
          // Se getRegistration falhar devido ao estado do documento, aguardar um pouco
          if (getRegError?.name === 'InvalidStateError') {
            console.log('[PWA] Documento em estado inválido, aguardando...');
            await new Promise(resolve => setTimeout(resolve, 100));
            try {
              existingRegistration = await navigator.serviceWorker.getRegistration();
            } catch (retryError: any) {
              console.warn('[PWA] Não foi possível verificar registro existente:', retryError?.message);
              existingRegistration = null;
            }
          } else {
            throw getRegError;
          }
        }
        
        if (existingRegistration) {
           if ((import.meta as any).env?.DEV) {
             console.log('[PWA] Service Worker já registrado:', existingRegistration.scope);
           }
          
          // Configurar listeners para updates
          setupUpdateListeners(existingRegistration, handleSWUpdate);
          return;
        }

        // Criar nova promise de registro
        window.__SW_REGISTRATION_PROMISE__ = navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });

        const registration = await window.__SW_REGISTRATION_PROMISE__;
        window.__SW_REGISTERED__ = true;

         if ((import.meta as any).env?.DEV) {
           console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);
         }

        // Configurar listeners para updates
        setupUpdateListeners(registration, handleSWUpdate);

      } catch (error) {
        console.error('[PWA] Erro no registro do Service Worker:', error);
         window.__SW_REGISTERED__ = false;
         delete window.__SW_REGISTRATION_PROMISE__;
         registrationAttempted.current = false;
      }
    };

    // Configurar listeners de update do SW
    const setupUpdateListeners = (registration: ServiceWorkerRegistration, onUpdate: () => void) => {
      const handleUpdateFound = () => {
        const newWorker = registration.installing;
        if (newWorker) {
          const handleStateChange = () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdate();
            }
          };
          
          newWorker.addEventListener('statechange', handleStateChange);
          
          // Adicionar cleanup
          cleanupFunctions.current.push(() => {
            newWorker.removeEventListener('statechange', handleStateChange);
          });
        }
      };

      registration.addEventListener('updatefound', handleUpdateFound);
      
      // Adicionar cleanup
      cleanupFunctions.current.push(() => {
        registration.removeEventListener('updatefound', handleUpdateFound);
      });
    };

    // Registrar SW quando o documento estiver pronto
    if (document.readyState === 'loading') {
      const handleDOMContentLoaded = () => {
        registerServiceWorker();
        document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      };
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
      cleanupFunctions.current.push(() => {
        document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
      });
    } else {
      // DOM já está pronto
      registerServiceWorker();
    }

    return () => {
      // Executar todas as funções de cleanup
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, [device]);

  // Actions
  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setState(prev => ({ ...prev, isInstallable: false }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro na instalação:', error);
      return false;
    }
  };

  const updateApp = async (): Promise<void> => {
    try {
      // Verificar se o Service Worker está disponível
      if (!('serviceWorker' in navigator)) {
        console.warn('[PWA] Service Worker não suportado para atualização');
        return;
      }

      // Verificar se há um controller ativo
      if (!navigator.serviceWorker.controller) {
        console.warn('[PWA] Nenhum Service Worker ativo encontrado');
        return;
      }

      let registration;
      try {
        registration = await navigator.serviceWorker.getRegistration();
      } catch (getRegError) {
        const err = getRegError as { name?: string } | null;
        if (err?.name === 'InvalidStateError') {
          console.warn('[PWA] Documento em estado inválido para atualização');
          return;
        }
        throw getRegError;
      }
      
      if (!registration) {
        console.warn('[PWA] Nenhum registro de Service Worker encontrado');
        return;
      }

      if (registration.waiting) {
        // Enviar mensagem para o SW waiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Configurar listener para mudança de controller (apenas uma vez)
        const handleControllerChange = () => {
          if (!window.__CONTROLLER_CHANGED__) {
            window.__CONTROLLER_CHANGED__ = true;
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, { once: true });
        
        // Timeout de segurança para evitar travamento
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        }, 5000);
      } else {
        console.log('[PWA] Nenhuma atualização pendente encontrada');
      }
    } catch (error) {
      console.error('[PWA] Erro na atualização do Service Worker:', error);
    }
  };

  const shareApp = async (): Promise<boolean> => {
    const shareData = {
      title: APP_CONFIG.pwa.shareTitle,
      text: APP_CONFIG.pwa.shareText,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        // Mostrar toast de copiado
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      return false;
    }
  };

  const refreshApp = (): void => {
    window.location.href = '/';
  };

  return {
    ...state,
    installApp,
    updateApp,
    shareApp,
    refreshApp
  };
};