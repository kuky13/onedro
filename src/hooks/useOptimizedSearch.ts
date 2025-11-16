import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDeviceDetection } from './useDeviceDetection';
import { highlightObjectFields, calculateRelevanceScore, createSearchSnippet } from '@/utils/search-highlighting';

export interface SearchOptions {
  debounceMs?: number;
  minSearchLength?: number;
  maxResults?: number;
  caseSensitive?: boolean;
  fuzzySearch?: boolean;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchStats {
  total: number;
  filtered: number;
  percentage: number;
  hasResults: boolean;
  searchTime: number;
  lastSearchTerm: string;
}

export interface SearchResult<T> {
  items: T[];
  stats: SearchStats;
  isLoading: boolean;
  error: string | null;
}

// Hook para debounce otimizado
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
};

// Função de busca fuzzy simples
const fuzzyMatch = (text: string, pattern: string): boolean => {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  let textIndex = 0;
  let patternIndex = 0;
  
  while (textIndex < textLower.length && patternIndex < patternLower.length) {
    if (textLower[textIndex] === patternLower[patternIndex]) {
      patternIndex++;
    }
    textIndex++;
  }
  
  return patternIndex === patternLower.length;
};

// Função de normalização de texto para busca
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
};

// Função de busca otimizada
const performSearch = <T>(
  items: T[],
  searchTerm: string,
  options: SearchOptions
): { results: T[]; searchTime: number } => {
  const startTime = performance.now();
  
  if (!searchTerm || searchTerm.length < (options.minSearchLength || 1)) {
    return { results: items, searchTime: 0 };
  }

  const normalizedSearchTerm = normalizeText(searchTerm);
  const searchFields = options.searchFields || ['name', 'title', 'description'];
  
  const results = items.filter((item) => {
    return searchFields.some((field) => {
      const fieldValue = (item as any)[field];
      if (!fieldValue) return false;
      
      const normalizedFieldValue = normalizeText(String(fieldValue));
      
      if (options.fuzzySearch) {
        return fuzzyMatch(normalizedFieldValue, normalizedSearchTerm);
      } else {
        return normalizedFieldValue.includes(normalizedSearchTerm);
      }
    });
  });

  // Aplicar limite de resultados se especificado
  const limitedResults = options.maxResults 
    ? results.slice(0, options.maxResults)
    : results;

  // Ordenação se especificada
  if (options.sortBy) {
    limitedResults.sort((a, b) => {
      const aValue = (a as any)[options.sortBy!];
      const bValue = (b as any)[options.sortBy!];
      
      if (options.sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });
  }

  const endTime = performance.now();
  return { results: limitedResults, searchTime: endTime - startTime };
};

export const useOptimizedSearch = <T>(
  items: T[],
  initialOptions: SearchOptions = {}
): {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResult: SearchResult<T>;
  clearSearch: () => void;
  isSearching: boolean;
  options: SearchOptions;
  updateOptions: (newOptions: Partial<SearchOptions>) => void;
} => {
  const deviceInfo = useDeviceDetection();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<SearchOptions>({
    debounceMs: deviceInfo.isMobile ? 400 : 300, // Maior debounce em mobile
    minSearchLength: 1,
    maxResults: deviceInfo.isMobile ? 50 : 100, // Menos resultados em mobile
    caseSensitive: false,
    fuzzySearch: false,
    searchFields: ['client_name', 'device_model', 'issue', 'description'],
    sortBy: 'created_at',
    sortOrder: 'desc',
    ...initialOptions
  });

  // Debounce do termo de busca
  const debouncedSearchTerm = useDebounce(searchTerm, options.debounceMs || 300);

  // Enhanced search statistics with performance metrics
  const [searchStats, setSearchStats] = useState({
    totalItems: 0,
    filteredItems: 0,
    searchTime: 0,
    averageScore: 0,
    hasResults: false,
    qualityIndicator: 'none' as 'none' | 'few' | 'some' | 'most' | 'all'
  });
  
  // Update basic stats when items or query change
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      setSearchStats({
        totalItems: items.length,
        filteredItems: items.length,
        searchTime: 0,
        averageScore: 0,
        hasResults: items.length > 0,
        qualityIndicator: 'all'
      });
    }
  }, [items.length, debouncedSearchTerm]);

  // Resultado da busca memoizado
  const searchResult = useMemo<SearchResult<T>>(() => {
    setIsSearching(true);
    setError(null);

    try {
      if (!debouncedSearchTerm.trim()) {
        setIsSearching(false);
        setError(null);
        return {
          items,
          stats: {
            total: items.length,
            filtered: items.length,
            percentage: 100,
            hasResults: items.length > 0,
            searchTime: 0,
            lastSearchTerm: debouncedSearchTerm
          },
          isLoading: false,
          error: null
        };
      }

      const startTime = performance.now();
      const searchFields = options.searchFields || ['client_name', 'device_model', 'issue', 'description'];
      
      const results = items
        .map(item => {
          try {
            let totalScore = 0;
            const matchedFields: string[] = [];
            
            // Calculate relevance score for each field
            searchFields.forEach(field => {
              const fieldValue = (item as any)[field];
              if (fieldValue) {
                const fieldScore = calculateRelevanceScore(
                  fieldValue,
                  debouncedSearchTerm,
                  { 
                    fieldWeight: 1.0,
                    positionWeight: true,
                    exactMatchBonus: true
                  }
                );
                
                if (fieldScore > 0) {
                  totalScore += fieldScore;
                  matchedFields.push(field);
                }
              }
            });
            
            if (totalScore === 0) return null;
            
            // Add highlighting to matched fields
            const highlightedItem = highlightObjectFields(
              item,
              debouncedSearchTerm,
              searchFields,
              {
                highlightClass: 'bg-yellow-200 dark:bg-yellow-800/50 px-1 rounded font-medium text-yellow-900 dark:text-yellow-100'
              }
            );
            
            // Create search snippets for long text fields
            const snippets: Record<string, string> = {};
            searchFields.forEach(field => {
              const fieldValue = (item as any)[field];
              if (fieldValue && typeof fieldValue === 'string' && fieldValue.length > 100) {
                snippets[field] = createSearchSnippet(fieldValue, debouncedSearchTerm, 120);
              }
            });
            
            return {
              ...highlightedItem,
              _score: Math.min(totalScore, 1), // Normalize to 0-1
              _matchedFields: matchedFields,
              _searchMeta: {
                score: Math.min(totalScore, 1),
                snippets,
                matchedFields
              }
            };
          } catch (error) {
            console.warn('Search item processing error:', error);
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => ((b as any)?._score || 0) - ((a as any)?._score || 0))
        .slice(0, options.maxResults || 100);

      const endTime = performance.now();
      const searchTime = endTime - startTime;
      
      // Update search statistics with performance metrics
      setSearchStats({
        totalItems: items.length,
        filteredItems: results.length,
        searchTime,
        averageScore: results.length > 0 
          ? results.reduce((sum, item) => sum + ((item as any)._score || 0), 0) / results.length
          : 0,
        hasResults: results.length > 0,
        qualityIndicator: results.length === 0 ? 'none' :
                         results.length === items.length ? 'all' :
                         results.length > items.length * 0.7 ? 'most' :
                         results.length > items.length * 0.3 ? 'some' : 'few'
      });
      
      const stats: SearchStats = {
        total: items.length,
        filtered: results.length,
        percentage: items.length > 0 ? Math.round((results.length / items.length) * 100) : 0,
        hasResults: results.length > 0,
        searchTime,
        lastSearchTerm: debouncedSearchTerm
      };

      return {
        items: results,
        stats,
        isLoading: false,
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na busca';
      setError(errorMessage);
      
      return {
        items: [],
        stats: {
          total: items.length,
          filtered: 0,
          percentage: 0,
          hasResults: false,
          searchTime: 0,
          lastSearchTerm: debouncedSearchTerm
        },
        isLoading: false,
        error: errorMessage
      };
    } finally {
      // Delay para mostrar loading em dispositivos rápidos
      setTimeout(() => setIsSearching(false), deviceInfo.isMobile ? 200 : 100);
    }
  }, [items, debouncedSearchTerm, options, deviceInfo.isMobile]);

  // Função para limpar busca
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setError(null);
  }, []);

  // Função para atualizar opções
  const updateOptions = useCallback((newOptions: Partial<SearchOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Atualizar opções baseado no dispositivo
  useEffect(() => {
    setOptions(prev => ({
      ...prev,
      debounceMs: deviceInfo.isMobile ? 400 : 300,
      maxResults: deviceInfo.isMobile ? 50 : 100
    }));
  }, [deviceInfo.isMobile]);

  // Helper functions for accessing search metadata
  const getHighlightedText = useCallback((item: any, field: string) => {
    return item._highlighted?.[field] || (item as any)[field] || '';
  }, []);
  
  const getSearchSnippet = useCallback((item: any, field: string) => {
    return item._searchMeta?.snippets?.[field] || (item as any)[field] || '';
  }, []);
  
  const getRelevanceScore = useCallback((item: any) => {
    return item._searchMeta?.score || item._score || 0;
  }, []);
  
  const getMatchedFields = useCallback((item: any) => {
    return item._searchMeta?.matchedFields || item._matchedFields || [];
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    searchResult,
    clearSearch,
    isSearching,
    options,
    updateOptions,
    // New highlighting and relevance helpers
    getHighlightedText,
    getSearchSnippet,
    getRelevanceScore,
    getMatchedFields,
    isFiltered: !!searchTerm.trim()
  };
};

// Hook para navegação por teclado na busca
export const useSearchKeyboardNavigation = (
  results: any[],
  onSelect: (item: any) => void
) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isNavigating || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          onSelect(results[selectedIndex]);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsNavigating(false);
        setSelectedIndex(-1);
        break;
    }
  }, [results, selectedIndex, isNavigating, onSelect]);

  useEffect(() => {
    if (isNavigating) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isNavigating]);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    setSelectedIndex(-1);
  }, []);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setSelectedIndex(-1);
  }, []);

  return {
    selectedIndex,
    isNavigating,
    startNavigation,
    stopNavigation
  };
};

// Hook para histórico de busca
export const useSearchHistory = (maxItems: number = 10) => {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('search-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((term: string) => {
    if (!term.trim() || term.length < 2) return;
    
    setHistory(prev => {
      const filtered = prev.filter(item => item !== term);
      const newHistory = [term, ...filtered].slice(0, maxItems);
      
      try {
        localStorage.setItem('search-history', JSON.stringify(newHistory));
      } catch {
        // Ignore localStorage errors
      }
      
      return newHistory;
    });
  }, [maxItems]);

  const removeFromHistory = useCallback((term: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item !== term);
      
      try {
        localStorage.setItem('search-history', JSON.stringify(newHistory));
      } catch {
        // Ignore localStorage errors
      }
      
      return newHistory;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('search-history');
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory
  };
};

export default useOptimizedSearch;