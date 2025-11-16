import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTemplateDevices, useDeviceServices } from '@/hooks/worm/useServiceTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Plus, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { WormServiceTemplateForm } from './WormServiceTemplateForm';
import { WormQuickBudgetGenerator } from './WormQuickBudgetGenerator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { formatCurrency } from '@/utils/currency';

export const WormServiceCatalog = () => {
  const { user } = useAuth();
  const [isNewTemplateOpen, setIsNewTemplateOpen] = useState(false);
  const [isBudgetGeneratorOpen, setIsBudgetGeneratorOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());

  const { data: devices = [], isLoading: devicesLoading } = useTemplateDevices(user?.id);

  const toggleDevice = (deviceModel: string) => {
    const newExpanded = new Set(expandedDevices);
    if (newExpanded.has(deviceModel)) {
      newExpanded.delete(deviceModel);
    } else {
      newExpanded.add(deviceModel);
    }
    setExpandedDevices(newExpanded);
  };

  const handleGenerateBudget = (service: any) => {
    setSelectedService(service);
    setIsBudgetGeneratorOpen(true);
  };

  const handleTemplateSuccess = () => {
    setIsNewTemplateOpen(false);
  };

  if (devicesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="h-24 w-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Smartphone className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">
            Nenhum serviço cadastrado
          </h3>
          <p className="text-muted-foreground mb-6">
            Crie seu primeiro template de serviço para começar a gerar orçamentos rapidamente
          </p>
          <Button onClick={() => setIsNewTemplateOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Criar Primeiro Template
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Catálogo de Serviços</h2>
            <p className="text-muted-foreground text-sm mt-1">
              {devices.length} dispositivo(s) cadastrado(s)
            </p>
          </div>
          <Button onClick={() => setIsNewTemplateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Template
          </Button>
        </div>

        <div className="space-y-4">
          {devices.map((device) => (
            <DeviceCard
              key={`${device.device_model}-${device.device_type}`}
              device={device}
              isExpanded={expandedDevices.has(device.device_model)}
              onToggle={() => toggleDevice(device.device_model)}
              onGenerateBudget={handleGenerateBudget}
            />
          ))}
        </div>
      </div>

      {/* Modal de novo template */}
      <Sheet open={isNewTemplateOpen} onOpenChange={setIsNewTemplateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
          <WormServiceTemplateForm
            onSuccess={handleTemplateSuccess}
            onCancel={() => setIsNewTemplateOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Modal de geração de orçamento */}
      <Sheet open={isBudgetGeneratorOpen} onOpenChange={setIsBudgetGeneratorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <WormQuickBudgetGenerator
            service={selectedService}
            onSuccess={() => setIsBudgetGeneratorOpen(false)}
            onCancel={() => setIsBudgetGeneratorOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
};

// Componente de card de dispositivo
const DeviceCard = ({ device, isExpanded, onToggle, onGenerateBudget }: any) => {
  const { user } = useAuth();
  const { data: services = [], isLoading } = useDeviceServices(user?.id, device.device_model);

  return (
    <Card className="border-border/50 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    {device.device_model}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{device.device_type}</p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : services.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum serviço cadastrado para este dispositivo
              </p>
            ) : (
              <div className="space-y-4">
                {services.map((service: any, idx: number) => (
                  <ServiceItem
                    key={idx}
                    service={service}
                    onGenerateBudget={onGenerateBudget}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

// Componente de item de serviço
const ServiceItem = ({ service, onGenerateBudget }: any) => {
  return (
    <div className="p-4 border border-border/50 rounded-lg bg-card/50 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-foreground">{service.serviceName}</h4>
          <p className="text-sm text-muted-foreground">
            {service.options.length} opção(ões) disponível(is)
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => onGenerateBudget(service)}
          className="shrink-0"
        >
          Gerar Orçamento
        </Button>
      </div>

      <div className="space-y-2">
        {service.options.map((option: any) => (
          <div
            key={option.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md border border-border/30"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{option.issue || 'Opção'}</p>
              <p className="text-xs text-muted-foreground">
                {option.warranty_months} meses de garantia
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm">
                {formatCurrency(option.cash_price || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {option.installments}x de {formatCurrency((option.installment_price || option.cash_price || 0) / (option.installments || 1))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
