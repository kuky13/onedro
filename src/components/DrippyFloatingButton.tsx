import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DrippySettings {
  isHidden: boolean;
  isMinimized: boolean;
}

const defaultSettings: DrippySettings = {
  isHidden: false,
  isMinimized: false
};

export const DrippyFloatingButton = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [settings, setSettings] = useState<DrippySettings>(defaultSettings);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detect device type
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(isMobileDevice || isTouchDevice);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('drippy-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Error parsing Drippy settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<DrippySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('drippy-settings', JSON.stringify(updated));
  };

  // Hide on Drippy page, share service order pages, plans pages, or if user has hidden it
  useEffect(() => {
    if (location.pathname === '/drippy' || 
        location.pathname.startsWith('/share/service-order/') || 
        location.pathname === '/plans/m' || 
        location.pathname === '/plans/a' || 
        settings.isHidden) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, [location.pathname, settings.isHidden]);

  const handleMainClick = () => {
    if (!settings.isMinimized) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmYes = () => {
    setShowConfirmDialog(false);
    navigate('/chat');
  };

  const handleHideButton = () => {
    setShowConfirmDialog(false);
    saveSettings({ isMinimized: true });
  };

  const handleDeleteForever = () => {
    setShowConfirmDialog(false);
    saveSettings({ isHidden: true });
  };

  const handleSidebarClick = () => {
    saveSettings({ isMinimized: false });
  };

  if (!isVisible) return null;

  // Responsive button sizes
  const buttonSize = isMobile ? 'w-14 h-14' : 'w-16 h-16';
  const imageSize = isMobile ? 'w-12 h-12' : 'w-14 h-14';
  const indicatorSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const padding = isMobile ? 'p-1' : 'p-1';

  return (
    <>
      {/* Backdrop when dialog is open */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setShowConfirmDialog(false)} />
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-6 min-w-[320px] animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img 
                src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                alt="Drippy"
                className="w-14 h-14 rounded-full border-2 border-primary/30"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Drippy</h3>
              <p className="text-sm text-muted-foreground">Sua assistente virtual da OneDrip</p>
            </div>
          </div>
          
          <p className="text-foreground mb-6">
            Gostaria de tirar suas duvidas com sobre o site?
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleConfirmYes}
              className="bg-primary hover:bg-primary/90 w-full"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Sim, vamos conversar
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleHideButton}
                className="hover:bg-muted flex-1"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Ocultar botão
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleDeleteForever}
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Apagar para sempre
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized Sidebar */}
      {settings.isMinimized && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 group cursor-pointer"
          onClick={handleSidebarClick}
        >
          <div className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 ease-out p-1 rounded-r-lg border-r border-t border-b border-primary/30 backdrop-blur-sm group-hover:pl-2">
            <div className="w-1 h-16 bg-gradient-to-b from-primary-foreground/20 via-primary-foreground/50 to-primary-foreground/20 rounded-full"></div>
          </div>
          
          {/* Hover tooltip - simplified */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-background/95 text-foreground px-3 py-2 rounded-lg shadow-lg border border-border/50 backdrop-blur-sm whitespace-nowrap text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            Mostrar Drippy
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-background/95"></div>
          </div>
        </div>
      )}

      {/* Main Button - Simplified and Responsive */}
      {!settings.isMinimized && (
        <div className={`fixed ${isMobile ? 'left-4 bottom-4' : 'left-6 bottom-6'} z-40`}>
          <div className="relative group">
            {/* Subtle animated ring around the image */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse opacity-50"></div>
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-30"></div>
            
            <button
              onClick={handleMainClick}
              className={`relative transition-all duration-300 ease-out ${padding} rounded-full ${buttonSize} group cursor-pointer hover:scale-105 active:scale-95`}
            >
              {/* Just the image with subtle background */}
              <div className="relative flex items-center justify-center w-full h-full bg-background/80 backdrop-blur-sm rounded-full shadow-lg border border-border/30">
                <img 
                  src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                  alt="Drippy"
                  className={`${imageSize} rounded-full transition-transform duration-300 group-hover:scale-105`}
                />
                
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                  <div className={`${indicatorSize} bg-green-400 rounded-full border-2 border-background animate-pulse`}></div>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </>
  );
};