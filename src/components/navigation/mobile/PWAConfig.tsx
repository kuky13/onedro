import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  Share, 
  X, 
  Check,
  Apple,
  Chrome,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';

interface PWAConfigProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAConfig: React.FC<PWAConfigProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect iOS and standalone mode
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    
    setIsIOS(iOS);
    setIsStandalone(standalone);
    setIsInstalled(standalone);
  }, []);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Haptic feedback helper
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [30],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Handle PWA installation
  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    hapticFeedback('medium');
    
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        hapticFeedback('heavy');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
  }, [deferredPrompt, hapticFeedback]);

  // Copy install instructions
  const copyInstructions = useCallback(() => {
    const instructions = isIOS 
      ? 'Para instalar: Toque no ícone de compartilhar e selecione "Adicionar à Tela de Início"'
      : 'Para instalar: Toque no menu do navegador e selecione "Instalar app"';
    
    navigator.clipboard.writeText(instructions);
    hapticFeedback('light');
  }, [isIOS, hapticFeedback]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-50 ${className}`}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* PWA Config Container */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="
            absolute bottom-0 left-0 right-0
            bg-white/95 backdrop-blur-md
            rounded-t-3xl shadow-2xl
            border-t border-gray-200/50
            max-h-[80vh] overflow-hidden
          "
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <Smartphone size={24} className="mr-2 text-blue-600" />
                  Configurações PWA
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Instale o app para melhor experiência
                </p>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                <X size={20} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Installation Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Settings size={20} className="mr-2" />
                Status da Instalação
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Installation Status Card */}
                <div className={`
                  p-4 rounded-xl border-2 transition-all
                  ${isInstalled 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-blue-200 bg-blue-50'
                  }
                `}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {isInstalled ? (
                        <Check size={20} className="text-green-600" />
                      ) : (
                        <Download size={20} className="text-blue-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {isInstalled ? 'App Instalado' : 'Instalar App'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {isInstalled 
                            ? 'O app está instalado na tela inicial' 
                            : 'Adicione à tela inicial para acesso rápido'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {!isInstalled && (
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={isInstallable ? handleInstall : copyInstructions}
                        className="
                          px-4 py-2 bg-blue-600 text-white rounded-lg
                          font-medium text-sm hover:bg-blue-700
                          transition-colors
                        "
                      >
                        {isInstallable ? 'Instalar' : 'Instruções'}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Online Status Card */}
                <div className={`
                  p-4 rounded-xl border-2 transition-all
                  ${isOnline 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                  }
                `}>
                  <div className="flex items-center space-x-3">
                    {isOnline ? (
                      <Wifi size={20} className="text-green-600" />
                    ) : (
                      <WifiOff size={20} className="text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isOnline 
                          ? 'Conectado à internet' 
                          : 'Funcionando offline'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Installation Instructions */}
            {!isInstalled && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">
                  Como Instalar
                </h3>
                
                {isIOS ? (
                  /* iOS Instructions */
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Apple size={20} className="text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Safari (iOS)</p>
                        <ol className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>1. Toque no ícone de compartilhar <Share size={14} className="inline" /></li>
                          <li>2. Role para baixo e toque em "Adicionar à Tela de Início"</li>
                          <li>3. Toque em "Adicionar" para confirmar</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Android Instructions */
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Chrome size={20} className="text-gray-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Chrome (Android)</p>
                        <ol className="text-sm text-gray-600 mt-1 space-y-1">
                          <li>1. Toque no menu (⋮) do navegador</li>
                          <li>2. Selecione "Instalar app" ou "Adicionar à tela inicial"</li>
                          <li>3. Toque em "Instalar" para confirmar</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">
                Recursos do App
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-blue-600 mb-2">
                    <Smartphone size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Acesso Rápido</p>
                  <p className="text-xs text-gray-600">Ícone na tela inicial</p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-green-600 mb-2">
                    <WifiOff size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Modo Offline</p>
                  <p className="text-xs text-gray-600">Funciona sem internet</p>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-purple-600 mb-2">
                    <Settings size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Nativo</p>
                  <p className="text-xs text-gray-600">Experiência de app</p>
                </div>
                
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-orange-600 mb-2">
                    <Download size={20} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">Atualizações</p>
                  <p className="text-xs text-gray-600">Automáticas</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* iOS-style Home Indicator */}
          <div className="flex justify-center pb-2">
            <div className="w-32 h-1 bg-gray-300 rounded-full" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// PWA Meta Tags Component
export const PWAMetaTags: React.FC = () => {
  useEffect(() => {
    // Add PWA meta tags to document head
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'OneDrip' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'theme-color', content: '#2563eb' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }
    ];

    const linkTags = [
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
      { rel: 'manifest', href: '/manifest.json' }
    ];

    // Add meta tags
    metaTags.forEach(tag => {
      const existingTag = document.querySelector(`meta[name="${tag.name}"]`);
      if (!existingTag) {
        const meta = document.createElement('meta');
        meta.name = tag.name;
        meta.content = tag.content;
        document.head.appendChild(meta);
      }
    });

    // Add link tags
    linkTags.forEach(tag => {
      const existingTag = document.querySelector(`link[rel="${tag.rel}"]`);
      if (!existingTag) {
        const link = document.createElement('link');
        Object.entries(tag).forEach(([key, value]) => {
          link.setAttribute(key, value);
        });
        document.head.appendChild(link);
      }
    });
  }, []);

  return null;
};

export default PWAConfig;