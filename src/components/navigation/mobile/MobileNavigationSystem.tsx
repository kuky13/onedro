import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Settings, Command } from 'lucide-react';

// Import all navigation components
import { MobileBreadcrumbs } from './MobileBreadcrumbs';
import { BottomTabNavigation } from './BottomTabNavigation';
import { MobileCommandPalette } from './MobileCommandPalette';
import { FloatingActionButton } from './FloatingActionButton';
import { NativeGestures } from './NativeGestures';
import { GlobalSearch } from './GlobalSearch';
import { FavoritesSystem } from './FavoritesSystem';
import { PWAConfig, PWAMetaTags } from './PWAConfig';

interface MobileNavigationSystemProps {
  children: React.ReactNode;
  className?: string;
  enableBreadcrumbs?: boolean;
  enableBottomTabs?: boolean;
  enableCommandPalette?: boolean;
  enableFAB?: boolean;
  enableGestures?: boolean;
  enableGlobalSearch?: boolean;
  enableFavorites?: boolean;
  enablePWA?: boolean;
  onRefresh?: () => Promise<void>;
}

export const MobileNavigationSystem: React.FC<MobileNavigationSystemProps> = ({
  children,
  className = '',
  enableBreadcrumbs = true,
  enableBottomTabs = true,
  enableCommandPalette = true,
  enableFAB = true,
  enableGestures = true,
  enableGlobalSearch = true,
  enableFavorites = true,
  enablePWA = true,
  onRefresh
}) => {
  const location = useLocation();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isPWAConfigOpen, setIsPWAConfigOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Command/Ctrl + K for command palette
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      
      // Command/Ctrl + / for global search
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        setIsGlobalSearchOpen(true);
      }
      
      // Command/Ctrl + B for favorites
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setIsFavoritesOpen(true);
      }
      
      // Escape to close all modals
      if (event.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsGlobalSearchOpen(false);
        setIsFavoritesOpen(false);
        setIsPWAConfigOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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

  // Handle quick actions from floating buttons
  const handleQuickAction = useCallback((action: string) => {
    hapticFeedback('light');
    
    switch (action) {
      case 'search':
        setIsGlobalSearchOpen(true);
        break;
      case 'favorites':
        setIsFavoritesOpen(true);
        break;
      case 'command':
        setIsCommandPaletteOpen(true);
        break;
      case 'pwa':
        setIsPWAConfigOpen(true);
        break;
      default:
        break;
    }
  }, [hapticFeedback]);

  // Don't render mobile navigation on desktop
  if (!isMobile) {
    return (
      <div className={className}>
        {enablePWA && <PWAMetaTags />}
        {children}
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* PWA Meta Tags */}
      {enablePWA && <PWAMetaTags />}
      
      {/* Native Gestures Wrapper */}
      {enableGestures ? (
        <NativeGestures
          onRefresh={onRefresh}
          enableSwipeBack={true}
          enablePullToRefresh={!!onRefresh}
          enable3DTouch={true}
          className="min-h-screen"
        >
          <div className="flex flex-col min-h-screen">
            {/* Breadcrumbs */}
            {enableBreadcrumbs && (
              <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/50">
                <MobileBreadcrumbs />
              </div>
            )}
            
            {/* Main Content */}
            <div className="flex-1 pb-20">
              {children}
            </div>
            
            {/* Bottom Tab Navigation */}
            {enableBottomTabs && (
              <div className="fixed bottom-0 left-0 right-0 z-30">
                <BottomTabNavigation />
              </div>
            )}
          </div>
        </NativeGestures>
      ) : (
        <div className="flex flex-col min-h-screen">
          {/* Breadcrumbs */}
          {enableBreadcrumbs && (
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/50">
              <MobileBreadcrumbs />
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-1 pb-20">
            {children}
          </div>
          
          {/* Bottom Tab Navigation */}
          {enableBottomTabs && (
            <div className="fixed bottom-0 left-0 right-0 z-30">
              <BottomTabNavigation />
            </div>
          )}
        </div>
      )}
      
      {/* Floating Action Button */}
      {enableFAB && (
        <FloatingActionButton 
          position="bottom-right"
          className="z-40"
        />
      )}
      
      {/* Quick Access Buttons */}
      <div className="fixed top-4 right-4 z-40 flex flex-col space-y-2">
        {/* Global Search Button */}
        {enableGlobalSearch && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickAction('search')}
            className="
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full
              shadow-lg border border-gray-200/50
              flex items-center justify-center
              text-gray-600 hover:text-blue-600
              transition-colors
            "
          >
            <Search size={20} />
          </motion.button>
        )}
        
        {/* Favorites Button */}
        {enableFavorites && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickAction('favorites')}
            className="
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full
              shadow-lg border border-gray-200/50
              flex items-center justify-center
              text-gray-600 hover:text-yellow-600
              transition-colors
            "
          >
            <Star size={20} />
          </motion.button>
        )}
        
        {/* Command Palette Button */}
        {enableCommandPalette && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickAction('command')}
            className="
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full
              shadow-lg border border-gray-200/50
              flex items-center justify-center
              text-gray-600 hover:text-purple-600
              transition-colors
            "
          >
            <Command size={20} />
          </motion.button>
        )}
        
        {/* PWA Config Button */}
        {enablePWA && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleQuickAction('pwa')}
            className="
              w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full
              shadow-lg border border-gray-200/50
              flex items-center justify-center
              text-gray-600 hover:text-green-600
              transition-colors
            "
          >
            <Settings size={20} />
          </motion.button>
        )}
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {/* Command Palette */}
        {enableCommandPalette && (
          <MobileCommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
          />
        )}
        
        {/* Global Search */}
        {enableGlobalSearch && (
          <GlobalSearch
            isOpen={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
          />
        )}
        
        {/* Favorites System */}
        {enableFavorites && (
          <FavoritesSystem
            isOpen={isFavoritesOpen}
            onClose={() => setIsFavoritesOpen(false)}
          />
        )}
        
        {/* PWA Configuration */}
        {enablePWA && (
          <PWAConfig
            isOpen={isPWAConfigOpen}
            onClose={() => setIsPWAConfigOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* iOS-style Safe Area Support */}
      <style jsx>{`
        @supports (padding: max(0px)) {
          .safe-area-inset-top {
            padding-top: max(1rem, env(safe-area-inset-top));
          }
          .safe-area-inset-bottom {
            padding-bottom: max(1rem, env(safe-area-inset-bottom));
          }
          .safe-area-inset-left {
            padding-left: max(1rem, env(safe-area-inset-left));
          }
          .safe-area-inset-right {
            padding-right: max(1rem, env(safe-area-inset-right));
          }
        }
        
        /* iOS-specific optimizations */
        @media (hover: none) and (pointer: coarse) {
          * {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
          }
          
          input, textarea {
            -webkit-user-select: text;
          }
        }
        
        /* PWA display mode styles */
        @media (display-mode: standalone) {
          .pwa-only {
            display: block;
          }
          .browser-only {
            display: none;
          }
        }
        
        @media not (display-mode: standalone) {
          .pwa-only {
            display: none;
          }
          .browser-only {
            display: block;
          }
        }
      `}</style>
    </div>
  );
};

ex