import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Filter, ChevronDown, Loader2 } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { useOptimizedSearch, useSearchHistory, useSearchKeyboardNavigation } from '../../hooks/useOptimizedSearch';
import { cn } from '../../lib/utils';
import { SearchFeedback, useSearchFeedback } from './search-feedback';

export interface OptimizedSearchProps<T> {
  data: T[];
  placeholder?: string;
  searchFields?: string[];
  onResultSelect?: (item: T) => void;
  onSearchChange?: (term: string, results: T[]) => void;
  className?: string;
  showStats?: boolean;
  showHistory?: boolean;
  showFilters?: boolean;
  maxResults?: number;
  debounceMs?: number;
  renderResult?: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  context?: 'clients' | 'devices' | 'budgets' | 'universal';
  enableSmartPlaceholder?: boolean;
}

export function OptimizedSearch<T>({
  data,
  placeholder,
  searchFields = ['name', 'title', 'description'],
  onResultSelect,
  onSearchChange,
  className,
  showStats = true,
  showHistory = true,
  showFilters = false,
  maxResults,
  debounceMs,
  renderResult,
  renderEmpty,
  renderLoading,
  context = 'universal',
  enableSmartPlaceholder = true
}: OptimizedSearchProps<T>) {
  const deviceInfo = useDeviceDetection();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  
  // Smart placeholder logic
  const getContextualPlaceholders = () => {
    switch (context) {
      case 'clients':
        return ['Buscar clientes...', 'Nome, telefone, email...', 'Digite para buscar...'];
      case 'devices':
        return ['Buscar dispositivos...', 'Modelo, marca, problema...', 'Digite para buscar...'];
      case 'budgets':
        return ['Buscar orçamentos...', 'Cliente, dispositivo, status...', 'Digite para buscar...'];
      default:
        return ['Buscar...', 'Clientes, dispositivos, orçamentos...', 'Digite para buscar...'];
    }
  };
  
  const contextualPlaceholders = getContextualPlaceholders();
  const dynamicPlaceholder = enableSmartPlaceholder && !searchTerm 
    ? contextualPlaceholders[currentPlaceholderIndex]
    : placeholder || contextualPlaceholders[0];
    
  // Rotate placeholder every 3 seconds when not focused
  useEffect(() => {
    if (!enableSmartPlaceholder || isFocused || searchTerm) return;
    
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex(prev => 
        (prev + 1) % contextualPlaceholders.length
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, [enableSmartPlaceholder, isFocused, searchTerm, contextualPlaceholders.length]);
  
  // Configurações otimizadas por dispositivo
  const searchOptions = {
    searchFields,
    maxResults: maxResults || (deviceInfo.isMobile ? 20 : 50),
    debounceMs: debounceMs || (deviceInfo.isMobile ? 400 : 300),
    fuzzySearch: false,
    sortBy: 'created_at',
    sortOrder: 'desc' as const
  };
  
  const {
    searchTerm,
    setSearchTerm,
    searchResult,
    clearSearch,
    isSearching,
    options,
    updateOptions
  } = useOptimizedSearch(data, searchOptions);
  
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();
  
  const {selectedIndex,
    isNavigating,
    startNavigation,
    stopNavigation
  } = useSearchKeyboardNavigation(searchResult.items, (item) => {
    onResultSelect?.(item);
    setIsOpen(false);
    addToHistory(searchTerm);
  });
  
  const { feedbackState, showFeedback } = useSearchFeedback();
  
  // Efeitos
  useEffect(() => {
    onSearchChange?.(searchTerm, searchResult.items);
  }, [searchTerm, searchResult.items, onSearchChange]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        stopNavigation();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stopNavigation]);
  
  // Handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(value.length > 0 || (showHistory && history.length > 0));
  }, [setSearchTerm, showHistory, history.length]);
  
  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    setIsOpen(searchTerm.length > 0 || (showHistory && history.length > 0));
    startNavigation();
  }, [searchTerm.length, showHistory, history.length, startNavigation]);
  
  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
    // Delay para permitir cliques nos resultados
    setTimeout(() => {
      if (!searchInputRef.current?.matches(':focus')) {
        stopNavigation();
      }
    }, 150);
  }, [stopNavigation]);
  
  const handleClearSearch = useCallback(() => {
    clearSearch();
    setIsOpen(false);
    searchInputRef.current?.focus();
  }, [clearSearch]);
  
  const handleHistorySelect = useCallback((term: string) => {
    setSearchTerm(term);
    setIsOpen(true);
    searchInputRef.current?.focus();
  }, [setSearchTerm]);
  
  const handleResultClick = useCallback((item: T) => {
    onResultSelect?.(item);
    addToHistory(searchTerm);
    setIsOpen(false);
  }, [onResultSelect, addToHistory, searchTerm]);
  
  // Renderização condicional
  const renderDefaultResult = (item: T, index: number, isSelected: boolean) => {
    const itemData = item as any;
    return (
      <div
        key={index}
        className={cn(
          "px-4 py-3 cursor-pointer transition-all duration-200",
          "hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm",
          isSelected && "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500",
          deviceInfo.isMobile && "py-4 text-base",
          "group relative"
        )}
        onClick={() => handleResultClick(item)}
      >
        {/* Indicador de posição */}
        <div className="absolute left-2 top-2 text-xs text-gray-400 dark:text-gray-600 font-mono">
          {index + 1}
        </div>
        
        <div className="ml-6">
          <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {itemData.client_name || itemData.name || itemData.title || 'Item'}
          </div>
          {(itemData.device_model || itemData.description) && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {itemData.device_model || itemData.description}
            </div>
          )}
          
          {/* Indicador de relevância */}
          {itemData.score && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(itemData.score * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {Math.round(itemData.score * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Seta de seleção */}
        {isSelected && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    );
  };
  
  const renderDefaultEmpty = () => (
    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <Search className="h-8 w-8 opacity-30" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <X className="h-2 w-2 text-red-500" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-medium">Nenhum resultado encontrado</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Sua busca por <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">"{searchTerm}"</span> não retornou resultados
          </p>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>Sugestões:</p>
          <ul className="list-disc list-inside space-y-0.5 text-left">
            <li>Verifique a ortografia</li>
            <li>Use termos mais gerais</li>
            <li>Tente palavras-chave diferentes</li>
          </ul>
        </div>
      </div>
    </div>
  );
  
  const renderDefaultLoading = () => (
    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <div className="absolute inset-0 h-8 w-8 border-2 border-blue-200 dark:border-blue-800 rounded-full animate-pulse" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Buscando resultados...</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Analisando {searchTerm ? `"${searchTerm}"` : 'dados'}
          </p>
        </div>
        {/* Indicador de progresso animado */}
        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-pulse" style={{ width: '70%' }} />
        </div>
      </div>
    </div>
  );
  
  // Classes CSS responsivas
  const containerClasses = cn(
    "relative w-full",
    deviceInfo.isMobile && "touch-manipulation",
    className
  );
  
  const inputClasses = cn(
    "w-full px-4 py-3 pl-10 pr-10 text-gray-900 dark:text-gray-100",
    "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
    "rounded-lg shadow-sm transition-all duration-200",
    "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
    "placeholder-gray-500 dark:placeholder-gray-400",
    deviceInfo.isMobile ? "text-base py-4" : "text-sm",
    isFocused && "ring-2 ring-blue-500 border-blue-500"
  );
  
  const resultsClasses = cn(
    "absolute z-50 w-full mt-1 bg-white dark:bg-gray-800",
    "border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg",
    "max-h-96 overflow-y-auto",
    deviceInfo.isMobile && "max-h-80"
  );
  
  return (
    <div className={containerClasses}>
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={dynamicPlaceholder}
          className={inputClasses}
          autoComplete="off"
          spellCheck="false"
        />
        
        {/* Botões de ação */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {showFilters && (
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                "hover:bg-gray-100 dark:hover:bg-gray-700",
                showAdvanced && "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
          
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search Feedback Component */}
      {showStats && searchTerm && (
        <div className="mt-2">
          <SearchFeedback
            isSearching={isSearching}
            searchStats={{
              total: searchResult.stats.total,
              filtered: searchResult.stats.filtered,
              searchTime: searchResult.stats.searchTime,
              hasResults: searchResult.items.length > 0,
              qualityIndicator: searchResult.items.length === 0 ? 'none' as const :
                               searchResult.items.length > 10 ? 'most' as const :
                               searchResult.items.length > 5 ? 'some' as const : 'few' as const,
              averageRelevance: searchResult.items.length > 0 ? 0.85 : 0
            }}
            searchTerm={searchTerm}
          />
        </div>
      )}
      
      {/* Resultados */}
      {isOpen && (
        <div ref={resultsRef} className={resultsClasses}>
          {/* Histórico de busca */}
          {showHistory && !searchTerm && history.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Buscas recentes
                </span>
                <button
                  onClick={clearHistory}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Limpar
                </button>
              </div>
              {history.slice(0, 5).map((term, index) => (
                <div
                  key={index}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                  onClick={() => handleHistorySelect(term)}
                >
                  <span className="text-gray-700 dark:text-gray-300">{term}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(term);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Resultados da busca */}
          {searchTerm && (
            <div>
              {/* Cabeçalho dos resultados com contador */}
              {!isSearching && searchResult.items.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">
                      {searchResult.items.length} resultado{searchResult.items.length !== 1 ? 's' : ''} encontrado{searchResult.items.length !== 1 ? 's' : ''}
                    </span>
                    {searchResult.stats.filtered < searchResult.stats.total && (
                      <span className="text-blue-600 dark:text-blue-400">
                        Filtrado de {searchResult.stats.total}
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Lista de resultados */}
              {isSearching ? (
                renderLoading ? renderLoading() : renderDefaultLoading()
              ) : searchResult.items.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {searchResult.items.map((item, index) => {
                    const isSelected = index === selectedIndex;
                    return renderResult 
                      ? renderResult(item, index, isSelected)
                      : renderDefaultResult(item, index, isSelected);
                  })}
                </div>
              ) : (
                renderEmpty ? renderEmpty() : renderDefaultEmpty()
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OptimizedSearch;