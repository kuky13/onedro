import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { detectPlatform, detectInstallMethod, isAppInstalled, getInstallInstructions, type PWAPlatform, type InstallMethod, type InstallInstructions } from '@/utils/pwaDetection';

const DISMISS_STORAGE_KEY = 'pwa_install_dismissed_until';
const DISMISS_DAYS = 7;

// Interface simplificada do estado PWA
export interface SimplePWAState {
  platform: PWAPlatform;
  installMethod: InstallMethod;
  isInstalled: boolean;
  canInstall: boolean;
  isInstalling: boolean;
  promptAvailable: boolean;
  isDismissed: boolean;
  returnedFromShare: boolean; // Indica se usuário voltou do share sheet
}

// Interface do resultado de instalação
export interface InstallResult {
  success: boolean;
  method: InstallMethod;
  message: string;
  requiresInstructions: boolean;
}

export const usePWASimple = () => {
  const { showSuccess, showError } = useToast();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  const [state, setState] = useState<SimplePWAState>({
    platform: 'other',
    installMethod: 'not-supported',
    isInstalled: false,
    canInstall: false,
    isInstalling: false,
    promptAvailable: false,
    isDismissed: false,
    returnedFromShare: false
  });

  // Verifica se foi dismissado recentemente
  const checkDismissed = useCallback(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedUntil) {
        const dismissDate = new Date(dismissedUntil);
        return dismissDate > new Date();
      }
    } catch {
      // localStorage não disponível
    }
    return false;
  }, []);

  // Salva dismiss por X dias
  const saveDismiss = useCallback(() => {
    try {
      const dismissUntil = new Date();
      dismissUntil.setDate(dismissUntil.getDate() + DISMISS_DAYS);
      localStorage.setItem(DISMISS_STORAGE_KEY, dismissUntil.toISOString());
      setState(prev => ({ ...prev, isDismissed: true }));
    } catch {
      // localStorage não disponível
    }
  }, []);

  // Inicialização do estado
  useEffect(() => {
    const platform = detectPlatform();
    const installMethod = detectInstallMethod(platform);
    const isInstalled = isAppInstalled();
    const isDismissed = checkDismissed();
    
    setState(prev => ({
      ...prev,
      platform,
      installMethod,
      isInstalled,
      canInstall: installMethod !== 'not-supported' && !isInstalled,
      promptAvailable: false,
      isDismissed
    }));
  }, [checkDismissed]);

  // Event listeners para PWA
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.debug('🚀 PWA: beforeinstallprompt event captured');
      e.preventDefault();
      setInstallPrompt(e);
      setState(prev => ({ 
        ...prev, 
        canInstall: true,
        installMethod: 'native-pwa',
        promptAvailable: true
      }));
    };

    const handleAppInstalled = () => {
      console.debug('✅ PWA: App installed successfully');
      setState(prev => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
        isInstalling: false,
        promptAvailable: false
      }));
      setInstallPrompt(null);
      showSuccess({
        title: 'App Instalado!',
        description: 'One Drip foi instalado com sucesso.'
      });
    };

    const handleOnline = () => {
      const platform = detectPlatform();
      const installMethod = detectInstallMethod(platform);
      const isInstalled = isAppInstalled();
      
      setState(prev => ({
        ...prev,
        platform,
        installMethod,
        isInstalled,
        canInstall: installMethod !== 'not-supported' && !isInstalled
      }));
    };

    // Detectar retorno do share sheet (iOS)
    let wasHidden = false;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        wasHidden = false;
        // Usuário voltou - pode ter vindo do share sheet
        const platform = detectPlatform();
        if (platform === 'ios') {
          setState(prev => ({ ...prev, returnedFromShare: true }));
          // Reset após 5 segundos
          setTimeout(() => {
            setState(prev => ({ ...prev, returnedFromShare: false }));
          }, 5000);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showSuccess]);

  // Função principal de instalação simplificada
  const installApp = useCallback(async (): Promise<InstallResult> => {
    if (state.isInstalled) {
      return {
        success: false,
        method: state.installMethod,
        message: 'App já está instalado',
        requiresInstructions: false
      };
    }

    setState(prev => ({ ...prev, isInstalling: true }));

    try {
      // Se temos o prompt nativo disponível, usar ele
      if (installPrompt && state.promptAvailable) {
        console.debug('🤖 PWA: Usando prompt nativo');
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          showSuccess({
            title: 'Instalação Iniciada',
            description: 'O app está sendo instalado...'
          });
          
          return {
            success: true,
            method: 'native-pwa',
            message: 'Instalação iniciada com sucesso',
            requiresInstructions: false
          };
        } else {
          console.debug('PWA: Usuário cancelou a instalação');
          setInstallPrompt(null);
          setState(prev => ({ ...prev, promptAvailable: false }));
          
          return {
            success: false,
            method: 'native-pwa',
            message: 'Instalação cancelada pelo usuário',
            requiresInstructions: true
          };
        }
      }
      
      return {
        success: false,
        method: state.installMethod,
        message: 'Prompt nativo não disponível',
        requiresInstructions: true
      };
      
    } catch (error) {
      console.error('❌ PWA: Erro na instalação:', error);
      showError({
        title: 'Erro na Instalação',
        description: 'Tente usar as instruções manuais.'
      });
      
      return {
        success: false,
        method: state.installMethod,
        message: 'Erro durante a instalação',
        requiresInstructions: true
      };
    } finally {
      setState(prev => ({ ...prev, isInstalling: false }));
    }
  }, [state, installPrompt, showSuccess, showError]);

  // Obter instruções de instalação
  const getInstallInstructionsCallback = useCallback((): InstallInstructions | null => {
    return getInstallInstructions(state.platform);
  }, [state.platform]);

  return {
    ...state,
    installApp,
    dismissForDays: saveDismiss,
    getInstallInstructions: getInstallInstructionsCallback
  };
};
