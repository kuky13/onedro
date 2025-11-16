// @ts-nocheck
import { ReactNode, useEffect, useState } from 'react';
// Removed framer-motion imports for better performance
import { useLayout } from '@/contexts/LayoutContext';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import '@/styles/hamburger-menu.css';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { MobileMenuProvider } from '@/components/mobile/MobileMenuProvider';
import { AppSidebar } from '@/components/AppSidebar';
import { TabletHeaderNav } from './TabletHeaderNav';
import { cn } from '@/lib/utils';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { NotificationIndicator } from '@/components/NotificationIndicator';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { MobileHamburgerMenu } from '@/components/mobile/MobileHamburgerMenu';
import { useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { DesktopWithMobileMenu } from './DesktopWithMobileMenu';
interface AdaptiveLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Enhanced Mobile Layout with better responsiveness
const MobileLayoutContent = ({
  children,
  activeTab,
  onTabChange
}: AdaptiveLayoutProps) => {
  const {
    safeArea,
    orientation
  } = useLayout();
  const [isScrolled, setIsScrolled] = useState(false);
  const {
    isOpen,
    menuData,
    toggleMenu,
    closeMenu,
    handleLogout
  } = useMobileMenuContext();

  // Handle scroll state for header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <div className={cn("min-h-[100dvh] flex flex-col bg-background w-full overflow-hidden relative", "transition-all duration-300 ease-in-out")} style={{
    paddingTop: `${safeArea.top}px`,
    paddingLeft: `${safeArea.left}px`,
    paddingRight: `${safeArea.right}px`
  }}>
      {/* Enhanced Mobile Header */}
      <header className={cn("flex items-center justify-between border-b border-border sticky top-0 z-30 transition-all duration-100", "px-3 py-2 sm:px-4 sm:py-3", isScrolled ? "bg-background/98 backdrop-blur-xl shadow-sm" : "bg-background/95 backdrop-blur-sm", orientation === 'landscape' ? "h-12" : "h-14")}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 sm:gap-3">
            <MobileHamburgerButton isOpen={isOpen} onClick={toggleMenu} />
            <img src="/lovable-uploads/logoo.png" alt="OneDrip Logo" className={cn("transition-all duration-300", orientation === 'landscape' ? "h-6 w-6" : "h-7 w-7 sm:h-8 sm:w-8")} />
            <h1 className={cn("font-bold text-foreground transition-all duration-300", orientation === 'landscape' ? "text-lg" : "text-lg sm:text-xl")}>
              OneDrip
            </h1>
          </div>
          
          <NotificationIndicator size="sm" className="mr-2" />
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className={cn("flex-1 overflow-y-auto w-full relative", "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent")}>
        <div key={activeTab} className="w-full min-h-full transition-opacity duration-100">
          {children}
        </div>
      </main>
      
      <MobileHamburgerMenu isOpen={isOpen} onClose={closeMenu} onTabChange={onTabChange} menuData={menuData} onLogout={handleLogout} />
    </div>;
};
export const AdaptiveLayout = ({
  children,
  activeTab,
  onTabChange
}: AdaptiveLayoutProps) => {
  // All hooks must be called at the top, before any conditional logic
  const layoutContext = useLayout();
  const authContext = useAuth();
  const {
    isMobile,
    isTablet,
    isDesktop,
    isLandscape
  } = useResponsive();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll state for all layouts
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Proteção contra contextos não inicializados
  if (!layoutContext || !authContext) {
    return <MobileLoading message="Inicializando aplicação..." />;
  }
  const {
    navHeight,
    containerMaxWidth,
    safeArea,
    orientation,
    isUltraWide
  } = layoutContext;
  if (isDesktop) {
    return (
      <MobileMenuProvider>
        <DesktopWithMobileMenu 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
          isScrolled={isScrolled}
          navHeight={navHeight}
          safeArea={safeArea}
          isUltraWide={isUltraWide}
        >
          {children}
        </DesktopWithMobileMenu>
      </MobileMenuProvider>
    );
  }
  if (isTablet) {
    return <ResponsiveContainer className="min-h-screen bg-background" padding="none" maxWidth="full" optimized={true} breakpointBehavior={{
      tablet: isLandscape ? 'landscape-tablet-optimized' : 'portrait-tablet-optimized'
    }}>
        <TabletHeaderNav activeTab={activeTab} onTabChange={onTabChange} />
        
        <main className={cn("flex-1 overflow-y-auto w-full relative", "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent", orientation === 'landscape' ? "pb-2" : "pb-4")}>
          <ResponsiveContainer padding="adaptive" maxWidth={containerMaxWidth === 'none' ? 'full' : '2xl'} className="min-h-full" breakpointBehavior={{
          tablet: isLandscape ? 'grid-adaptive landscape-tablet-grid' : 'portrait-tablet-grid'
        }}>
            <div key={activeTab} className="w-full h-full transition-opacity duration-100">
              {children}
            </div>
          </ResponsiveContainer>
        </main>
      </ResponsiveContainer>;
  }

  // Enhanced Mobile layout
  return <ResponsiveContainer className="min-h-screen bg-background" padding="none" safeArea={true} optimized={true}>
      <MobileMenuProvider>
        <MobileLayoutContent activeTab={activeTab} onTabChange={onTabChange}>
          <ResponsiveContainer padding="adaptive" safeArea={true} className="min-h-full">
            {children}
          </ResponsiveContainer>
        </MobileLayoutContent>
      </MobileMenuProvider>
    </ResponsiveContainer>;
};