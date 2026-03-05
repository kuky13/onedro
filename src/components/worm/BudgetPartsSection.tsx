import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
import {
  BudgetPart,
  useBudgetParts,
  useAddBudgetPart,
  useUpdateBudgetPart,
  useDeleteBudgetPart,
} from "@/hooks/worm/useBudgetParts";
import { BudgetPartItem } from "./BudgetPartItem";
import { toast } from "sonner";
interface BudgetPartsSectionProps {
  budgetId?: string;
  onTotalChange?: (total: number, cashTotal?: number, installmentTotal?: number) => void;
  onLocalPartsChange?: (parts: BudgetPart[]) => void;
  initialLocalParts?: BudgetPart[];
}
export const BudgetPartsSection = ({
  budgetId,
  onTotalChange,
  onLocalPartsChange,
  initialLocalParts
}: BudgetPartsSectionProps) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [localParts, setLocalParts] = useState<BudgetPart[]>(initialLocalParts ?? []);
  const {
    data: parts = [],
    isLoading
  } = useBudgetParts(budgetId);
  const addPart = useAddBudgetPart();
  const updatePart = useUpdateBudgetPart();
  const deletePart = useDeleteBudgetPart();
  const newPart: BudgetPart = {
    name: "",
    part_type: "",
    quantity: 1,
    price: 0,
    cash_price: 0,
    installment_price: 0,
    installment_count: 1,
    warranty_months: 3,
    ...(budgetId ? { budget_id: budgetId } : {}),
  };
  const calculateTotals = (currentParts: BudgetPart[]) => {
    // Determine if we should treat values as cents (DB) or reais (Local)
    // If we are using parts from DB (budgetId exists and has parts), values are in cents.
    // Otherwise (localParts), values are in Reais.
    const isUsingDbParts = !!(budgetId && parts.length > 0);
    const getInstallmentTotal = (p: BudgetPart) => {
      const qty = p.quantity || 1;
      const ip = p.installment_price || 0;
      if (ip) {
        // valor total no cartão x quantidade
        return ip * qty;
      }

      // se não tiver valor de cartão específico, usa preço/cash como fallback
      return (p.price || p.cash_price || 0) * qty;
    };
    const total = currentParts.reduce((sum, p) => {
      const base = p.price || p.cash_price || p.installment_price || 0;
      return sum + base * (p.quantity || 1);
    }, 0);
    const cashTotal = currentParts.reduce((sum, p) => {
      const base = p.cash_price || p.price || p.installment_price || 0;
      return sum + base * (p.quantity || 1);
    }, 0);
    const installmentTotal = currentParts.reduce((sum, p) => sum + getInstallmentTotal(p), 0);

    // Ensure we always emit cents to the parent form
    const outputFactor = isUsingDbParts ? 1 : 100;
    onTotalChange?.(total * outputFactor, cashTotal * outputFactor, installmentTotal * outputFactor);
  };

  // Helper to determine if we are using DB parts (cents) or Local parts (reais)
  const isUsingDbParts = !!(budgetId && parts.length > 0);
  React.useEffect(() => {
    const allParts = budgetId && parts.length > 0 ? parts : localParts;

    // Normaliza valores vindos do DB para manter compatibilidade com exactOptionalPropertyTypes
    const normalizedParts: BudgetPart[] = (allParts as any[]).map((p: any) => ({
      ...p,
      cash_price: p.cash_price ?? null,
      installment_price: p.installment_price ?? null,
      installment_count: p.installment_count ?? 0,
      warranty_months: p.warranty_months ?? null,
      part_type: p.part_type ?? null,
    }));

    if (normalizedParts.length > 0) {
      calculateTotals(normalizedParts);
    } else {
      onTotalChange?.(0, 0, 0);
    }

    if (!budgetId) {
      onLocalPartsChange?.(localParts);
    }
  }, [parts, localParts, budgetId, onTotalChange, onLocalPartsChange]);
  const handleAddPart = async (part: BudgetPart) => {
    if (!part.part_type) {
      toast.error("Preencha qualidade/tipo");
      return;
    }
    if (!part.warranty_months || part.warranty_months <= 1) {
      toast.error("Informe garantia maior que 1 mês");
      return;
    }
    let finalPrice = part.price;
    if (!finalPrice || finalPrice === 0) {
      finalPrice = part.cash_price || part.installment_price || 0;
    }
    const partType = part.part_type ?? '';

    const partToSave: BudgetPart = {
      ...part,
      price: finalPrice,
      cash_price: part.cash_price ?? finalPrice,
      installment_price: part.installment_price ?? finalPrice,
      installment_count: part.installment_count ?? 1,
      warranty_months: part.warranty_months ?? 3,
      name: part.name || partType,
      part_type: partType,
    };

    try {
      if (budgetId) {
        await addPart.mutateAsync({
          ...partToSave,
          name: partType,
          budget_id: budgetId,
        });
      } else {
        setLocalParts([
          ...localParts,
          {
            ...partToSave,
            id: `temp-${Date.now()}`,
            name: partType,
          },
        ]);
        toast.success("Serviço/peça adicionado");
      }
      setIsAddingNew(false);
    } catch (error: any) {
      const message = error?.message || "Erro ao adicionar serviço/peça";
      toast.error(message);
      console.error("Erro ao adicionar serviço/peça:", error);
    }
  };
  const handleUpdatePart = async (part: BudgetPart) => {
    if (!part.part_type) {
      toast.error("Preencha qualidade/tipo");
      return;
    }
    let finalPrice = part.price;
    if (!finalPrice || finalPrice === 0) {
      finalPrice = part.cash_price || part.installment_price || 0;
    }
    const partType = part.part_type ?? '';

    const partToSave: BudgetPart = {
      ...part,
      price: finalPrice,
      cash_price: part.cash_price ?? finalPrice,
      installment_price: part.installment_price ?? finalPrice,
      installment_count: part.installment_count ?? 1,
      warranty_months: part.warranty_months ?? 3,
      name: part.name || partType,
      part_type: partType,
    };

    try {
      if (budgetId) {
        await updatePart.mutateAsync({
          ...partToSave,
          name: partType,
        });
      } else {
        setLocalParts(
          localParts.map((p) =>
            p.id === part.id
              ? {
                  ...partToSave,
                  name: partType,
                }
              : p
          )
        );
        toast.success("Serviço/peça atualizado");
      }
    } catch (error: any) {
      const message = error?.message || "Erro ao atualizar serviço/peça";
      toast.error(message);
      console.error("Erro ao atualizar serviço/peça:", error);
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
        toast.success("Serviço/peça removido");
      }
    } catch (error: any) {
      const message = error?.message || "Erro ao remover serviço/peça";
      toast.error(message);
      console.error("Erro ao remover serviço/peça:", error);
    }
  };
  const allPartsForDisplay = budgetId && parts.length > 0 ? parts : localParts;
  const displayParts: BudgetPart[] = (allPartsForDisplay as any[]).map((p: any) => ({
    ...p,
    cash_price: p.cash_price ?? null,
    installment_price: p.installment_price ?? null,
    installment_count: p.installment_count ?? 0,
    warranty_months: p.warranty_months ?? null,
    part_type: p.part_type ?? null,
  }));

  // ... keep existing code (UI rendering)
  return <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Qualidades / Serviços</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Edite valores à vista/cartão, parcelas e garantia.</p>
        </div>
        <Package className="h-5 w-5 text-muted-foreground" />
      </CardHeader>

      <CardContent className="space-y-3">
        {budgetId && isLoading && <p className="text-xs text-muted-foreground">Carregando opções...</p>}

        {displayParts.length > 0 ? <div className="space-y-2">
            {displayParts.map(part => <BudgetPartItem key={part.id || `${part.part_type}-${part.price}-${part.warranty_months}`} part={part} onUpdate={handleUpdatePart} onDelete={() => part.id && handleDeletePart(part.id)} isLocal={!isUsingDbParts} />)}
          </div> : <p className="text-xs text-muted-foreground">
            Nenhum serviço/peça adicionado ainda. Use o botão abaixo para criar uma opção.
          </p>}

        {isAddingNew && <div className="mt-2">
            <BudgetPartItem part={newPart} isEditing isLocal={true} onUpdate={handleAddPart} onDelete={() => setIsAddingNew(false)} />
          </div>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 mt-2">
          

          {!isAddingNew && <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingNew(true)} className="h-8 border-dashed">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar opção / qualidade
            </Button>}
        </div>
      </CardContent>
    </Card>;
};