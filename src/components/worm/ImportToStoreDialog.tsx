import { useState, useEffect } from 'react';
import { Store, Check, AlertCircle, Package, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImportBudgetToStore, type Budget, type BudgetPart } from '@/hooks/useImportBudgetToStore';
import { useStoreStore } from '@/pages/store/useStoreStore';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrencyFromReais } from '@/utils/currency';
import { toast } from 'sonner';

interface ImportToStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget;
  parts: BudgetPart[];
  onSuccess?: () => void;
}

export function ImportToStoreDialog({
  open,
  onOpenChange,
  budget,
  parts,
  onSuccess
}: ImportToStoreDialogProps) {
  const { user } = useAuth();
  const { currentStore, fetchUserStore, isLoading: isLoadingStore } = useStoreStore();
  const { importBudgetParts, isImporting } = useImportBudgetToStore(currentStore?.id);

  // Estado dos campos editáveis
  const [brandName, setBrandName] = useState(budget.device_type || '');
  const [deviceName, setDeviceName] = useState(budget.device_model || '');
  const [selectedParts, setSelectedParts] = useState<Set<string>>(new Set());
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Carregar loja do usuário ao abrir
  useEffect(() => {
    if (open && user?.id && !currentStore) {
      fetchUserStore(user.id);
    }
  }, [open, user?.id, currentStore, fetchUserStore]);

  // Inicializar seleção com todas as peças
  useEffect(() => {
    if (open && parts.length > 0) {
      setSelectedParts(new Set(parts.map(p => p.id)));
      setBrandName(budget.device_type || '');
      setDeviceName(budget.device_model || '');
    }
  }, [open, parts, budget]);

  const togglePart = (partId: string) => {
    const newSelected = new Set(selectedParts);
    if (newSelected.has(partId)) {
      newSelected.delete(partId);
    } else {
      newSelected.add(partId);
    }
    setSelectedParts(newSelected);
  };

  const toggleAll = () => {
    if (selectedParts.size === parts.length) {
      setSelectedParts(new Set());
    } else {
      setSelectedParts(new Set(parts.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    if (!currentStore) {
      toast.error('Você precisa ter uma loja configurada');
      return;
    }

    if (selectedParts.size === 0) {
      toast.error('Selecione pelo menos um serviço para importar');
      return;
    }

    if (!brandName.trim()) {
      toast.error('Informe o nome da marca');
      return;
    }

    if (!deviceName.trim()) {
      toast.error('Informe o nome do modelo');
      return;
    }

    const partsToImport = parts.filter(p => selectedParts.has(p.id));

    const result = await importBudgetParts(budget, partsToImport, {
      skipDuplicates,
      customBrandName: brandName,
      customDeviceName: deviceName
    });

    if (result.success) {
      toast.success(`${result.servicesCreated} serviço(s) importado(s) com sucesso!`);
      if (result.errors.length > 0) {
        result.errors.forEach(err => toast.warning(err));
      }
      onSuccess?.();
      onOpenChange(false);
    } else {
      toast.error('Falha ao importar serviços');
      result.errors.forEach(err => toast.error(err));
    }
  };

  const formatPrice = (priceInCents: number) => {
    return formatCurrencyFromReais(priceInCents / 100);
  };

  // Se não tem loja
  if (!isLoadingStore && !currentStore) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Adicionar à Loja
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <p className="text-muted-foreground mb-2">
              Você ainda não tem uma loja configurada.
            </p>
            <p className="text-sm text-muted-foreground">
              Acesse <strong>/store/settings</strong> para criar sua loja primeiro.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Importar para Loja
          </DialogTitle>
          <DialogDescription>
            Adicione os serviços deste orçamento ao catálogo da sua loja.
          </DialogDescription>
        </DialogHeader>

        {isLoadingStore ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Marca e Modelo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex: Apple, Samsung..."
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="Ex: iPhone 15 Pro..."
                />
              </div>
            </div>

            {/* Opções */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="skipDuplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(!!checked)}
              />
              <Label htmlFor="skipDuplicates" className="text-sm cursor-pointer">
                Ignorar serviços que já existem na loja
              </Label>
            </div>

            {/* Lista de Peças/Serviços */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Serviços a importar</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="text-xs h-7"
                >
                  {selectedParts.size === parts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              </div>

              <ScrollArea className="h-[200px] rounded-md border p-2">
                {parts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Package className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma peça/serviço neste orçamento</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parts.map((part) => {
                      const isSelected = selectedParts.has(part.id);
                      const priceDisplay = part.cash_price || part.price || 0;
                      
                      return (
                        <div
                          key={part.id}
                          onClick={() => togglePart(part.id)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                            transition-colors
                            ${isSelected 
                              ? 'bg-primary/10 border-primary/30' 
                              : 'bg-muted/30 border-border hover:bg-muted/50'}
                          `}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePart(part.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {part.name || part.part_type || 'Serviço'}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {priceDisplay > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {formatPrice(priceDisplay)}
                                </Badge>
                              )}
                              {part.warranty_months && (
                                <Badge variant="outline" className="text-xs">
                                  {part.warranty_months} meses garantia
                                </Badge>
                              )}
                              {part.part_type && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  {part.part_type}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Resumo */}
            {selectedParts.size > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p>
                  <span className="font-medium">{selectedParts.size}</span> serviço(s) serão adicionados à loja
                  <span className="text-muted-foreground"> para o modelo </span>
                  <span className="font-medium">{brandName} {deviceName}</span>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedParts.size === 0 || !brandName || !deviceName}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Store className="h-4 w-4 mr-2" />
                Importar ({selectedParts.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
