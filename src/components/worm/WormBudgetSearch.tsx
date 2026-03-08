import React, { useState } from 'react';
import { Search, X, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import drippyAvatar from '@/assets/drippy-avatar.png';

interface WormBudgetSearchProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onClearSearch: () => void;
  onAiResults?: (ids: string[], message: string) => void;
}

export const WormBudgetSearch = ({ 
  searchTerm, 
  onSearch, 
  onClearSearch,
  onAiResults,
}: WormBudgetSearchProps) => {
  const [inputValue, setInputValue] = React.useState(searchTerm);
  const [isAiMode, setIsAiMode] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const { showError } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (isAiMode && user?.id) {
      setIsAiLoading(true);
      setAiMessage(null);
      try {
        const { data, error } = await supabase.functions.invoke('worm-ai-search', {
          body: { query: trimmed, user_id: user.id },
        });

        if (error) throw error;

        const message = data?.message || 'Busca concluída.';
        const matchedIds: string[] = data?.matched_ids || [];
        
        setAiMessage(message);
        onAiResults?.(matchedIds, message);
      } catch (err: any) {
        console.error('AI search error:', err);
        showError({ title: 'Erro na busca IA', description: 'Tentando busca normal...' });
        // Fallback to normal search
        onSearch(trimmed);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      onSearch(trimmed);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setAiMessage(null);
    onClearSearch();
  };

  const toggleMode = () => {
    setIsAiMode(!isAiMode);
    setAiMessage(null);
  };

  return (
    <div className="flex-1 space-y-2">
      <form onSubmit={handleSubmit} className="relative flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={isAiMode ? 'Pergunte à Drippy: "orçamentos do João", "mais caros"...' : 'Buscar por cliente, modelo, OR, peça...'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-10 pr-9 bg-background/50 rounded-xl"
            disabled={isAiLoading}
          />
          {inputValue && !isAiLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* AI mode toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className={`shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center transition-all ${
            isAiMode 
              ? 'bg-primary/10 border-primary/30 text-primary' 
              : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/50'
          }`}
          title={isAiMode ? 'Filtro IA ativo' : 'Ativar filtro IA'}
        >
          <Sparkles className="h-4 w-4" />
        </button>

        {/* Submit */}
        <button
          type="submit"
          disabled={isAiLoading || !inputValue.trim()}
          className={`shrink-0 px-4 h-10 rounded-xl text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50 ${
            isAiMode
              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-md hover:shadow-lg hover:opacity-90'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-md'
          }`}
        >
          {isAiLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{isAiMode ? 'Drippy' : 'Buscar'}</span>
        </button>
      </form>

      {/* AI Response */}
      <AnimatePresence>
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5">
              <img
                src={drippyAvatar}
                alt="Drippy"
                className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">{aiMessage}</p>
              </div>
              <button
                onClick={handleClear}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
