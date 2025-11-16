import React, { useState, useCallback, useMemo } from 'react';
import { WormBudgetCard } from './WormBudgetCard';
import { WormBudgetSearch } from './WormBudgetSearch';
import { WormBudgetForm } from './WormBudgetForm';
import { useWormBudgets } from '@/hooks/worm/useWormBudgets';
import { useWormActions } from '@/hooks/worm/useWormActions';
import { Plus, Trash, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
interface WormBudgetListProps {
  userId: string;
}
export const WormBudgetList = ({
  userId
}: WormBudgetListProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [isNewBudgetOpen, setIsNewBudgetOpen] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const {
    data: budgets = [],
    isLoading,
    error,
    refetch
  } = useWormBudgets(userId, {
    search: activeSearchTerm
  });
  const {
    handleDelete,
    handleWhatsAppShare,
    isDeleting
  } = useWormActions();

  // Filtrar orçamentos baseado na pesquisa ativa
  const filteredBudgets = useMemo(() => {
    // Use AI results if available
    if (aiResults.length > 0) return aiResults;
    
    if (!activeSearchTerm.trim()) return budgets;
    const searchLower = activeSearchTerm.toLowerCase();
    return budgets.filter(budget => budget.client_name?.toLowerCase().includes(searchLower) || budget.device_model?.toLowerCase().includes(searchLower) || budget.device_type?.toLowerCase().includes(searchLower) || budget.sequential_number?.toString().padStart(4, '0').includes(activeSearchTerm) || budget.sequential_number?.toString().includes(activeSearchTerm));
  }, [budgets, activeSearchTerm, aiResults]);
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setActiveSearchTerm(term);
  };
  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveSearchTerm('');
  };
  const handleBudgetCreated = useCallback(() => {
    setIsNewBudgetOpen(false);
    refetch();
  }, [refetch]);
  const handleBudgetDeleted = useCallback(async (budgetId: string) => {
    await handleDelete(budgetId);
    refetch();
  }, [handleDelete, refetch]);
  if (isLoading) {
    return <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Orçamentos</h2>
          <div className="flex space-x-2">
            <Button disabled>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="p-6 bg-card rounded-lg border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>)}
        </div>
      </div>;
  }
  if (error) {
    return <div className="text-center py-12">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-destructive mb-2">Erro ao carregar orçamentos</h3>
        <p className="text-muted-foreground mb-4">
          {typeof error === 'string' ? error : 'Erro inesperado'}
        </p>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Orçamentos</h2>
          <p className="text-sm text-muted-foreground">
            {filteredBudgets.length} orçamento(s) encontrado(s)
          </p>
          
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/worm/lixeira')}>
            <Trash className="h-4 w-4 mr-2" />
            Lixeira
          </Button>
          
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Sheet open={isNewBudgetOpen} onOpenChange={setIsNewBudgetOpen}>
            <SheetTrigger asChild>
              <Button onClick={() => navigate('/worm')}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <WormBudgetForm onSuccess={handleBudgetCreated} onCancel={() => setIsNewBudgetOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Busca */}
      <WormBudgetSearch searchTerm={searchTerm} onSearch={handleSearch} onClearSearch={handleClearSearch} />

      {/* Lista de orçamentos */}
      {filteredBudgets.length === 0 ? <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium mb-2">
            {aiResults.length > 0 ? 'Nenhum resultado da IA encontrado' : 
             activeSearchTerm ? 'Nenhum resultado encontrado' : 'Nenhum orçamento'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {aiResults.length > 0 ? 'Tente um comando diferente ou use a busca tradicional' :
             activeSearchTerm ? 'Tente ajustar sua busca ou criar um novo orçamento' : 
             'Comece criando seu primeiro orçamento'}
          </p>
          {(activeSearchTerm || aiResults.length > 0) && <Button variant="outline" onClick={handleClearSearch}>
              Limpar busca
            </Button>}
        </div> : <div className="space-y-4">
          {filteredBudgets.map(budget => <WormBudgetCard key={budget.id} budget={budget} onDelete={handleBudgetDeleted} onWhatsAppShare={handleWhatsAppShare} onUpdate={refetch} isDeleting={isDeleting === budget.id} />)}
        </div>}
    </div>;
};