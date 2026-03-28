import React, { useEffect } from 'react';
import { X, LogOut, Search, User, ChevronRight, Home } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { AnimatePresence, motion } from 'framer-motion';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  permission?: string;
  action?: () => void;
  href?: string;
  badge?: number;
}
interface MenuData {
  items: MenuItem[];
  userInfo: {
    name: string;
    email: string;
    role: string;
  } | null;
}
interface MobileHamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  menuData: MenuData;
  onLogout: () => void;
}
export const MobileHamburgerMenu = ({
  isOpen,
  onClose,
  onTabChange,
  menuData,
  onLogout
}: MobileHamburgerMenuProps) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const navigate = useNavigate();

  // iOS-style swipe to close gesture
  useSwipeGesture({
    onSwipeLeft: () => {
      if (isOpen) {
        onClose();
      }
    },
    threshold: 50,
    preventScrollOnSwipe: true
  });

  // Handle body scroll lock when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  const handleTabChange = (item: MenuItem) => {
    onClose();
    if (item.href) {
      navigate(item.href);
    } else if (item.action) {
      item.action();
    } else {
      onTabChange(item.id);
    }
  };
  const handleLogout = () => {
    onLogout();
  };

  // Dynamic icon component resolver
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || LucideIcons.Circle;
  };

  // Filter items based on search
  const filteredItems = menuData.items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const navButtonClass = cn(
    "group relative w-full justify-start h-14 px-3.5 text-left font-medium rounded-2xl border border-transparent bg-transparent transition-all duration-200",
    "hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-soft",
    "focus-visible:border-ring/40 focus-visible:bg-card",
    "touch-manipulation ios-tap-highlight-none"
  );

  const navIconWrapClass = cn(
    "flex items-center justify-center w-9 h-9 rounded-xl bg-secondary/80 mr-3 transition-all duration-200",
    "group-hover:scale-105 group-hover:bg-primary group-hover:shadow-soft"
  );
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose} 
          />

          {/* Menu Panel */}
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed top-0 left-0 z-50 w-80 max-w-[85vw]", 
              "h-[100dvh] bg-background", 
              "border-r border-border", 
              "flex flex-col shadow-2xl", 
              "ios-momentum-scroll ios-tap-highlight-none"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-semibold text-foreground">Menu</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-secondary transition-colors touch-manipulation ios-tap-highlight-none" aria-label="Fechar menu">
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* User Profile Section */}
            {menuData.userInfo && <div className="p-4 border-b border-border">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-card border border-border">
                  <div className="relative">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {menuData.userInfo.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {menuData.userInfo.email}
                    </p>
                    <div className="flex items-center mt-0.5">
                      <div className="w-1.5 h-1.5 bg-success rounded-full mr-1.5" />
                      <span className="text-xs text-success font-medium">Online</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>}

            {/* Search Bar */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="search" inputMode="search" placeholder="Buscar menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 pr-3 py-2 bg-input border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring transition-colors ios-tap-highlight-none" />
              </div>
            </div>

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-1">
                {/* Quick Access Button */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Button variant="ghost" className={navButtonClass} onClick={() => {
                    onClose();
                    navigate('/dashboard');
                  }}>
                    <div className={navIconWrapClass}>
                      <Home className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:scale-110 group-hover:text-primary-foreground shrink-0" />
                    </div>
                    <span className="truncate text-foreground transition-colors duration-200 group-hover:text-foreground">Menu</span>
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Button>
                </motion.div>
                
                {filteredItems.map((item, index) => {
                  const IconComponent = getIconComponent(item.icon);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + (index * 0.05) }}
                    >
                      <Button variant="ghost" className={navButtonClass} onClick={() => handleTabChange(item)}>
                        <div className={navIconWrapClass}>
                          <IconComponent className="h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:scale-110 group-hover:text-primary-foreground shrink-0" />
                        </div>
                        <span className="truncate text-foreground transition-colors duration-200 group-hover:text-foreground">{item.label}</span>
                        {item.badge ? (
                          <span className="ml-auto mr-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        ) : (
                          <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </nav>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border bg-card/50">
              <Button variant="ghost" className={cn("w-full justify-start h-12 px-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors group", "touch-manipulation ios-tap-highlight-none")} onClick={handleLogout}>
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10 mr-3 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="h-4 w-4 text-destructive" />
                </div>
              <span className="font-medium text-destructive">Sair da conta</span>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};