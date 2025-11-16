import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type PlatformType = 'ios' | 'android' | 'windows' | 'macos' | 'unknown';

export interface DeviceInfo {
  deviceType: DeviceType;
  platform: PlatformType;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isRetina: boolean;
  orientation: 'portrait' | 'landscape';
  hasHover: boolean;
  prefersReducedMotion: boolean;
  colorScheme: 'light' | 'dark';
  isStandalone: boolean;
  shouldUseLite: boolean;
  isLowEnd: boolean;
  hasTouch: boolean;
  supportsHaptics: boolean;
}

const getDeviceType = (width: number): DeviceType => {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

const getPlatform = (): PlatformType => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  if (/windows/.test(userAgent)) return 'windows';
  if (/mac/.test(userAgent)) return 'macos';
  
  return 'unknown';
};

const isTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

const hasHoverCapability = (): boolean => {
  return window.matchMedia('(hover: hover)').matches;
};

const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getColorScheme = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getOrientation = (width: number, height: number): 'portrait' | 'landscape' => {
  return width > height ? 'landscape' : 'portrait';
};

const isLowEndDevice = (): boolean => {
  // Detectar dispositivos de baixo desempenho baseado em várias métricas
  const cores = navigator.hardwareConcurrency || 1;
  const memory = (navigator as any).deviceMemory || 1;
  const connection = (navigator as any).connection;
  
  // Dispositivos com menos de 4 cores ou menos de 2GB RAM
  if (cores < 4 || memory < 2) return true;
  
  // Conexão lenta
  if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
    return true;
  }
  
  // Dispositivos móveis antigos (baseado no user agent)
  const userAgent = navigator.userAgent.toLowerCase();
  if (/android [1-6]/.test(userAgent)) return true;
  if (/iphone os [1-9]_/.test(userAgent)) return true;
  
  return false;
};

const supportsHaptics = (): boolean => {
  const platform = getPlatform();
  return platform === 'ios' || platform === 'android';
};

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const deviceType = getDeviceType(width);
    const platform = getPlatform();
    
    return {
      deviceType,
      platform,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isMobile: deviceType === 'mobile',
      isTablet: deviceType === 'tablet',
      isDesktop: deviceType === 'desktop',
      isTouchDevice: isTouchDevice(),
      screenWidth: width,
      screenHeight: height,
      pixelRatio: window.devicePixelRatio || 1,
      isRetina: (window.devicePixelRatio || 1) > 1,
      orientation: getOrientation(width, height),
      hasHover: hasHoverCapability(),
      prefersReducedMotion: prefersReducedMotion(),
      colorScheme: getColorScheme(),
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone,
      shouldUseLite: deviceType === 'mobile' || width < 768,
      isLowEnd: isLowEndDevice(),
      hasTouch: isTouchDevice(),
      supportsHaptics: supportsHaptics()
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const deviceType = getDeviceType(width);
      const platform = getPlatform();
      
      setDeviceInfo({
        deviceType,
        platform,
        isIOS: platform === 'ios',
        isAndroid: platform === 'android',
        isMobile: deviceType === 'mobile',
        isTablet: deviceType === 'tablet',
        isDesktop: deviceType === 'desktop',
        isTouchDevice: isTouchDevice(),
        screenWidth: width,
        screenHeight: height,
        pixelRatio: window.devicePixelRatio || 1,
        isRetina: (window.devicePixelRatio || 1) > 1,
        orientation: getOrientation(width, height),
        hasHover: hasHoverCapability(),
        prefersReducedMotion: prefersReducedMotion(),
        colorScheme: getColorScheme(),
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone,
        shouldUseLite: deviceType === 'mobile' || width < 768,
        isLowEnd: isLowEndDevice(),
        hasTouch: isTouchDevice(),
        supportsHaptics: supportsHaptics()
      });
    };

    // Listeners para mudanças
    const resizeListener = () => updateDeviceInfo();
    const orientationListener = () => {
      // Delay para aguardar a mudança de orientação completar
      setTimeout(updateDeviceInfo, 100);
    };
    
    const colorSchemeListener = (e: MediaQueryListEvent) => {
      setDeviceInfo(prev => ({
        ...prev,
        colorScheme: e.matches ? 'dark' : 'light'
      }));
    };
    
    const motionListener = (e: MediaQueryListEvent) => {
      setDeviceInfo(prev => ({
        ...prev,
        prefersReducedMotion: e.matches
      }));
    };

    // Event listeners
    window.addEventListener('resize', resizeListener);
    window.addEventListener('orientationchange', orientationListener);
    
    // Media query listeners
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    colorSchemeQuery.addEventListener('change', colorSchemeListener);
    motionQuery.addEventListener('change', motionListener);

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeListener);
      window.removeEventListener('orientationchange', orientationListener);
      colorSchemeQuery.removeEventListener('change', colorSchemeListener);
      motionQuery.removeEventListener('change', motionListener);
    };
  }, []);

  return deviceInfo;
};

// Hook para breakpoints específicos
export const useBreakpoint = () => {
  const { screenWidth } = useDeviceDetection();
  
  return {
    isMobile: screenWidth < 768,
    isTablet: screenWidth >= 768 && screenWidth < 1024,
    isDesktop: screenWidth >= 1024,
    isLarge: screenWidth >= 1280,
    isXLarge: screenWidth >= 1536,
    width: screenWidth
  };
};

// Hook para detecção de capacidades do dispositivo
export const useDeviceCapabilities = () => {
  const deviceInfo = useDeviceDetection();
  
  return {
    supportsHover: deviceInfo.hasHover,
    supportsTouch: deviceInfo.isTouchDevice,
    supportsHaptics: deviceInfo.isIOS || deviceInfo.isAndroid,
    supportsWebP: (() => {
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })(),
    supportsAvif: (() => {
      const canvas = document.createElement('canvas');
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    })(),
    supportsServiceWorker: 'serviceWorker' in navigator,
    supportsIntersectionObserver: 'IntersectionObserver' in window,
    supportsResizeObserver: 'ResizeObserver' in window
  };
};

// Utility para classes CSS condicionais
export const getDeviceClasses = (deviceInfo: DeviceInfo): string => {
  const classes = [
    `device-${deviceInfo.deviceType}`,
    `platform-${deviceInfo.platform}`,
    `orientation-${deviceInfo.orientation}`,
    deviceInfo.isTouchDevice ? 'touch-device' : 'no-touch',
    deviceInfo.hasHover ? 'has-hover' : 'no-hover',
    deviceInfo.isRetina ? 'retina' : 'non-retina',
    deviceInfo.prefersReducedMotion ? 'reduced-motion' : 'full-motion',
    `color-scheme-${deviceInfo.colorScheme}`
  ];
  
  return classes.join(' ');
};

export default useDeviceDetection;