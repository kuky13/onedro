import React from 'react';
import { MobileMenuProvider, useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { MobileHamburgerMenu } from '@/components/mobile/MobileHamburgerMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation } from 'react-router-dom';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShellContent = ({ children }: AppShellProps) => {
  const { isOpen, toggleMenu, closeMenu, menuData, handleLogout } = useMobileMenuContext();
  const isMobile = useIsMobile();
  const { pathname } = useLocation();

  // Don't show floating hamburger on /dashboard — AdaptiveLayout has its own header
  const showFloatingHamburger =
    isMobile &&
    pathname !== '/dashboard' &&
    pathname !== '/chat' &&
    pathname !== '/teste-rapido' &&
    pathname !== '/worm' &&
    !pathname.startsWith('/service-orders') &&
    !pathname.startsWith('/store/orcamentos') &&
    !pathname.startsWith('/reparos') &&
    !pathname.startsWith('/whatsapp-crm');

  return (
    <div className="min-h-screen bg-background">
      {/* Floating hamburger button - only on mobile, not on dashboard */}
      {showFloatingHamburger && (
        <div className="fixed top-3 left-3 z-40 flex items-center justify-center">
          <MobileHamburgerButton
            isOpen={isOpen}
            onClick={toggleMenu}
            className="bg-background/80 backdrop-blur-lg border border-border/50 shadow-lg"
          />
        </div>
      )}

      {/* Page content */}
      {children}

      {/* Mobile Menu Overlay */}
      <MobileHamburgerMenu
        isOpen={isOpen}
        onClose={closeMenu}
        onTabChange={() => closeMenu()}
        menuData={menuData}
        onLogout={handleLogout}
      />
    </div>
  );
};

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <MobileMenuProvider>
      <AppShellContent>{children}</AppShellContent>
    </MobileMenuProvider>
  );
};
