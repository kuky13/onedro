import { useState, useEffect, useCallback } from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { useToast } from './useToast';

interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAEnhancedState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isLoading: boolean;
  platform: 'web' | 'ios' | 'android' | 'standalone';
  installPrompt: PWAInstallPrompt | null;
  canShare: boolean;
  supportsNotifications: boolean;
  isIOSInstallable: boolean;
  hasNotch: boolean;
  hasDynamicIsland: boolean;
  deviceModel: string;
}

interface PWAEnhancedActions {
  installApp: () => Promise<boolean>;
  shareApp: () => Promise<boolean>;
  showInstallInstructions: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  checkForUpdates: () => Promise<void>;
  refreshApp: () => void;
  showIOSInstallModal: () => void;
  detectDeviceFeatures: () => void;
  resetPWAInstallState: () => Promise<boolean>;
  forceStateRefresh: () => Promise<void>;
}

export const usePWAEnhanced = (): PWAEnhancedState & PWAEnhancedActions => {
  const device = useDeviceDetection();
  const { showInfo, showSuccess, showError } = useToast();
  
  const [state, setState] = useState<PWAEnhancedState>({
    isInstalled: false,
    isInstallable: false,
    isOnline: navigator.onLine,
    isUpdateAvailable: false,
    isLoading: false,
    platform: 'web',
    installPrompt: null,
    canShare: 'share' in navigator,
    supportsNotifications: 'Notification' in window,
    isIOSInstallable: false,
    hasNotch: false,
    hasDynamicIsland: false,
    deviceModel: 'unknown'
  });

  // Detectar plataforma
  const detectPlatform = useCallback((): PWAEnhancedState['platform'] => {
    if (device.isStandalone) return 'standalone';
    if (device.isIOS) return 'ios';
    if (device.isAndroid) return 'android';
    return 'web';
  }, [device]);

  // Verificar se está instalado
  const checkInstalled = useCallback(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone;
    return isStandalone || isIOSStandalone;
  }, []);

  // Detectar características do dispositivo iPhone
  const detectDeviceFeatures = useCallback(() => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    if (!isIOS) {
      setState(prev => ({
        ...prev,
        isIOSInstallable: false,
        hasNotch: false,
        hasDynamicIsland: false,
        deviceModel: 'non-ios'
      }));
      return;
    }

    // Detectar modelo do iPhone baseado na resolução da tela
    const screenHeight = window.screen.height;
    const screenWidth = window.screen.width;
    const pixelRatio = window.devicePixelRatio;
    
    let deviceModel = 'iphone-unknown';
    let hasNotch = false;
    let hasDynamicIsland = false;

    // iPhone com Dynamic Island (14 Pro, 14 Pro Max, 15 series)
    if ((screenHeight === 852 && screenWidth === 393 && pixelRatio === 3) || // iPhone 14 Pro, 15, 15 Pro
        (screenHeight === 932 && screenWidth === 430 && pixelRatio === 3)) { // iPhone 14 Pro Max, 15 Plus, 15 Pro Max
      hasDynamicIsland = true;
      deviceModel = 'iphone-dynamic-island';
    }
    // iPhone com notch (X, XS, XR, 11, 12, 13 series)
    else if ((screenHeight === 812 && screenWidth === 375 && pixelRatio === 3) || // iPhone X, XS, 11 Pro, 12 mini, 13 mini
             (screenHeight === 896 && screenWidth === 414 && pixelRatio === 2) || // iPhone XR, 11
             (screenHeight === 896 && screenWidth === 414 && pixelRatio === 3) || // iPhone XS Max, 11 Pro Max
             (screenHeight === 844 && screenWidth === 390 && pixelRatio === 3) || // iPhone 12, 12 Pro, 13, 13 Pro
             (screenHeight === 926 && screenWidth === 428 && pixelRatio === 3)) { // iPhone 12 Pro Max, 13 Pro Max
      hasNotch = true;
      deviceModel = 'iphone-notch';
    }
    // iPhone sem notch (SE, 6, 7, 8 series)
    else if (screenHeight <= 736) {
      deviceModel = 'iphone-classic';
    }

    // Verificar se pode ser instalado no iOS
    const isIOSInstallable = isIOS && !checkInstalled() && 
      /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

    setState(prev => ({
      ...prev,
      isIOSInstallable,
      hasNotch,
      hasDynamicIsland,
      deviceModel
    }));
  }, [checkInstalled]);

  // Initialize state once
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isInstalled: checkInstalled(),
      platform: detectPlatform()
    }));
    
    // Detectar características do dispositivo
    detectDeviceFeatures();
  }, []); // Empty dependency array - only run once

  // Setup event listeners
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as PWAInstallPrompt
      }));
    };

    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        platform: 'standalone',
        installPrompt: null
      }));
      showSuccess({
        title: 'App Instalado!',
        description: 'One Drip foi instalado com sucesso no seu dispositivo.'
      });
    };

    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    // Adicionar listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []); // Empty dependency array - only setup once

  // Instalar app
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!state.installPrompt) {
      console.warn('PWA: installPrompt não está disponível');
      return false;
    }

    // Verificar se o prompt tem a função necessária
    if (typeof state.installPrompt.prompt !== 'function') {
      console.error('PWA: installPrompt.prompt não é uma função', state.installPrompt);
      showError({
        title: 'Erro na Instalação',
        description: 'Função de instalação não está disponível. Tente recarregar a página.'
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await state.installPrompt.prompt();
      
      // Verificar se userChoice está disponível
      if (state.installPrompt.userChoice) {
        const { outcome } = await state.installPrompt.userChoice;
        
        setState(prev => ({ ...prev, isLoading: false }));
        
        if (outcome === 'accepted') {
          setState(prev => ({ 
            ...prev, 
            isInstallable: false,
            installPrompt: null
          }));
          return true;
        }
        return false;
      } else {
        console.warn('PWA: userChoice não está disponível');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      console.error('PWA: Erro na instalação:', error);
      showError({
        title: 'Erro na Instalação',
        description: 'Não foi possível instalar o app. Tente novamente.'
      });
      return false;
    }
  }, [state.installPrompt, showError]);

  // Compartilhar app
  const shareApp = useCallback(async (): Promise<boolean> => {
    const shareData = {
      title: 'One Drip - melhor sistema para sua assistência técnica',
      text: 'Experimente o One Drip, o melhor sistema para sua assistência técnica!',
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        showSuccess({
          title: 'Link Copiado!',
          description: 'O link do One Drip foi copiado para a área de transferência.'
        });
        return true;
      }
      return false;
    } catch (error) {
      showError({
        title: 'Erro ao Compartilhar',
        description: 'Não foi possível compartilhar o app.'
      });
      return false;
    }
  }, [showSuccess, showError]);

  // Mostrar instruções de instalação
  const showInstallInstructions = useCallback(() => {
    if (device.isIOS) {
      showInfo({
        title: 'Instalar One Drip no iPhone/iPad',
        description: 'Siga estes passos: 1) Toque no botão compartilhar (Safari), 2) Selecione "Adicionar à Tela Inicial", 3) Toque em "Adicionar"',
        duration: 12000
      });
    } else if (device.isAndroid) {
      showInfo({
        title: 'Instalar One Drip no Android',
        description: 'Siga estes passos: 1) Abra o menu do Chrome (⋮), 2) Toque em "Instalar app", 3) Confirme a instalação',
        duration: 12000
      });
    } else {
      showInfo({
        title: 'Instalar One Drip no Desktop',
        description: 'Siga estes passos: 1) Procure o ícone de instalação na barra de endereços, 2) Ou use Ctrl+Shift+A (Chrome)',
        duration: 10000
      });
    }
  }, [device, showInfo]);

  // Mostrar modal específico para iOS
  const showIOSInstallModal = useCallback(() => {
    if (state.isIOSInstallable) {
      showInfo({
        title: 'Instalar One Drip',
        description: `Para instalar o One Drip no seu ${state.deviceModel.includes('dynamic-island') ? 'iPhone com Dynamic Island' : state.deviceModel.includes('notch') ? 'iPhone com notch' : 'iPhone'}: 1) Toque no ícone de compartilhar no Safari, 2) Role para baixo e toque em "Adicionar à Tela Inicial", 3) Toque em "Adicionar" para confirmar`,
        duration: 15000
      });
    } else if (device.isIOS && checkInstalled()) {
      showInfo({
        title: 'App já instalado!',
        description: 'O One Drip já está instalado no seu dispositivo.',
        duration: 3000
      });
    } else {
      showInstallInstructions();
    }
  }, [state.isIOSInstallable, state.deviceModel, device.isIOS, checkInstalled, showInfo, showInstallInstructions]);

  // Solicitar permissão de notificação
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      return false;
    }
  }, []);

  // Verificar atualizações
  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;

    try {
      let registration;
      try {
        registration = await navigator.serviceWorker.getRegistration();
      } catch (getRegError) {
        if (getRegError instanceof Error && getRegError.name === 'InvalidStateError') {
          console.warn('[PWAEnhanced] Documento em estado inválido para verificar atualizações');
          return;
        }
        throw getRegError;
      }
      
      if (registration) {
        await registration.update();
      }
    } catch (error) {
      console.error('[PWAEnhanced] Erro ao verificar atualizações:', error);
    }
  }, []);

  // Atualizar app
  const refreshApp = useCallback((): void => {
    window.location.reload();
  }, []);

  // Resetar estado de instalação PWA
  const resetPWAInstallState = useCallback(async (): Promise<boolean> => {
    try {
      // Limpar dados do localStorage relacionados ao PWA
      const keysToRemove = [
        'pwa-install-dismissed',
        'pwa-install-prompt-shown',
        'pwa-install-rejected',
        'beforeinstallprompt-dismissed',
        'install-prompt-dismissed'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Limpar cache do PWA se disponível
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Tentar reregistrar o service worker
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => registration.unregister())
          );
          
          // Aguardar um pouco antes de reregistrar
          setTimeout(async () => {
            try {
              await navigator.serviceWorker.register('/sw.js');
            } catch (error) {
              console.warn('[PWAEnhanced] Erro ao reregistrar service worker:', error);
            }
          }, 1000);
        } catch (error) {
          console.warn('[PWAEnhanced] Erro ao gerenciar service worker:', error);
        }
      }

      // Resetar estado interno
      setState(prev => ({
        ...prev,
        installPrompt: null,
        isInstallable: false
      }));

      // Forçar uma nova verificação do beforeinstallprompt
      setTimeout(() => {
        window.dispatchEvent(new Event('beforeinstallprompt'));
      }, 2000);

      showSuccess({
        title: 'Configurações Resetadas',
        description: 'As configurações de instalação foram resetadas. Recarregue a página para tentar novamente.'
      });

      return true;
    } catch (error) {
      console.error('[PWAEnhanced] Erro ao resetar estado PWA:', error);
      showError({
        title: 'Erro ao Resetar',
        description: 'Não foi possível resetar as configurações. Tente limpar os dados do site manualmente.'
      });
      return false;
    }
  }, [showSuccess, showError]);

  // Forçar atualização do estado PWA sem recarregar a página
  const forceStateRefresh = useCallback(async (): Promise<void> => {
    try {
      // Aguardar um pouco para garantir que a limpeza foi concluída
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Forçar nova verificação do beforeinstallprompt
      const checkInstallPrompt = () => {
        return new Promise<void>((resolve) => {
          const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const installPromptEvent = e as any;
            
            setState(prev => ({
              ...prev,
              installPrompt: installPromptEvent,
              isInstallable: true
            }));
            
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            resolve();
          };
          
          window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          
          // Timeout para não ficar esperando indefinidamente
          setTimeout(() => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            resolve();
          }, 3000);
          
          // Tentar disparar o evento manualmente
          setTimeout(() => {
            window.dispatchEvent(new Event('beforeinstallprompt'));
          }, 100);
        });
      };
      
      await checkInstallPrompt();
      
      // Verificar novamente o estado de instalação
      const isCurrentlyInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                                   (window.navigator as any).standalone ||
                                   document.referrer.includes('android-app://');
      
      setState(prev => ({
        ...prev,
        isInstalled: isCurrentlyInstalled
      }));
      
    } catch (error) {
      console.error('[PWAEnhanced] Erro ao forçar atualização do estado:', error);
    }
  }, []);

  return {
    ...state,
    installApp,
    shareApp,
    showInstallInstructions,
    requestNotificationPermission,
    checkForUpdates,
    refreshApp,
    showIOSInstallModal,
    detectDeviceFeatures,
    resetPWAInstallState,
    forceStateRefresh
  };
};