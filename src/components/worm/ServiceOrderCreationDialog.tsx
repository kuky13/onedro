/**
 * Dialog para criação de ordem de serviço a partir de orçamento
 * Com preview dos dados e opções de customização básicas
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Wrench, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  User,
  Phone,
  Smartphone
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';

interface Budget {
  id: string;
  client_name?: string;
  client_phone?: string;
  device_model?: string;
  device_type?: string;
  total_price?: number;
  cash_price?: number;
  part_quality?: string;
  warranty_months?: number;
  notes?: string;
}

interface ServiceOrderCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  onConfirm: (customization: {
    priority: 'low' | 'medium' | 'high';
    additional_notes: string;
  }) => void;
  isCreating?: boolean;
}

export const ServiceOrderCreationDialog = ({
  open,
  onOpenChange,
  budget,
  onConfirm,
  isCreating = false
}: ServiceOrderCreationDialogProps) => {
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [additionalNotes, setAdditionalNotes] = useState('');



  const handleConfirm = () => {
    onConfirm({
      priority,
      additional_notes: additionalNotes
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Criar Ordem de Serviço
          </DialogTitle>
          <DialogDescription>
            Uma nova ordem de serviço será criada baseada nos dados deste orçamento.
            Você pode customizar alguns detalhes antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview dos dados do orçamento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados do Orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {budget.client_name && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{budget.client_name}</p>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                    </div>
                  </div>
                )}
                {budget.client_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{budget.client_phone}</p>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dispositivo */}
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {budget.device_type} {budget.device_model}
                  </p>
                  <p className="text-xs text-muted-foreground">Dispositivo</p>
                </div>
              </div>

              {/* Detalhes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {budget.part_quality && (
                  <div>
                    <p className="text-xs text-muted-foreground">Qualidade da peça</p>
                    <p className="text-sm font-medium">{budget.part_quality}</p>
                  </div>
                )}
                {budget.warranty_months && (
                  <div>
                    <p className="text-xs text-muted-foreground">Garantia</p>
                    <p className="text-sm font-medium">{budget.warranty_months} meses</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="text-sm font-medium">
                    {budget.cash_price 
                      ? formatCurrency(budget.cash_price)
                      : budget.total_price 
                      ? formatCurrency(budget.total_price)
                      : 'Não informado'
                    }
                  </p>
                </div>
              </div>

              {budget.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações do orçamento</p>
                  <p className="text-sm bg-muted p-2 rounded">{budget.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Customização da ordem de serviço */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Configurações da Ordem de Serviço</h4>
            
            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(priority)}
                      <Badge variant={getPriorityColor(priority)}>
                        {priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      <Badge variant="destructive">Alta</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <Badge variant="default">Média</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      <Badge variant="secondary">Baixa</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações adicionais */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações Adicionais (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações específicas para a ordem de serviço..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isCreating}>
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                Criando...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Criar Ordem de Serviço
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};