import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface WormBudgetSearchProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  onClearSearch: () => void;
}

export const WormBudgetSearch = ({ 
  searchTerm, 
  onSearch, 
  onClearSearch 
}: WormBudgetSearchProps) => {
  const [inputValue, setInputValue] = React.useState(searchTerm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    onClearSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por cliente, modelo, OR, peça, serviço..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-10 pr-9 bg-background/50"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <Button 
        type="submit" 
        size="sm" 
        className="shrink-0 px-5 gap-2 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-300"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar</span>
      </Button>
    </form>
  );
};
