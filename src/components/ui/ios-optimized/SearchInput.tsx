import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X, TrendingUp, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { debounce } from 'lodash';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  onClear?: () => void;
  className?: string;
  showQuickFeedback?: boolean;
  searchResults?: Array<{ id: string; title: string; type: string; priority?: 'high' | 'medium' | 'low' }>;
  onResultClick?: (result: any) => void;
  context?: 'budgets' | 'clients' | 'general';
  recentSearches?: string[];
  onRecentSearchClick?: (search: string) => void;
  showStats?: boolean;
  totalResults?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  isLoading = false,
  onClear,
  className,
  showQuickFeedback = false,
  searchResults = [],
  onResultClick,
  context = 'general',
  recentSearches = [],
  onRecentSearchClick,
  showStats = false,
  totalResults = 0
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(placeholder || 'Pesquisar...');
  const [isIOS, setIsIOS] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  // Enhanced placeholder rotation with context awareness
  useEffect(() => {
    if (!placeholder && context) {
      const placeholders = {
        budgets: [
          'Pesquisar orçamentos...',
          'Buscar por cliente...',
          'Filtrar por status...',
          'Encontrar por valor...',
          'Buscar por data...',
          'Filtrar por categoria...'
        ],
        clients: [
          'Pesquisar clientes...',
          'Buscar por nome...',
          'Filtrar por empresa...',
          'Encontrar contato...',
          'Buscar por telefone...',
          'Filtrar por cidade...'
        ],
        general: [
          'Pesquisar...',
          'Digite sua busca...',
          'Encontrar item...',
          'Buscar conteúdo...'
        ]
      };

      const contextPlaceholders = placeholders[context];
      let index = 0;

      const interval = setInterval(() => {
        if (!isFocused && !value) {
          setCurrentPlaceholder(contextPlaceholders[index]);
          index = (index + 1) % contextPlaceholders.length;
        }
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [context, placeholder, isFocused, value]);

  // Debounced search performance tracking
  const debouncedOnChange = useCallback(
    debounce((newValue: string) => {
      if (newValue && searchStartTime) {
        const searchTime = Date.now() - searchStartTime;
        console.debug(`Search completed in ${searchTime}ms`);
      }
    }, 300),
    [searchStartTime]
  );

  const handleChange = (newValue: string) => {
    if (newValue && !searchStartTime) {
      setSearchStartTime(Date.now());
    } else if (!newValue) {
      setSearchStartTime(null);
    }
    
    onChange(newValue);
    debouncedOnChange(newValue);
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
    setSearchStartTime(null);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (placeholder) {
      setCurrentPlaceholder(placeholder);
    }
  };

  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 150); // Delay to allow clicks on results
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cn(
        'relative flex items-center transition-all duration-300',
        isFocused && 'transform scale-[1.02]'
      )}>
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className={cn(
              'h-4 w-4 transition-colors duration-200',
              isFocused ? 'text-primary' : 'text-muted-foreground'
            )} />
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'pl-10 pr-10 transition-all duration-200',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
            isFocused && 'ring-2 ring-primary/20 border-primary/50 shadow-lg',
            // iOS specific optimizations
            isIOS && [
              'text-base', // 16px font size to prevent zoom
              'safari-safe-input',
              'safari-safe-blur'
            ]
          )}
          style={{
            fontSize: isIOS ? '16px' : undefined,
            WebkitAppearance: 'none',
            touchAction: 'manipulation',
            userSelect: isIOS ? 'none' : undefined
          }}
        />
        
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className={cn(
              'absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0',
              'transition-all duration-200 hover:bg-destructive/10 hover:text-destructive',
              'focus:outline-none focus:ring-2 focus:ring-destructive/20',
              'active:scale-90'
            )}
            style={{
              touchAction: 'manipulation',
              userSelect: 'none'
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Enhanced feedback section */}
      {(showQuickFeedback || recentSearches.length > 0) && isFocused && (
        <div className={cn(
          'absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-sm',
          'border rounded-lg shadow-xl z-50 max-h-80 overflow-hidden',
          'animate-in slide-in-from-top-2 duration-200'
        )}>
          {/* Stats header */}
          {showStats && (value || totalResults > 0) && (
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-muted-foreground">
                    {totalResults} resultado{totalResults !== 1 ? 's' : ''}
                  </span>
                </div>
                {searchStartTime && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {Date.now() - searchStartTime}ms
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {searchResults.slice(0, 6).map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => onResultClick?.(result)}
                  className={cn(
                    'w-full text-left p-3 transition-all duration-150',
                    'hover:bg-muted/50 active:bg-muted/70',
                    'border-b last:border-b-0',
                    'focus:outline-none focus:bg-muted/50'
                  )}
                  style={{
                    touchAction: 'manipulation',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">{result.type}</div>
                    </div>
                    {result.priority && (
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs ml-2', getPriorityColor(result.priority))}
                      >
                        {result.priority}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {!value && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2 px-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pesquisas recentes
              </div>
              <div className="space-y-1">
                {recentSearches.slice(0, 4).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => onRecentSearchClick?.(search)}
                    className={cn(
                      'w-full text-left p-2 text-sm rounded transition-colors duration-150',
                      'hover:bg-muted/50 active:bg-muted/70',
                      'focus:outline-none focus:bg-muted/50'
                    )}
                    style={{
                      touchAction: 'manipulation',
                      userSelect: 'none'
                    }}
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}