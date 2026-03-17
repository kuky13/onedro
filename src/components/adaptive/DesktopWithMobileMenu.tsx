import React from 'react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { NotificationIndicator } from '@/components/NotificationIndicator';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { MobileHamburgerMenu } from '@/components/mobile/MobileHamburgerMenu';
import { useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
interface DesktopWithMobileMenuProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isScrolled: boolean;
  navHeight: string;
  safeArea: boolean;
  isUltraWide: boolean;
}
export const DesktopWithMobileMenu = ({
  children,
  activeTab,
  onTabChange,
  isScrolled,
  navHeight,
  safeArea,
  isUltraWide
}: DesktopWithMobileMenuProps) => {
  const {
    isOpen,
    toggleMenu,
    closeMenu,
    menuData,
    handleLogout
  } = useMobileMenuContext();
  return <ResponsiveContainer className={cn("min-h-screen bg-background", "desktop-horizontal-layout",
  // Global desktop class
  safeArea && "safe-area-inset", isUltraWide && "max-w-screen-2xl")} padding="none" maxWidth="full" optimized={true}>
      <div className={cn("w-full flex flex-col desktop-main-container", "gap-0 overflow-hidden transition-opacity duration-75")}>
        <header className={cn("flex shrink-0 items-center justify-between border-b sticky top-0 z-40 transition-all duration-100", "desktop-header px-8 py-4 h-20",
      // Enhanced desktop header with consistent height
      "bg-background/98 border-border/50", navHeight, isScrolled ? "shadow-lg bg-background/99" : "shadow-sm bg-background/95")}>
          <ResponsiveContainer className="flex items-center gap-4 w-full" padding="none" maxWidth="full">
            <div className="flex items-center gap-6 transition-opacity duration-75">
              <MobileHamburgerButton isOpen={isOpen} onClick={toggleMenu} />
              <img src="/lovable-uploads/logoo.png" alt="OneDrip" className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                OneDrip
              </h1>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-4 transition-opacity duration-75">
              <NotificationIndicator size="default" className="mr-2" />
              <div className={cn("flex items-center gap-2 px-4 py-2", "bg-primary/10 text-primary rounded-full", "border border-primary/20 shadow-sm", "hover:bg-primary/15 hover:border-primary/50", "transition-all duration-100")}>
                <div>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="font-semibold text-sm tracking-wide">Beba Àgua</span>
              </div>
            </div>
          </ResponsiveContainer>
        </header>
        
        <main className={cn("flex-1 overflow-y-auto overflow-x-hidden transition-all duration-100", "desktop-main-content bg-muted/20 scroll-smooth",
      // Enhanced desktop main content
      "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent")}>
          <ResponsiveContainer className={cn("desktop-content-wrapper", "px-8 py-8 min-h-full")} padding="lg" maxWidth="full">
            <div key={activeTab} className="w-full min-h-full flex flex-col transition-opacity duration-100">
              {children}
            </div>
          </ResponsiveContainer>
        </main>
        
        <MobileHamburgerMenu isOpen={isOpen} onClose={closeMenu} onTabChange={onTabChange} menuData={menuData} onLogout={handleLogout} />
      </div>
    </ResponsiveContainer>;
};