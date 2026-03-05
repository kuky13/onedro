import React, { createContext, useContext, useEffect, useState } from 'react';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface DeviceInfo {
  hasNotch: boolean;
  hasDynamicIsland: boolean;
  isIPhone: boolean;
  model: string;
}

const SafeAreaContext = createContext<{
  insets: SafeAreaInsets;
  device: DeviceInfo;
}>({
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
  device: { hasNotch: false, hasDynamicIsland: false, isIPhone: false, model: '' }
});

export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [device, setDevice] = useState<DeviceInfo>({
    hasNotch: false,
    hasDynamicIsland: false,
    isIPhone: false,
    model: ''
  });

  useEffect(() => {
    const detectDevice = () => {
      const isIPhone = /iPhone/.test(navigator.userAgent);
      
      if (!isIPhone) {
        setDevice({ hasNotch: false, hasDynamicIsland: false, isIPhone: false, model: '' });
        return;
      }

      // Detectar modelo específico do iPhone
      const screenWidth = window.screen.width;
      const screenHeight = window.screen.height;
      const pixelRatio = window.devicePixelRatio;

      let model = '';
      let hasNotch = false;
      let hasDynamicIsland = false;

      // iPhone 14 Pro (393x852, 3x)
      if (screenWidth === 393 && screenHeight === 852 && pixelRatio === 3) {
        model = 'iPhone 14 Pro';
        hasDynamicIsland = true;
      }
      // iPhone 14 Pro Max (430x932, 3x)
      else if (screenWidth === 430 && screenHeight === 932 && pixelRatio === 3) {
        model = 'iPhone 14 Pro Max';
        hasDynamicIsland = true;
      }
      // iPhone X, XS, 11 Pro (375x812, 3x)
      else if (screenWidth === 375 && screenHeight === 812 && pixelRatio === 3) {
        model = 'iPhone X/XS/11 Pro';
        hasNotch = true;
      }
      // iPhone XR, 11, 12, 13 (414x896, 2x ou 3x)
      else if (screenWidth === 414 && screenHeight === 896) {
        model = 'iPhone XR/11/12/13';
        hasNotch = true;
      }
      // iPhone 12/13 Pro Max (428x926, 3x)
      else if (screenWidth === 428 && screenHeight === 926 && pixelRatio === 3) {
        model = 'iPhone 12/13 Pro Max';
        hasNotch = true;
      }

      setDevice({ hasNotch, hasDynamicIsland, isIPhone: true, model });
    };

    const updateInsets = () => {
      // Verificar se estamos no browser e se o DOM está pronto
      if (typeof window !== 'undefined' && 
          typeof document !== 'undefined' && 
          document.documentElement &&
          'CSS' in window && 
          CSS.supports('padding: env(safe-area-inset-top)')) {
        
        try {
          const computedStyle = getComputedStyle(document.documentElement);
          
          setInsets({
            top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
            bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
            left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
            right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
          });
        } catch (error) {
          console.warn('Erro ao acessar safe area insets:', error);
          // Manter valores padrão em caso de erro
          setInsets({ top: 0, bottom: 0, left: 0, right: 0 });
        }
      }
    };

    detectDevice();
    updateInsets();

    // Atualizar quando a orientação mudar
    const handleOrientationChange = () => {
      setTimeout(() => {
        detectDevice();
        updateInsets();
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', updateInsets);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', updateInsets);
    };
  }, []);

  return (
    <SafeAreaContext.Provider value={{ insets, device }}>
      {children}
    </SafeAreaContext.Provider>
  );
};

export const useSafeArea = () => useContext(SafeAreaContext);