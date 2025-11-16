import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { useGenerateBudgetFromTemplate } from '@/hooks/worm/useGenerateBudgetFromTemplate';
import { useWhatsAppTemplates } from '@/hooks/worm/useWhatsAppMessageTemplates';
import { generateServiceWhatsAppMessage } from '@/utils/whatsappUtils';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';
import { openWhatsApp } from '@/utils/whatsappUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, MessageCircle, Copy, User } from 'lucide-react';
import { WormClientSelector } from './WormClientSelector';
import { WormTemplateSelector } from './WormTemplateSelector';

interface WormQuickBudgetGeneratorProps {
  service: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const WormQuickBudgetGenerator = ({ service, onSuccess, onCancel }: WormQuickBudgetGeneratorProps) => {
  const { user, profile } = useAuth();
  const { getCompanyDataForPDF } = useCompanyDataLoader();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(
    new Set(service?.options.map((o: any) => o.id) || [])
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [generatedMessage, setGeneratedMessage] = useState('');

  const { mutate: generateBudget, isPending } = useGenerateBudgetFromTemplate();
  const { templates, isLoading: templatesLoading } = useWhatsAppTemplates(user?.id);
  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId) || templates?.[0];

  const handleClientSelect = (client: any, clientId?: string) => {
    setSelectedClient(client);
    setSelectedClientId(clientId || null);
    
    if (client) {
      setClientName(client.name);
      setClientPhone(client.phone || '');
    }
  };

  const toggleOption = (optionId: string) => {
    const newSelected = new Set(selectedOptions);
    if (newSelected.has(optionId)) {
      newSelected.delete(optionId);
    } else {
      newSelected.add(optionId);
    }
    setSelectedOptions(newSelected);
  };

  const handleGenerate = () => {
    if (!clientName.trim()) {
      toast.error('Selecione ou preencha o nome do cliente');
      return;
    }

    if (selectedOptions.size === 0) {
      toast.error('Selecione pelo menos uma opção de serviço');
      return;
    }

    const templateIds = Array.from(selectedOptions);
    
    generateBudget({
      templateIds,
      clientId: selectedClientId,
      clientData: {
        name: clientName,
        phone: clientPhone
      },
      notes,
      validUntil
    }, {
      onSuccess: (data) => {
        // Gerar mensagem WhatsApp usando template selecionado
        const companyData = getCompanyDataForPDF();
        const companyName = companyData.shop_name || 'Nossa Loja';
        
        let message;
        if (selectedTemplate) {
          // Usar template personalizado
          message = generateWhatsAppMessageFromTemplate(selectedTemplate.template, data, companyName);
        } else {
          // Usar mensagem padrão
          message = generateServiceWhatsAppMessage(data, companyName);
        }
        
        setGeneratedMessage(message);
        toast.success('Orçamento gerado com sucesso!');
      }
    });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast.success('Mensagem copiada para área de transferência');
  };

  const handleSendWhatsApp = () => {
    if (clientPhone) {
      openWhatsApp(clientPhone, generatedMessage);
    } else {
      toast.error('Adicione o telefone do cliente para enviar via WhatsApp');
    }
  };

  if (!service) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Nenhum serviço selecionado</p>
      </div>
    );
  }

  // Se já gerou a mensagem, mostrar resultado
  if (generatedMessage) {
    return (
      <div className="flex flex-col h-full">
        <SheetHeader className="shrink-0 bg-background border-b border-border/20 p-4 sm:p-6">
          <SheetTitle className="text-lg sm:text-xl font-semibold">
            Orçamento Gerado ✅
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mensagem WhatsApp</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {generatedMessage}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="shrink-0 border-t border-border/20 p-4 bg-background space-y-2">
          <Button
            onClick={handleCopyMessage}
            variant="outline"
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Mensagem
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            className="w-full"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Enviar WhatsApp
          </Button>
          <Button
            onClick={onSuccess}
            variant="ghost"
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="shrink-0 bg-background border-b border-border/20 p-4 sm:p-6">
        <SheetTitle className="text-lg sm:text-xl font-semibold">
          Gerar Orçamento
        </SheetTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {service.deviceModel} - {service.serviceName}
        </p>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Cliente */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <WormClientSelector 
              selectedClientId={selectedClientId}
              onClientSelect={handleClientSelect}
              placeholder="Selecione um cliente"
            />

            {!selectedClientId && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div>
                  <Label htmlFor="client_name" className="text-sm font-medium">Nome *</Label>
                  <Input
                    id="client_name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="client_phone" className="text-sm font-medium">Telefone</Label>
                  <Input
                    id="client_phone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {selectedClientId && selectedClient && (
              <div className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="font-semibold text-sm">{selectedClient.name}</div>
                {selectedClient.phone && (
                  <div className="text-xs text-muted-foreground">{selectedClient.phone}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opções de Serviço */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecione as Opções</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {service.options.map((option: any) => (
              <div
                key={option.id}
                className="flex items-start space-x-3 p-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.has(option.id)}
                  onCheckedChange={() => toggleOption(option.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={option.id} className="cursor-pointer font-medium text-sm">
                    {option.issue || 'Opção'}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    R$ {(option.cash_price / 100).toFixed(2)} à vista • {option.warranty_months} meses
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Template WhatsApp */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Template WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            <WormTemplateSelector
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={setSelectedTemplateId}
              userId={user?.id}
              loading={templatesLoading}
            />
          </CardContent>
        </Card>

        {/* Detalhes */}
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhes (Opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações adicionais..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="valid_until" className="text-sm font-medium">Válido até</Label>
              <Input
                id="valid_until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="shrink-0 border-t border-border/20 p-4 bg-background flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : (
            'Gerar Orçamento'
          )}
        </Button>
      </div>
    </div>
  );
};
