import React from 'react';
import { Search, Loader2, CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchFeedbackProps {
  isSearching: boolean;
  searchStats?: {
    total?: number;
    filtered?: number;
    searchTime?: number;
    averageRelevance?: number;
    qualityIndicator?: 'none' | 'few' | 'some' | 'most' | 'all';
    hasResults?: boolean;
  };
  searchTerm: string;
  className?: string;
}

interface SearchProgressProps {
  isSearching: boolean;
  progress?: number;
  className?: string;
}

interface SearchStatsDisplayProps {
  stats: {
    total?: number;
    filtered?: number;
    searchTime?: number;
    averageRelevance?: number;
    qualityIndicator?: 'none' | 'few' | 'some' | 'most' | 'all';
  };
  searchTerm: string;
  className?: string;
}

// Componente de progresso de pesquisa
export const SearchProgress: React.FC<SearchProgressProps> = ({
  isSearching,
  progress = 0,
  className
}) => {
  if (!isSearching) return null;

  return (
    <div className={cn('w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 overflow-hidden', className)}>
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
        style={{ 
          width: `${Math.min(progress, 100)}%`,
          animation: isSearching ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }}
      />
    </div>
  );
};

// Componente de exibição de estatísticas
export const SearchStatsDisplay: React.FC<SearchStatsDisplayProps> = ({
  stats,
  searchTerm,
  className
}) => {
  const { total = 0, filtered = 0, searchTime = 0, averageRelevance = 0, qualityIndicator = 'none' } = stats;
  
  const getQualityColor = (indicator: string) => {
    switch (indicator) {
      case 'all': return 'text-green-600 dark:text-green-400';
      case 'most': return 'text-blue-600 dark:text-blue-400';
      case 'some': return 'text-yellow-600 dark:text-yellow-400';
      case 'few': return 'text-orange-600 dark:text-orange-400';
      case 'none': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const getQualityIcon = (indicator: string) => {
    switch (indicator) {
      case 'all':
      case 'most': return <CheckCircle className="w-3 h-3" />;
      case 'some': return <TrendingUp className="w-3 h-3" />;
      case 'few':
      case 'none': return <AlertCircle className="w-3 h-3" />;
      default: return <Search className="w-3 h-3" />;
    }
  };
  
  const getQualityText = (indicator: string) => {
    switch (indicator) {
      case 'all': return 'Todos os resultados';
      case 'most': return 'Maioria dos resultados';
      case 'some': return 'Alguns resultados';
      case 'few': return 'Poucos resultados';
      case 'none': return 'Nenhum resultado';
      default: return 'Pesquisando...';
    }
  };

  if (!searchTerm.trim()) return null;

  return (
    <div className={cn('flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="font-medium">{filtered}</span>
          <span>de</span>
          <span className="font-medium">{total}</span>
          <span>resultados</span>
        </div>
        
        {searchTime > 0 && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{searchTime.toFixed(1)}ms</span>
          </div>
        )}
      </div>
      
      <div className={cn('flex items-center gap-1', getQualityColor(qualityIndicator))}>
        {getQualityIcon(qualityIndicator)}
        <span className="font-medium">{getQualityText(qualityIndicator)}</span>
        {averageRelevance > 0 && (
          <span className="ml-1 text-gray-500 dark:text-gray-500">
            ({Math.round(averageRelevance * 100)}%)
          </span>
        )}
      </div>
    </div>
  );
};

// Componente principal de feedback
export const SearchFeedback: React.FC<SearchFeedbackProps> = ({
  isSearching,
  searchStats,
  searchTerm,
  className
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Barra de progresso durante a pesquisa */}
      <SearchProgress 
        isSearching={isSearching}
        progress={isSearching ? 75 : 100}
      />
      
      {/* Estatísticas da pesquisa */}
      {searchStats && (
        <SearchStatsDisplay 
          stats={searchStats}
          searchTerm={searchTerm}
        />
      )}
      
      {/* Indicador de pesquisa ativa */}
      {isSearching && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Pesquisando...</span>
        </div>
      )}
    </div>
  );
};

// Hook para gerenciar feedback de pesquisa
export const useSearchFeedback = () => {
  const [feedbackState, setFeedbackState] = React.useState({
    isVisible: false,
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error'
  });
  
  const showFeedback = React.useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', duration = 3000) => {
    setFeedbackState({ isVisible: true, message, type });
    
    if (duration > 0) {
      setTimeout(() => {
        setFeedbackState(prev => ({ ...prev, isVisible: false }));
      }, duration);
    }
  }, []);
  
  const hideFeedback = React.useCallback(() => {
    setFeedbackState(prev => ({ ...prev, isVisible: false }));
  }, []);
  
  return {
    feedbackState,
    showFeedback,
    hideFeedback
  };
};

export default SearchFeedback;