import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Check, X, Edit2 } from "lucide-react";
import { BudgetPart } from "@/hooks/worm/useBudgetParts";
import { formatCurrency, formatCurrencyFromReais } from "@/utils/currency";

interface BudgetPartItemProps {
  part: BudgetPart;
  onUpdate: (part: BudgetPart) => void;
  onDelete: () => void;
  isEditing?: boolean;
  isLocal?: boolean;
}

export const BudgetPartItem = ({
  part,
  onUpdate,
  onDelete,
  isEditing: initialEditing,
  isLocal = false,
}: BudgetPartItemProps) => {
  const [isEditing, setIsEditing] = useState(initialEditing || false);
  const [editedPart, setEditedPart] = useState<BudgetPart>(() => {
    if (isLocal) return part;

    const base: BudgetPart = {
      ...part,
      price: (part.price || 0) / 100,
    };

    if (part.cash_price) base.cash_price = part.cash_price / 100;
    if (part.installment_price) base.installment_price = part.installment_price / 100;

    return base;
  });

  const isWarrantyInvalid = !editedPart.warranty_months || editedPart.warranty_months <= 1;

  const handleSave = () => {
    if (isWarrantyInvalid) return;
    onUpdate(editedPart);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPart(part);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className="p-3 border-primary/30 bg-primary/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <Label className="text-xs mb-1 block">Nome da opção / Qualidade *</Label>
            <Input
              value={editedPart.part_type || ""}
              onChange={(e) =>
                setEditedPart({
                  ...editedPart,
                  part_type: e.target.value,
                  name: e.target.value,
                })
              }
              placeholder="Ex: Tela Premium (AAA)"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Preço à vista (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={editedPart.cash_price || ""}
              onChange={(e) =>
                setEditedPart({
                  ...editedPart,
                  cash_price: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Preço TOTAL no cartão (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={editedPart.installment_price || ""}
              onChange={(e) =>
                setEditedPart({
                  ...editedPart,
                  installment_price: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Parcelas</Label>
            <Input
              type="number"
              min="1"
              max="12"
              value={editedPart.installment_count || ""}
              onChange={(e) =>
                setEditedPart({
                  ...editedPart,
                  installment_count: parseInt(e.target.value) || 1,
                })
              }
              placeholder="1"
              className="h-8 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs mb-1 block">Garantia (meses) *</Label>
            <Input
              type="number"
              min="1"
              value={editedPart.warranty_months ?? ""}
              onChange={(e) =>
                setEditedPart({
                  ...editedPart,
                  warranty_months: parseInt(e.target.value) || 0,
                })
              }
              placeholder="3"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
            <X className="h-4 w-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} className="h-8" disabled={!editedPart.part_type || isWarrantyInvalid}>
            <Check className="h-4 w-4 mr-1" /> Salvar
          </Button>
        </div>
      </Card>
    );
  }

  // --- CÁLCULOS PARA EXIBIÇÃO (MODO VISUALIZAÇÃO) ---
  const quantity = part.quantity || 1;
  const totalPriceBase = (part.price || 0) * quantity;
  const cashTotal = (part.cash_price || 0) * quantity;

  // Total no cartão: prioriza installment_price, senão usa o price base
  const totalNoCartao = (part.installment_price || part.price || 0) * quantity;
  const numParcelas = part.installment_count || 1;

  const formatValue = (val: number) => (isLocal ? formatCurrencyFromReais(val) : formatCurrency(val));

  return (
    <Card className="p-3 hover:border-primary/50 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{part.name}</div>
          {part.part_type && <div className="text-xs text-muted-foreground">{part.part_type}</div>}

          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            {/* 1. TOTAL BASE */}
            <span className="bg-primary/5 px-2 py-0.5 rounded text-foreground">
              Total base: {formatValue(totalPriceBase)}
            </span>

            {/* 2. TOTAL À VISTA */}
            {(part.cash_price ?? 0) > 0 && (
              <span className="bg-green-500/10 px-2 py-0.5 rounded text-green-700 dark:text-green-400">
                À vista: {formatValue(cashTotal)}
              </span>
            )}

            {/* 3. TOTAL PARCELADO (Corrigido) */}
            {totalNoCartao > 0 && (
              <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400">
                Total Parcelado: até ({numParcelas}x) de {formatValue(totalNoCartao)}
              </span>
            )}

            {/* 4. GARANTIA */}
            <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-700 dark:text-amber-400">
              {part.warranty_months ?? 0}m garantia
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
