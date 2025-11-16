import React, { useState } from 'react';
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
  const [inputValue, setInputValue] = useState(searchTerm);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue('');
    onClearSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(inputValue.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por cliente, dispositivo, modelo ou código (ex: 38, 0038)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-9 pr-9"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <Button type="submit" variant="outline">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};