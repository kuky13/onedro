import React, { useState, useRef } from 'react';
import { ArrowLeft, RefreshCw, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RippleButton } from '@/components/ui/animations/micro-interactions';
interface IOSContextualHeaderEnhancedProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  rightAction?: React.ReactNode;
  showSearch?: boolean;
  onSearchToggle?: () => void;
  searchActive?: boolean;
  safeAreaTop?: number;
  blur?: boolean;
  // Search functionality
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  onSearchClear?: () => void;
  searchPlaceholder?: string;
  isSearching?: boolean;
}
export const IOSContextualHeaderEnhanced = ({
  title,
  subtitle,
  showBackButton = false,
  onBack,
  onRefresh,
  isRefreshing = false,
  rightAction,
  showSearch = false,
  onSearchToggle,
  searchActive = false,
  safeAreaTop = 0,
  blur = true,
  // Search props
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  searchPlaceholder = 'Buscar...',
  isSearching = false
}: IOSContextualHeaderEnhancedProps) => {
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Handle internal search state
  const currentSearchValue = onSearchChange ? searchValue : internalSearchValue;
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalSearchValue(value);
    }
  };
  const handleSearchSubmit = () => {
    const value = currentSearchValue.trim();
    if (value && onSearchSubmit) {
      onSearchSubmit(value);
    }
  };
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };
  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange('');
    } else {
      setInternalSearchValue('');
    }
    if (onSearchClear) {
      onSearchClear();
    }
    searchInputRef.current?.focus();
  };

  // Focus input when search becomes active
  React.useEffect(() => {
    if (searchActive && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchActive]);
  return <motion.div className={cn("sticky top-0 z-30 border-b border-border/30 transition-all duration-300", blur ? "bg-background/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/60" : "bg-background")} style={{
    paddingTop: `max(${safeAreaTop}px, 12px)`
  }} initial={{
    opacity: 0,
    y: -20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3
  }}>
      {/* Main header content */}
      <div className="px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* Left Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {showBackButton && onBack && <motion.div initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }} transition={{
              duration: 0.2
            }}>
                  <RippleButton 
                    onClick={onBack} 
                    className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-muted/30 hover:bg-muted/50 active:bg-muted/70 focus:bg-muted/60 focus:ring-2 focus:ring-primary/40 border border-border/50 flex items-center justify-center touch-manipulation transition-all duration-200" 
                    variant="ghost"
                    aria-label="Voltar para a página anterior"
                    title="Voltar"
                  >
                    <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4 text-foreground" />
                  </RippleButton>
                </motion.div>}
            </AnimatePresence>
            
            <AnimatePresence mode="wait">
              {!searchActive ? <motion.div className="flex-1 min-w-0" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }} transition={{
              duration: 0.2
            }}>
                  <motion.h1 className="text-xl font-bold text-foreground truncate" layoutId="header-title">
                    {title}
                  </motion.h1>
                  {subtitle && <motion.p className="text-sm text-muted-foreground truncate" initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: 0.1
              }}>
                      {subtitle}
                    </motion.p>}
                </motion.div> : <motion.div className="flex-1" initial={{
              opacity: 0,
              scale: 0.9
            }} animate={{
              opacity: 1,
              scale: 1
            }} exit={{
              opacity: 0,
              scale: 0.9
            }} transition={{
              duration: 0.2
            }}>
                  <motion.div 
                    className="relative"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <Search className={cn(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-3.5 sm:w-3.5 transition-colors duration-200", 
                      isSearching ? "text-primary animate-pulse" : "text-muted-foreground"
                    )} />
                    <motion.input 
                       ref={searchInputRef} 
                       type="search" 
                       inputMode="search" 
                       placeholder={searchPlaceholder} 
                       value={currentSearchValue} 
                       onChange={handleSearchInputChange} 
                       onKeyPress={handleSearchKeyPress} 
                       onKeyDown={(e) => {
                         if (e.key === 'Escape') {
                           handleClearSearch();
                         }
                       }}
                       className={cn(
                         "w-full pl-10 sm:pl-9 py-3 sm:py-2 bg-muted/30 border border-border/50 rounded-2xl text-foreground placeholder-muted-foreground",
                         "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/70 focus:bg-background/60 focus:shadow-sm",
                         "hover:bg-muted/40 hover:border-border/60",
                         "transition-all duration-200 text-base sm:text-sm touch-manipulation",
                         "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-muted/30",
                         "active:bg-background/40",
                         currentSearchValue.trim() ? "pr-24 sm:pr-20" : "pr-14 sm:pr-12"
                       )} 
                       disabled={isSearching}
                       aria-label={`${searchPlaceholder}. Use Escape para limpar.`}
                       aria-describedby="search-help"
                       role="searchbox"
                       autoComplete="off"
                       spellCheck="false"
                       whileFocus={{ scale: 1.01 }}
                       transition={{ duration: 0.15 }}
                     />
                    
                    {/* Clear button - shows when there's text */}
                    <AnimatePresence>
                      {currentSearchValue.trim() && (
                        <motion.button
                         onClick={handleClearSearch}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ' ') {
                             e.preventDefault();
                             handleClearSearch();
                           }
                         }}
                         className="absolute right-12 sm:right-10 top-1/2 transform -translate-y-1/2 w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-muted hover:bg-muted/80 active:bg-muted/60 focus:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center justify-center transition-all duration-200 touch-manipulation"
                         aria-label="Limpar campo de busca (Esc)"
                         title="Limpar busca"
                         tabIndex={0}
                         whileHover={{ scale: 1.1 }}
                         whileTap={{ scale: 0.95 }}
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.8 }}
                         transition={{ duration: 0.15 }}
                       >
                          <X className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    
                    {/* Search button */}
                    
                  </motion.div>
                </motion.div>}
            </AnimatePresence>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {showSearch && <motion.div whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }}>
                <RippleButton 
                   onClick={onSearchToggle} 
                   className={cn(
                     "w-11 h-11 sm:w-10 sm:h-10 rounded-full border border-border/50 flex items-center justify-center",
                     "transition-all duration-200 touch-manipulation active:scale-95",
                     "focus:outline-none focus:ring-2 focus:ring-primary/40",
                     searchActive 
                       ? "bg-primary/20 border-primary/30 shadow-sm focus:bg-primary/25" 
                       : "bg-muted/30 hover:bg-muted/50 active:bg-muted/70 focus:bg-muted/60"
                   )} 
                   variant="ghost"
                   aria-label={searchActive ? "Fechar campo de busca" : "Abrir campo de busca"}
                   aria-pressed={searchActive}
                   title={searchActive ? "Fechar busca" : "Abrir busca"}
                 >
                  <Search className={cn(
                    "h-5 w-5 sm:h-4 sm:w-4 transition-colors duration-200", 
                    searchActive ? "text-primary" : "text-foreground"
                  )} />
                </RippleButton>
              </motion.div>}
            
            {onRefresh && <motion.div whileHover={{
            scale: 1.05
          }} whileTap={{
            scale: 0.95
          }}>
                <RippleButton 
                   onClick={onRefresh} 
                   disabled={isRefreshing} 
                   className={cn(
                     "w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-muted/30 hover:bg-muted/50 active:bg-muted/70",
                     "border border-border/50 flex items-center justify-center transition-all duration-200 touch-manipulation",
                     "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-muted/60",
                     "active:scale-95 disabled:active:scale-100",
                     isRefreshing && "opacity-75 cursor-not-allowed disabled:focus:ring-0"
                   )} 
                   variant="ghost"
                   aria-label={isRefreshing ? "Atualizando conteúdo..." : "Atualizar conteúdo da página"}
                   aria-busy={isRefreshing}
                   title={isRefreshing ? "Atualizando..." : "Atualizar"}
                 >
                  <RefreshCw className={cn(
                    "h-5 w-5 sm:h-4 sm:w-4 text-foreground transition-transform duration-200", 
                    isRefreshing && "animate-spin"
                  )} />
                </RippleButton>
              </motion.div>}
            
            {rightAction}
          </div>
        </div>
        
        {/* Hidden accessibility helper */}
        <div id="search-help" className="sr-only">
          Use o campo de busca para encontrar clientes ou dispositivos. Pressione Escape para limpar o campo.
        </div>
      </div>
      
      {/* Progress bar for loading states */}
      <AnimatePresence>
        {isRefreshing && <motion.div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20" initial={{
        scaleX: 0
      }} animate={{
        scaleX: 1
      }} exit={{
        scaleX: 0
      }} transition={{
        duration: 0.3
      }}>
            <motion.div className="h-full bg-primary rounded-full" animate={{
          x: ['-100%', '100%']
        }} transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }} />
          </motion.div>}
      </AnimatePresence>
    </motion.div>;
};