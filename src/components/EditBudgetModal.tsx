// @ts-nocheck
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/useToast';
import { useResponsive } from '@/hooks/useResponsive';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { BudgetPartsSection } from '@/components/worm/BudgetPartsSection';
interface Budget {
  id: string;
  device_type: string;
  device_model: string;
  issue: string;
  part_type: string;
  total_price: number;
  cash_price: number;
  installment_price?: number;
  installments: number;
  payment_condition: string;
  warranty_months: number;
  includes_delivery: boolean;
  includes_screen_protector: boolean;
  notes?: string;
  service_specification?: string;
  client_name?: string;
  client_phone?: string;
  created_at: string;
  valid_until: string;
  custom_services?: string;
}

interface UpdateBudgetData {
  device_type: string;
  device_model: string;
  issue: string;
  part_type: string;
  total_price: string;
  cash_price: string;
  installment_price: string;
  installments: number;
  payment_condition: string;
  warranty_months: number;
  includes_delivery: boolean;
  includes_screen_protector: boolean;
  notes: string;
  service_specification: string;
  validity_period_days: string;
  client_name: string;
  client_phone: string;
  enable_installment_price: boolean;
  custom_services: string;
}

interface EditBudgetModalProps {
  budget: Budget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export const EditBudgetModal = ({ budget, open, onOpenChange }: EditBudgetModalProps) => {
  const { showSuccess, showError } = useToast();
  const { isDesktop } = useResponsive();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    device_type: '',
    device_model: '',
    issue: '',
    part_type: '',
    total_price: '',
    cash_price: '',
    installment_price: '',
    installments: 1,
    payment_condition: '',
    warranty_months: 3,
    includes_delivery: false,
    includes_screen_protector: false,
    notes: '',
    service_specification: '',
    validity_period_days: '',
    client_name: '',
    client_phone: '',
    enable_installment_price: false,
    custom_services: ''
  });

  // Removed unused device types query
  const {
    data: warrantyPeriods
  } = useQuery({
    queryKey: ['warranty-periods'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('warranty_periods').select('*').order('months');
      if (error) throw error;
      return data;
    }
  });

  // Carregar dados do orçamento quando o modal abrir ou budget mudar
  useEffect(() => {
    if (budget && open) {
      let days = 15; // Fallback
      if (budget.created_at && budget.valid_until) {
        const createdAt = new Date(budget.created_at);
        const validUntil = new Date(budget.valid_until);
        if (!isNaN(createdAt.getTime()) && !isNaN(validUntil.getTime())) {
          const diffTime = validUntil.getTime() - createdAt.getTime();
          days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }
      setFormData({
        device_type: budget.device_type || '',
        device_model: budget.device_model || '',
        issue: budget.issue || '',
        part_type: budget.part_type || '',
        total_price: budget.total_price ? (budget.total_price / 100).toString() : '',
        cash_price: budget.cash_price ? (budget.cash_price / 100).toString() : '',
        installment_price: budget.installment_price ? (budget.installment_price / 100).toString() : '',
        installments: budget.installments || 1,
        payment_condition: budget.payment_condition || '',
        warranty_months: budget.warranty_months || 3,
        includes_delivery: budget.includes_delivery ?? false,
        includes_screen_protector: budget.includes_screen_protector ?? false,
        notes: budget.notes || '',
        service_specification: budget.service_specification || '',
        validity_period_days: days.toString(),
        client_name: budget.client_name || '',
        client_phone: budget.client_phone || '',
        enable_installment_price: !!budget.installment_price,
        custom_services: budget.custom_services || ''
      });
    }
  }, [budget, open]);
  const updateBudgetMutation = useMutation({
    mutationFn: async (data: UpdateBudgetData) => {
      if (!budget) {
        throw new Error('Budget not available');
      }
      const createdAt = new Date(budget.created_at);
      let validUntilDate = new Date(createdAt);
      const totalPriceValue = parseFloat(data.total_price) || 0;
      const cashPriceValue = parseFloat(data.cash_price) || totalPriceValue;
      const installmentPriceValue = parseFloat(data.installment_price) || 0;
      const validityDays = Math.max(1, parseInt(data.validity_period_days || '0') || 0);

      // Aplicar nova validade baseada nos dias informados
      if (!isNaN(validUntilDate.getTime())) {
        // Normalizar para início do dia e somar os dias
        validUntilDate.setHours(0, 0, 0, 0);
        validUntilDate.setDate(validUntilDate.getDate() + validityDays);
      } else {
        // Fallback: usar a data atual caso created_at seja inválida
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        base.setDate(base.getDate() + validityDays);
        validUntilDate = base;
      }
      const updateData = {
        device_type: data.device_type,
        device_model: data.device_model,
        issue: data.issue,
        part_type: data.part_type,
        total_price: Math.round(totalPriceValue * 100),
        cash_price: Math.round(cashPriceValue * 100),
        installment_price: installmentPriceValue > 0 ? Math.round(installmentPriceValue * 100) : null,
        installments: data.installments,
        payment_condition: data.payment_condition,
        warranty_months: data.warranty_months,
        includes_delivery: data.includes_delivery,
        includes_screen_protector: data.includes_screen_protector,
        notes: data.notes,
        service_specification: data.service_specification,
        valid_until: validUntilDate.toISOString(),
        client_name: data.client_name || null,
        client_phone: data.client_phone || null,
        custom_services: data.custom_services || null
      };
      const {
        error
      } = await supabase.from('budgets').update(updateData).eq('id', budget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['budgets']
      });
      showSuccess({
        title: "Orçamento atualizado",
        description: "As alterações foram salvas com sucesso."
      });
      onOpenChange(false);
    },
    onError: error => {
      console.error('Error updating budget:', error);
      showError({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao salvar as alterações."
      });
    }
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.device_model || !formData.issue || !formData.total_price || !formData.part_type) {
      showError({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios (modelo, problema, valor e tipo de serviço)."
      });
      return;
    }
    const totalPrice = parseFloat(formData.total_price);
    if (isNaN(totalPrice) || totalPrice <= 0) {
      showError({
        title: "Valor inválido",
        description: "Digite um valor válido para o orçamento."
      });
      return;
    }
    updateBudgetMutation.mutate(formData);
  };
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-2xl max-h-[90vh] overflow-y-auto",
        isDesktop && "max-w-6xl desktop-modal desktop-form-layout"
      )}>
        <DialogHeader className={cn(
          isDesktop && "desktop-section-header"
        )}>
          <DialogTitle className={cn(
            isDesktop && "desktop-section-title"
          )}>Editar Orçamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className={cn(
          "space-y-6",
          isDesktop && "desktop-form-grid desktop-grid-2-col gap-8"
        )}>
          {/* Informações do Dispositivo */}
          <div className={cn(
            "space-y-4",
            isDesktop && "desktop-form-section"
          )}>
            <h3 className="font-semibold text-lg">Informações do Dispositivo</h3>
            <div className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-4",
              isDesktop && "desktop-grid-2-col"
            )}>
              
            </div>
          
            {/* Serviços / Peças */}
            <div className="space-y-4 mt-4">
              <h3 className="font-semibold text-lg">Serviços / Peças</h3>
              <BudgetPartsSection budgetId={budget?.id} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="device_model">Serviço/Aparelho</Label>
              <Input id="device_model" value={formData.device_model} onChange={e => handleInputChange('device_model', e.target.value)} placeholder="Ex: iPhone 12, Redmi Note 8" required />
            </div>
            
            <div className="space-y-2">
              
              
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="part_type">Qualidade</Label>
              <Input id="part_type" value={formData.part_type} onChange={e => handleInputChange('part_type', e.target.value)} placeholder="Ex: Troca de tela, Troca de bateria, Limpeza..." required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="service_specification">Qualidade da peça</Label>
              <Input id="service_specification" value={formData.service_specification} onChange={e => handleInputChange('service_specification', e.target.value)} placeholder="Ex: Peça original, Incell, OLED, Compatível..." />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="warranty_months">Garantia</Label>
              <Select value={formData.warranty_months.toString()} onValueChange={value => handleInputChange('warranty_months', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {warrantyPeriods?.map(period => <SelectItem key={period.id} value={period.months.toString()}>
                      {period.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cliente */}
          <div className={cn(
            "space-y-4",
            isDesktop && "desktop-form-section"
          )}>
            <h3 className="font-semibold text-lg">Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nome do Cliente</Label>
                <Input id="client_name" value={formData.client_name} onChange={e => handleInputChange('client_name', e.target.value)} placeholder="Nome completo do cliente" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client_phone">Telefone do Cliente</Label>
                <Input id="client_phone" value={formData.client_phone} onChange={e => handleInputChange('client_phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>
          </div>

          {/* Preços e Condições */}
          <div className={cn(
            "space-y-4",
            isDesktop && "desktop-form-section"
          )}>
            <h3 className="font-semibold text-lg">Preços e Condições</h3>
            <div className="space-y-2">
              <Label htmlFor="cash_price">Valor à Vista (R$)</Label>
              <Input id="cash_price" type="number" step="0.01" value={formData.cash_price} onChange={e => {
              handleInputChange('cash_price', e.target.value);
              if (!formData.total_price) {
                handleInputChange('total_price', e.target.value);
              }
            }} placeholder="0,00" required />
            </div>

            <div className="flex items-center space-x-2">
              <Switch id="enable_installment_price" checked={formData.enable_installment_price} onCheckedChange={checked => handleInputChange('enable_installment_price', checked)} />
              <Label htmlFor="enable_installment_price">Ativar valor parcelado</Label>
            </div>

            {formData.enable_installment_price && <>
                <div className="space-y-2">
                  <Label htmlFor="installment_price">Valor Parcelado (R$)</Label>
                  <Input id="installment_price" type="number" step="0.01" value={formData.installment_price} onChange={e => handleInputChange('installment_price', e.target.value)} placeholder="0,00" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="installments">Número de Parcelas</Label>
                  <Select value={formData.installments.toString()} onValueChange={value => handleInputChange('installments', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({
                    length: 12
                  }, (_, i) => i + 1).map(installment => <SelectItem key={installment} value={installment.toString()}>
                          {`${installment}x`}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>}

            <div className="space-y-2">
              <Label htmlFor="payment_condition">Método de Pagamento</Label>
              <Select value={formData.payment_condition} onValueChange={value => handleInputChange('payment_condition', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="À Vista">À Vista</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validity_period_days">Validade (dias)</Label>
              <Input id="validity_period_days" type="number" min="1" value={formData.validity_period_days} onChange={e => handleInputChange('validity_period_days', e.target.value)} placeholder="15" required />
            </div>
          </div>

          {/* Serviços Adicionais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Serviços Adicionais</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="includes_delivery" checked={formData.includes_delivery} onCheckedChange={checked => handleInputChange('includes_delivery', checked)} />
                <Label htmlFor="includes_delivery">Incluir busca e entrega</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox id="includes_screen_protector" checked={formData.includes_screen_protector} onCheckedChange={checked => handleInputChange('includes_screen_protector', checked)} />
                <Label htmlFor="includes_screen_protector">Incluir película 3D de brinde</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom_services">Serviços Personalizados</Label>
                <Input 
                  id="custom_services" 
                  value={formData.custom_services} 
                  onChange={e => handleInputChange('custom_services', e.target.value)} 
                  placeholder="Descreva serviços customizados adicionais" 
                  maxLength={30}
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-muted-foreground">
                    Descreva serviços customizados adicionais
                  </p>
                  <div className={`text-xs ${
                    (formData.custom_services?.length || 0) > 24 
                      ? 'text-orange-500' 
                      : (formData.custom_services?.length || 0) > 27 
                        ? 'text-red-500' 
                        : 'text-muted-foreground'
                  }`}>
                    {(formData.custom_services?.length || 0)}/30 caracteres
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Observações adicionais sobre o orçamento..." rows={3} />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateBudgetMutation.isPending}>
              {updateBudgetMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
};