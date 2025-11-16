// Tipos para o sistema PWA simplificado
export type PWAPlatform = 'android' | 'ios' | 'desktop' | 'other';

export type InstallMethod = 
  | 'native-pwa'           // PWA nativo (Android/Desktop Chrome)
  | 'ios-add-to-home'      // iOS Safari - Adicionar à tela
  | 'manual-instructions'  // Instruções manuais
  | 'not-supported';       // Não suportado

export interface InstallInstructions {
  platform: PWAPlatform;
  title: string;
  steps: string[];
  icon: string;
}

/**
 * Detecta a plataforma do dispositivo baseado no user agent
 */
export const detectPlatform = (): PWAPlatform => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // iOS (iPhone, iPad, iPod)
  if (/ipad|iphone|ipod/.test(userAgent)) {
    return 'ios';
  }
  
  // Android
  if (/android/.test(userAgent)) {
    return 'android';
  }
  
  // Desktop (não mobile nem tablet)
  if (!/mobile|tablet/.test(userAgent)) {
    return 'desktop';
  }
  
  return 'other';
};

/**
 * Detecta o método de instalação baseado na plataforma e navegador
 */
export const detectInstallMethod = (platform: PWAPlatform): InstallMethod => {
  switch (platform) {
    case 'android':
      // Android Chrome suporta PWA nativo
      if (isChrome()) {
        return 'native-pwa';
      }
      return 'manual-instructions';
    
    case 'ios':
      // iOS apenas via Safari com "Adicionar à Tela Inicial"
      if (isSafari()) {
        return 'ios-add-to-home';
      }
      return 'not-supported';
    
    case 'desktop':
      // Desktop Chrome/Edge suportam PWA nativo
      if (isChrome() || isEdge()) {
        return 'native-pwa';
      }
      return 'manual-instructions';
    
    default:
      return 'not-supported';
  }
};

/**
 * Verifica se o navegador é Chrome
 */
export const isChrome = (): boolean => {
  return /chrome/.test(navigator.userAgent.toLowerCase()) && 
         !/edg/.test(navigator.userAgent.toLowerCase());
};

/**
 * Verifica se o navegador é Safari
 */
export const isSafari = (): boolean => {
  return /safari/.test(navigator.userAgent.toLowerCase()) && 
         !/chrome/.test(navigator.userAgent.toLowerCase());
};

/**
 * Verifica se o navegador é Edge
 */
export const isEdge = (): boolean => {
  return /edg/.test(navigator.userAgent.toLowerCase());
};

/**
 * Verifica se o navegador é Firefox
 */
export const isFirefox = (): boolean => {
  return /firefox/.test(navigator.userAgent.toLowerCase());
};

/**
 * Verifica se o dispositivo suporta PWA
 */
export const supportsPWA = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Verifica se está em modo standalone (app instalado)
 */
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Verifica se o app já está instalado
 */
export const isAppInstalled = (): boolean => {
  return isStandalone();
};

/**
 * Obtém instruções de instalação baseadas na plataforma
 */
export const getInstallInstructions = (platform: PWAPlatform): InstallInstructions | null => {
  switch (platform) {
    case 'ios':
      return {
        platform: 'ios',
        title: 'Instalar no iOS',
        steps: [
          'Toque no ícone de compartilhar (□↗) na barra inferior',
          'Role para baixo e toque em "Adicionar à Tela Inicial"',
          'Toque em "Adicionar" para confirmar'
        ],
        icon: 'share'
      };

    case 'android':
      return {
        platform: 'android',
        title: 'Instalar no Android',
        steps: [
          'Toque nos 3 pontos (⋮) no menu do Chrome',
          'Selecione "Adicionar à tela inicial"',
          'Confirme tocando em "Adicionar"'
        ],
        icon: 'smartphone'
      };

    case 'desktop':
      return {
        platform: 'desktop',
        title: 'Instalar no Desktop',
        steps: [
          'Clique no ícone de instalação na barra de endereços',
          'Ou clique nos 3 pontos (⋮) e selecione "Instalar One Drip"',
          'Confirme a instalação'
        ],
        icon: 'monitor'
      };

    default:
      return null;
  }
};

/**
 * Detecta automaticamente a melhor opção de instalação
 */
export const detectBestInstallMethod = (): {
  method: InstallMethod;
  platform: PWAPlatform;
  instructions: InstallInstructions | null;
} => {
  const platform = detectPlatform();
  const method = detectInstallMethod(platform);
  const instructions = getInstallInstructions(platform);

  return {
    method,
    platform,
    instructions
  };
};

/**
 * Verifica se o prompt de instalação está disponível
 */
export const hasInstallPromptAvailable = (): boolean => {
  // Esta função será usada em conjunto com o event listener
  // do beforeinstallprompt no hook
  return true; // Será definido dinamicamente no hook
};

/**
 * Utilitário para debug - mostra informações do dispositivo
 */
export const getDeviceInfo = () => {
  const platform = detectPlatform();
  const method = detectInstallMethod(platform);
  
  return {
    userAgent: navigator.userAgent,
    platform,
    method,
    isChrome: isChrome(),
    isSafari: isSafari(),
    isEdge: isEdge(),
    isFirefox: isFirefox(),
    supportsPWA: supportsPWA(),
    isStandalone: isStandalone(),
    isInstalled: isAppInstalled()
  };
};