import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Smartphone, DollarSign, CheckCircle } from 'lucide-react';

const templateSchema = z.object({
  device_type: z.string().min(1, 'Tipo do dispositivo é obrigatório'),
  device_model: z.string().min(1, 'Modelo do dispositivo é obrigatório'),
  service_name: z.string().min(1, 'Nome do serviço é obrigatório'),
  option_name: z.string().min(1, 'Nome da opção é obrigatório'),
  cash_price: z.number().min(0, 'Preço deve ser maior que zero'),
  installment_price: z.number().optional(),
  installments: z.number().min(1).optional(),
  warranty_months: z.number().min(0).optional(),
  notes: z.string().max(100, 'Observações devem ter no máximo 100 caracteres').optional(),
  includes_delivery: z.boolean().optional(),
  includes_screen_protector: z.boolean().optional(),
  custom_services: z.string().optional(),
  valid_until: z.string().optional()
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface WormServiceTemplateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const WormServiceTemplateForm = ({ onSuccess, onCancel }: WormServiceTemplateFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      installments: 7,
      warranty_months: 3,
      includes_delivery: false,
      includes_screen_protector: false,
      custom_services: '',
    }
  });

  const onSubmit = async (data: TemplateFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Criar template na tabela budgets
      const templateData = {
        owner_id: user.id,
        client_name: 'TEMPLATE',
        client_id: null,
        workflow_status: 'template',
        device_type: data.device_type,
        device_model: data.device_model,
        part_quality: data.service_name, // Nome do serviço
        issue: data.option_name, // Nome da opção
        cash_price: Math.round(data.cash_price * 100),
        installment_price: data.installment_price ? Math.round(data.installment_price * 100) : Math.round(data.cash_price * 100),
        total_price: Math.round(data.cash_price * 100),
        installments: data.installments || 0,
        warranty_months: data.warranty_months || 3,
        notes: data.notes || null,
        includes_delivery: data.includes_delivery || false,
        includes_screen_protector: data.includes_screen_protector || false,
        custom_services: data.custom_services || null,
        valid_until: data.valid_until || null,
      };

      const { error } = await supabase
        .from('budgets')
        .insert(templateData);

      if (error) throw error;

      toast.success('Template de serviço criado com sucesso');
      
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ['service-templates'] });
      await queryClient.invalidateQueries({ queryKey: ['template-devices'] });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Erro ao criar template de serviço');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="shrink-0 bg-background border-b border-border/20 p-4 sm:p-6">
        <SheetTitle className="text-lg sm:text-xl font-semibold">
          Novo Template de Serviço
        </SheetTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Crie um template para gerar orçamentos rapidamente
        </p>
      </SheetHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4 p-4 sm:p-6">
          {/* Informações do Dispositivo */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                </div>
                Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="device_type" className="text-sm font-medium">Tipo *</Label>
                  <Select onValueChange={(value) => setValue('device_type', value)} value={watch('device_type')}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Smartphone">📱 Celular</SelectItem>
                      <SelectItem value="Tablet">📟 Tablet</SelectItem>
                      <SelectItem value="Notebook">💻 Notebook</SelectItem>
                      <SelectItem value="Console">🎮 Console</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.device_type && (
                    <p className="text-xs text-destructive mt-1">{errors.device_type.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="device_model" className="text-sm font-medium">Modelo *</Label>
                  <Input
                    id="device_model"
                    {...register('device_model')}
                    placeholder="Samsung A06"
                    className="mt-1"
                  />
                  {errors.device_model && (
                    <p className="text-xs text-destructive mt-1">{errors.device_model.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviço */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Serviço e Opção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="service_name" className="text-sm font-medium">Nome do Serviço *</Label>
                <Input
                  id="service_name"
                  {...register('service_name')}
                  placeholder="Ex: Troca de Tela"
                  className="mt-1"
                />
                {errors.service_name && (
                  <p className="text-xs text-destructive mt-1">{errors.service_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="option_name" className="text-sm font-medium">Nome da Opção *</Label>
                <Input
                  id="option_name"
                  {...register('option_name')}
                  placeholder="Ex: Original Nacional"
                  className="mt-1"
                />
                {errors.option_name && (
                  <p className="text-xs text-destructive mt-1">{errors.option_name.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preços */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
                Valores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cash_price" className="text-sm font-medium">Preço à Vista (R$) *</Label>
                  <Input
                    id="cash_price"
                    type="number"
                    step="0.01"
                    {...register('cash_price', { valueAsNumber: true })}
                    placeholder="350.00"
                    className="mt-1"
                  />
                  {errors.cash_price && (
                    <p className="text-xs text-destructive mt-1">{errors.cash_price.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="installment_price" className="text-sm font-medium">Preço Parcelado (R$)</Label>
                  <Input
                    id="installment_price"
                    type="number"
                    step="0.01"
                    {...register('installment_price', { valueAsNumber: true })}
                    placeholder="380.00"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="installments" className="text-sm font-medium">Parcelas</Label>
                  <Input
                    id="installments"
                    type="number"
                    {...register('installments', { valueAsNumber: true })}
                    placeholder="7"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="warranty_months" className="text-sm font-medium">Garantia (meses)</Label>
                  <Input
                    id="warranty_months"
                    type="number"
                    {...register('warranty_months', { valueAsNumber: true })}
                    placeholder="6"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviços Inclusos */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                </div>
                Serviços Inclusos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includes_delivery"
                  checked={watch('includes_delivery')}
                  onCheckedChange={(checked) => setValue('includes_delivery', checked as boolean)}
                />
                <Label htmlFor="includes_delivery" className="text-sm font-normal cursor-pointer">
                  Busca e entrega
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includes_screen_protector"
                  checked={watch('includes_screen_protector')}
                  onCheckedChange={(checked) => setValue('includes_screen_protector', checked as boolean)}
                />
                <Label htmlFor="includes_screen_protector" className="text-sm font-normal cursor-pointer">
                  Película 3D de brinde
                </Label>
              </div>

              <div>
                <Label htmlFor="custom_services" className="text-sm font-medium">Serviços Adicionais</Label>
                <Textarea
                  id="custom_services"
                  {...register('custom_services')}
                  placeholder="Outros serviços inclusos..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Ex: Entrega no mesmo dia"
                  rows={2}
                  className="mt-1"
                />
                {errors.notes && (
                  <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="valid_until" className="text-sm font-medium">Validade</Label>
                <Input
                  id="valid_until"
                  type="date"
                  {...register('valid_until')}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer com botões */}
        <div className="shrink-0 border-t border-border/20 p-4 bg-background flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Criar Template'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
