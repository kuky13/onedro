import React from 'react';
import { MobileMenuProvider, useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { MobileHamburgerButton } from '@/components/mobile/MobileHamburgerButton';
import { MobileHamburgerMenu } from '@/components/mobile/MobileHamburgerMenu';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppShellProps {
  children: React.ReactNode;
}

const AppShellContent = ({ children }: AppShellProps) => {
  const { isOpen, toggleMenu, closeMenu, menuData, handleLogout } = useMobileMenuContext();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      {/* Floating hamburger button - only on mobile, fixed position */}
      {isMobile &&
      <div className="fixed top-3 left-3 z-40">
          



        
        </div>
      }

      {/* Page content */}
      {children}

      {/* Mobile Menu Overlay */}
      <MobileHamburgerMenu
        isOpen={isOpen}
        onClose={closeMenu}
        onTabChange={() => closeMenu()}
        menuData={menuData}
        onLogout={handleLogout} />
      
    </div>);

};

export const AppShell = ({ children }: AppShellProps) => {
  return (
    <MobileMenuProvider>
      <AppShellContent>{children}</AppShellContent>
    </MobileMenuProvider>);

};