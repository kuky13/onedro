import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Sparkles } from 'lucide-react';

interface BudgetLiteSearchiOSProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  isFiltered?: boolean;
}

export const BudgetLiteSearchiOS = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  showFilters = false,
  onToggleFilters,
  isFiltered = false
}: BudgetLiteSearchiOSProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    "Buscar cliente ou dispositivo...",
    "Encontrar orçamento...",
    "Pesquisar por serviço...",
    "Filtrar por status..."
  ];

  // Rotação automática do placeholder quando não está focado
  useEffect(() => {
    if (!isFocused && !searchTerm) {
      const interval = setInterval(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isFocused, searchTerm, placeholders.length]);

  return (
    <div className="relative group">
      {/* Container principal com gradiente dourado */}
      <div className={`
        relative flex items-center overflow-hidden
        bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50
        dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20
        border border-amber-200/60 dark:border-amber-800/40
        rounded-2xl transition-all duration-300 ease-out
        ${isFocused 
          ? 'shadow-lg shadow-amber-200/40 dark:shadow-amber-900/20 ring-2 ring-amber-300/50 dark:ring-amber-600/30 scale-[1.02]' 
          : 'shadow-md shadow-amber-100/30 dark:shadow-amber-900/10 hover:shadow-lg hover:shadow-amber-200/40'
        }
      `}>
        
        {/* Efeito de brilho animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
        
        {/* Ícone de busca */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
          <div className={`
            relative p-1 rounded-full transition-all duration-200
            ${isFocused 
              ? 'bg-amber-200/50 dark:bg-amber-800/30' 
              : 'group-hover:bg-amber-100/30 dark:group-hover:bg-amber-900/20'
            }
          `}>
            <Search className={`
              h-5 w-5 transition-all duration-200
              ${isFocused 
                ? 'text-amber-600 dark:text-amber-400 scale-110' 
                : 'text-amber-500/70 dark:text-amber-400/70 group-hover:text-amber-600 dark:group-hover:text-amber-400'
              }
            `} />
            {!searchTerm && !isFocused && (
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Campo de input */}
        <input
          type="search"
          inputMode="search"
          placeholder={placeholders[placeholderIndex]}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full pl-16 pr-20 py-4 
            bg-transparent text-gray-800 dark:text-gray-100
            placeholder-amber-600/60 dark:placeholder-amber-400/60
            focus:outline-none transition-all duration-200
            font-medium text-base
          `}
          style={{ 
            fontSize: '16px', // Previne zoom no iOS
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        />

        {/* Botões à direita */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          
          {/* Botão de filtros */}
          {showFilters && (
            <button
              onClick={onToggleFilters}
              className={`
                relative p-2 rounded-xl transition-all duration-200
                ${isFiltered 
                  ? 'bg-amber-500 text-white shadow-md' 
                  : 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-800/40'
                }
                active:scale-95
              `}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Filter className="h-4 w-4" />
              {isFiltered && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </button>
          )}

          {/* Botão de limpar */}
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className={`
                p-2 rounded-xl transition-all duration-200
                bg-amber-100/50 dark:bg-amber-900/30 
                text-amber-600 dark:text-amber-400
                hover:bg-red-100/70 dark:hover:bg-red-900/30
                hover:text-red-600 dark:hover:text-red-400
                active:scale-90
              `}
              style={{
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Indicador de busca ativa */}
      {searchTerm && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};