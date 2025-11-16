import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { BudgetPart, useBudgetParts, useAddBudgetPart, useUpdateBudgetPart, useDeleteBudgetPart } from '@/hooks/worm/useBudgetParts';
import { BudgetPartItem } from './BudgetPartItem';
import { toast } from 'sonner';
interface BudgetPartsSectionProps {
  budgetId?: string;
  onTotalChange?: (total: number, cashTotal?: number, installmentTotal?: number) => void;
}
export const BudgetPartsSection = ({
  budgetId,
  onTotalChange
}: BudgetPartsSectionProps) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [localParts, setLocalParts] = useState<BudgetPart[]>([]);
  const {
    data: parts = [],
    isLoading
  } = useBudgetParts(budgetId);
  const addPart = useAddBudgetPart();
  const updatePart = useUpdateBudgetPart();
  const deletePart = useDeleteBudgetPart();
  const newPart: BudgetPart = {
    name: '',
    part_type: '',
    quantity: 1,
    price: 0,
    warranty_months: undefined,
    budget_id: budgetId
  };
  const calculateTotals = (currentParts: BudgetPart[]) => {
    const total = currentParts.reduce((sum, p) => sum + p.price * p.quantity, 0);
    const cashTotal = currentParts.reduce((sum, p) => sum + (p.cash_price || p.price) * p.quantity, 0);
    const installmentTotal = currentParts.reduce((sum, p) => sum + (p.installment_price || p.price) * p.quantity, 0);
    onTotalChange?.(total, cashTotal, installmentTotal);
  };
  React.useEffect(() => {
    const allParts = budgetId ? parts : localParts;
    if (allParts.length > 0) {
      const mappedParts = allParts.map(p => ({
        ...p,
        price: budgetId ? p.price / 100 : p.price,
        cash_price: p.cash_price ? budgetId ? p.cash_price / 100 : p.cash_price : undefined,
        installment_price: p.installment_price ? budgetId ? p.installment_price / 100 : p.installment_price : undefined
      }));
      calculateTotals(mappedParts);
    }
  }, [parts, localParts, budgetId]);
  const handleAddPart = async (part: BudgetPart) => {
    // Impedir adicionar mais de 4 serviços/peças por orçamento
    const currentCount = budgetId ? parts.length : localParts.length;
    if (currentCount >= 4) {
      toast.error('Limite de 4 serviços/peças por orçamento atingido');
      setIsAddingNew(false);
      return;
    }
    if (!part.part_type) {
      toast.error('Preencha qualidade/tipo');
      return;
    }
    if (!part.warranty_months || part.warranty_months <= 1) {
      toast.error('Informe garantia maior que 1 mês');
      return;
    }
    try {
      if (budgetId) {
        await addPart.mutateAsync({
          ...part,
          name: part.part_type,
          budget_id: budgetId
        });
      } else {
        setLocalParts([...localParts, {
          ...part,
          id: `temp-${Date.now()}`,
          name: part.part_type
        }]);
        toast.success('Serviço/peça adicionado');
      }
      setIsAddingNew(false);
    } catch (error: any) {
      const message = error?.message || 'Erro ao adicionar serviço/peça';
      toast.error(message);
      console.error('Erro ao adicionar serviço/peça:', error);
    }
  };
  const handleUpdatePart = async (part: BudgetPart) => {
    if (!part.part_type) {
      toast.error('Preencha qualidade/tipo');
      return;
    }
    try {
      if (budgetId) {
        await updatePart.mutateAsync({
          ...part,
          name: part.part_type
        });
      } else {
        setLocalParts(localParts.map(p => p.id === part.id ? {
          ...part,
          name: part.part_type
        } : p));
        toast.success('Serviço/peça atualizado');
      }
    } catch (error: any) {
      const message = error?.message || 'Erro ao atualizar serviço/peça';
      toast.error(message);
      console.error('Erro ao atualizar serviço/peça:', error);
    }
  };
  const handleDeletePart = async (id: string) => {
    try {
      if (budgetId) {
        await deletePart.mutateAsync({
          id,
          budgetId
        });
      } else {
        setLocalParts(localParts.filter(p => p.id !== id));
        toast.success('Serviço/peça removido');
      }
    } catch (error: any) {
      const message = error?.message || 'Erro ao remover serviço/peça';
      toast.error(message);
      console.error('Erro ao remover serviço/peça:', error);
    }
  };
  const allParts = budgetId ? parts : localParts;
  const displayParts = allParts.map(p => ({
    ...p,
    price: budgetId ? p.price / 100 : p.price,
    cash_price: p.cash_price ? budgetId ? p.cash_price / 100 : p.cash_price : undefined,
    installment_price: p.installment_price ? budgetId ? p.installment_price / 100 : p.installment_price : undefined
  }));
  const total = displayParts.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const cashTotal = displayParts.reduce((sum, p) => sum + (p.cash_price || p.price) * p.quantity, 0);
  const installmentTotal = displayParts.reduce((sum, p) => sum + (p.installment_price || p.price) * p.quantity, 0);
  return <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3 px-3 sm:px-6 sm:pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
            </div>
            Qualidade / Peças ({displayParts.length}/4)
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => {
          if (displayParts.length >= 4) {
            toast.error('Limite de 4 serviços/peças por orçamento atingido');
            return;
          }
          setIsAddingNew(true);
        }} disabled={!budgetId || isAddingNew || displayParts.length >= 4} className="h-8">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-3 sm:px-6">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}

        {!budgetId && <p className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg p-3">
            Salve o orçamento primeiro para adicionar serviços/peças.
          </p>}

        {budgetId && !isLoading && displayParts.length === 0 && !isAddingNew && <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum serviço/peça adicionado. Clique em "Adicionar" para começar.
          </p>}

        {budgetId && displayParts.length >= 4 && !isAddingNew && <p className="text-xs text-muted-foreground text-center py-2">Limite máximo de 4 Qualidades/peças por orçamento atingido.</p>}

        {displayParts.map(part => <BudgetPartItem key={part.id} part={part} onUpdate={handleUpdatePart} onDelete={() => handleDeletePart(part.id!)} />)}

        {isAddingNew && <BudgetPartItem part={newPart} onUpdate={handleAddPart} onDelete={() => setIsAddingNew(false)} isEditing />}

        {displayParts.length > 0}
      </CardContent>
    </Card>;
};