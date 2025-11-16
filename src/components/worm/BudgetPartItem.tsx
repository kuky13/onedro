import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Check, X, Edit2 } from 'lucide-react';
import { BudgetPart } from '@/hooks/worm/useBudgetParts';
interface BudgetPartItemProps {
  part: BudgetPart;
  onUpdate: (part: BudgetPart) => void;
  onDelete: () => void;
  isEditing?: boolean;
}
export const BudgetPartItem = ({
  part,
  onUpdate,
  onDelete,
  isEditing: initialEditing
}: BudgetPartItemProps) => {
  const [isEditing, setIsEditing] = useState(initialEditing || false);
  const [editedPart, setEditedPart] = useState<BudgetPart>(part);
  const isWarrantyInvalid = !editedPart.warranty_months || editedPart.warranty_months <= 1;
  const handleSave = () => {
    if (isWarrantyInvalid) {
      // Garantia obrigatória e > 1
      return;
    }
    onUpdate(editedPart);
    setIsEditing(false);
  };
  const handleCancel = () => {
    setEditedPart(part);
    setIsEditing(false);
  };
  if (isEditing) {
    return <Card className="p-3 border-primary/30 bg-primary/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Qualidade/Tipo *</Label>
            <Input value={editedPart.part_type || ''} onChange={e => setEditedPart({
            ...editedPart,
            part_type: e.target.value,
            name: e.target.value
          })} placeholder="Ex: Original, Premium, Chinesa" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Preço à Vista (R$)</Label>
            <Input type="number" step="0.01" min="0" value={editedPart.cash_price || ''} onChange={e => setEditedPart({
            ...editedPart,
            cash_price: parseFloat(e.target.value) || undefined
          })} placeholder="Opcional" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Preço Parcelado (R$)</Label>
            <Input type="number" step="0.01" min="0" value={editedPart.installment_price || ''} onChange={e => setEditedPart({
            ...editedPart,
            installment_price: parseFloat(e.target.value) || undefined
          })} placeholder="Opcional" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Parcelas</Label>
            {editedPart.installment_price && editedPart.installment_count && editedPart.quantity > 0 && <p className="text-xs text-muted-foreground mb-1">
                {(() => {
                  const qty = editedPart.quantity || 1;
                  const ip = editedPart.installment_price || 0;
                  const cp = editedPart.cash_price ?? editedPart.price ?? 0;
                  const count = editedPart.installment_count || 0;
                  const monthly = count > 0 ? (ip > cp ? ip / count : ip) : ip;
                  return `${count}x de R$ ${monthly.toFixed(2)}`;
                })()}
              </p>}
            <Input type="number" min="1" max="12" value={editedPart.installment_count || ''} onChange={e => setEditedPart({
            ...editedPart,
            installment_count: parseInt(e.target.value) || undefined
          })} placeholder="Ex: 3x" className="h-8 text-sm" />
          </div>

          <div>
            <Label className="text-xs">Garantia (meses) *</Label>
            <Input
              type="number"
              min="1"
              value={editedPart.warranty_months ?? ''}
              onChange={e => setEditedPart({
                ...editedPart,
                warranty_months: e.target.value === '' ? undefined : parseInt(e.target.value)
              })}
              className="h-8 text-sm"
            />
            {isWarrantyInvalid && <p className="text-[11px] text-destructive mt-1">Informe garantia maior que 1 mês</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleCancel} className="h-8">
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleSave} className="h-8" disabled={!editedPart.part_type || isWarrantyInvalid}>
            <Check className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </Card>;
  }
  const totalPrice = part.price * part.quantity;
  const cashTotal = part.cash_price ? part.cash_price * part.quantity : undefined;
  const qty = part.quantity || 1;
  const ip = part.installment_price || 0;
  const cp = part.cash_price ?? part.price ?? 0;
  const count = part.installment_count || 0;
  const installmentTotal = ip ? (count > 1 ? (ip > cp ? ip * qty : ip * count * qty) : ip * qty) : undefined;
  const monthlyInstallment = ip && count > 1 ? (ip > cp ? ip / count : ip) : undefined;
  return <Card className="p-3 hover:border-primary/50 transition-colors">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{part.name}</div>
          {part.part_type && <div className="text-xs text-muted-foreground">{part.part_type}</div>}
          <div className="flex flex-wrap gap-2 mt-2 text-xs">
            
            
            {cashTotal && <span className="bg-green-500/10 px-2 py-0.5 rounded text-green-700 dark:text-green-400">
                À vista: R$ {cashTotal.toFixed(2)}
              </span>}
            {installmentTotal && <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400">
                {count ? `${count}x` : 'Parc.'}: R$ {installmentTotal.toFixed(2)}
                {monthlyInstallment && ` (${count}x R$ ${monthlyInstallment.toFixed(2)})`}
              </span>}
            <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-700 dark:text-amber-400">
              {part.warranty_months ?? 0}m garantia
            </span>
          </div>
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>;
};