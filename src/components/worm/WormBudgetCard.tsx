import React, { useState } from 'react';
import { MessageCircle, FileText, Edit, Trash2, MoreVertical, Calendar, Phone, Smartphone, CheckCircle, Wrench, Crown, FilePlus, Package, Clock } from 'lucide-react';
import { formatCurrencyFromReais } from '@/utils/currency';
import { WormBudgetForm } from './WormBudgetForm';
import { WormBudgetActions } from './WormBudgetActions';
import { WormWhatsAppSelector } from './WormWhatsAppSelector';
import { ServiceOrderCreationDialog } from './ServiceOrderCreationDialog';
import { ServiceOrderActions } from './ServiceOrderActions';
import { BudgetLiteStatusBadge } from '@/components/lite/BudgetLiteStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useCreateServiceOrderFromBudget } from '@/hooks/useCreateServiceOrderFromBudget';
import { useBudgetServiceOrder } from '@/hooks/useBudgetServiceOrder';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useBudgetParts } from '@/hooks/worm/useBudgetParts';
interface Budget {
  id: string;
  client_name?: string;
  client_phone?: string;
  device_model?: string;
  device_type?: string;
  total_price?: number;
  cash_price?: number;
  installment_price?: number;
  workflow_status?: string;
  created_at: string;
  expires_at?: string;
  valid_until?: string;
  is_paid?: boolean;
  is_delivered?: boolean;
  part_quality?: string;
  warranty_months?: number;
  installments?: number;
  payment_condition?: string;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
  custom_services?: string;
  sequential_number?: number;
  notes?: string;
}
interface WormBudgetCardProps {
  budget: Budget;
  onDelete: (budgetId: string) => void;
  onWhatsAppShare: (budget: Budget) => void;
  onUpdate: () => void;
  isDeleting?: boolean;
}
export const WormBudgetCard = ({
  budget,
  onDelete,
  onWhatsAppShare,
  onUpdate,
  isDeleting = false
}: WormBudgetCardProps) => {
  const {
    profile
  } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isWhatsAppSelectorOpen, setIsWhatsAppSelectorOpen] = useState(false);
  const [isServiceOrderDialogOpen, setIsServiceOrderDialogOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isNewBudgetWithDataOpen, setIsNewBudgetWithDataOpen] = useState(false);

  // Hooks para ordem de serviço
  const {
    createServiceOrderFromBudget,
    isCreating,
    isSuccess,
    data: createdOrderData
  } = useCreateServiceOrderFromBudget(profile?.id);
  const {
    createdOrderId,
    formattedId,
    createdOrderCount,
    hasCreatedOrder,
    saveCreatedOrder,
    isLoading: isLoadingOrder
  } = useBudgetServiceOrder(budget.id);

  // Escutar sucesso da criação para salvar relação
  React.useEffect(() => {
    if (isSuccess && createdOrderData && !hasCreatedOrder) {
      // Salvar relação orçamento-ordem
      const displayId = createdOrderData.sequential_number ? `OS-${String(createdOrderData.sequential_number).padStart(4, '0')}` : `OS-${createdOrderData.id.slice(-8)}`;
      saveCreatedOrder(createdOrderData.id, displayId);
      setIsServiceOrderDialogOpen(false);
      onUpdate(); // Atualizar lista
    }
  }, [isSuccess, createdOrderData, hasCreatedOrder, saveCreatedOrder, onUpdate]);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  const handleEditSuccess = () => {
    setIsEditOpen(false);
    onUpdate();
  };
  const handleWhatsAppClick = () => {
    setIsWhatsAppSelectorOpen(true);
  };
  const handlePDFClick = () => {
    setIsActionsOpen(true);
  };
  const handleCreateServiceOrder = () => {
    setIsServiceOrderDialogOpen(true);
  };
  // Abrir formulário de novo orçamento com dados do atual
  const handleNewBudgetWithData = () => {
    setIsNewBudgetWithDataOpen(true);
  };
  const handleConfirmCreateServiceOrder = (customization: {
    priority: 'low' | 'medium' | 'high';
    additional_notes: string;
  }) => {
    createServiceOrderFromBudget({
      budget,
      customization
    });
  };
  const handleDuplicateSuccess = () => {
    setIsDuplicateOpen(false);
    onUpdate();
  };
  const handleNewBudgetSuccess = () => {
    setIsNewBudgetWithDataOpen(false);
    onUpdate();
  };

  // Peças/Serviços do orçamento
  const {
    data: parts = []
  } = useBudgetParts(budget.id);

  // Criar dados duplicados removendo campos únicos
  const duplicatedBudgetData = {
    ...budget,
    id: undefined,
    created_at: undefined,
    updated_at: undefined,
    sequential_number: undefined,
    workflow_status: 'pending'
  };
  const initialNewBudgetData = duplicatedBudgetData;

  // Escutar o sucesso da criação para atualizar UI
  React.useEffect(() => {
    if (createServiceOrderFromBudget && !isCreating) {
      // Hook para detectar mudanças na mutation
    }
  }, [isCreating]);

  // Configuração de aviso de orçamento antigo do perfil do usuário
  const warningDays = profile?.budget_warning_days ?? 15;
  const isWarningEnabled = profile?.budget_warning_enabled ?? true;
  const now = new Date();
  const expiryStr = budget.valid_until || budget.expires_at;
  const expiryDate = expiryStr ? new Date(expiryStr) : null;
  return <>
      <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              
              
              {/* Exibição do número OR */}
              <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                <span className="bg-primary/10 px-2 py-1 rounded-md text-xs font-mono">
                  {budget.sequential_number ? `OR: ${budget.sequential_number.toString().padStart(4, '0')}` : `OR-${budget.id.slice(-8)}`}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="truncate text-white font-semibold text-sm sm:text-base">
                    {budget.device_type} {budget.device_model}
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0 hover:bg-muted/80">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Orçamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePDFClick} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleWhatsAppClick} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Enviar WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNewBudgetWithData} className="cursor-pointer">
                  <FilePlus className="h-4 w-4 mr-2" />
                  Copiar orçamento
                </DropdownMenuItem>
                
                {/* Botão de criar ordem de serviço */}
                <DropdownMenuItem onClick={handleCreateServiceOrder} className="cursor-pointer text-primary focus:text-primary" disabled={isCreating || isLoadingOrder}>
                  <Wrench className="h-4 w-4 mr-2" />
                  {createdOrderCount > 0 ? `Criar OS (${createdOrderCount} já criadas)` : 'Criar OS'}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onSelect={e => e.preventDefault()}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Orçamento
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir este orçamento? 
                        Esta ação pode ser desfeita na lixeira.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(budget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
            
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Data de Criação</span>
              <p className="font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(budget.created_at)}
              </p>
              {/* Contador de dias restantes até a validade */}
              {(() => {
              if (!expiryDate) return null;
              // Normalizar para início do dia para cálculo estável
              const startOfToday = new Date(now);
              startOfToday.setHours(0, 0, 0, 0);
              const startOfExpiry = new Date(expiryDate);
              startOfExpiry.setHours(0, 0, 0, 0);
              const msDiff = startOfExpiry.getTime() - startOfToday.getTime();
              const remainingDays = Math.max(Math.ceil(msDiff / (1000 * 60 * 60 * 24)), 0);

              if (remainingDays === 0) return null; // expirado ou vence hoje
              const isNear = remainingDays <= Math.ceil((warningDays || 15) * 0.3);
              const statusClass = isNear ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' : 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300';
              return <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${statusClass}`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      Restam {remainingDays} dia{remainingDays > 1 ? 's' : ''}
                    </span>
                  </div>;
            })()}
              {/* Aviso de orçamento antigo baseado em idade (mantido, mas distinto da validade) */}
              {(() => {
              const createdDate = new Date(budget.created_at);
              const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              const isOld = isWarningEnabled && daysOld >= warningDays;
              if (!isOld) return null;
              return <div className="mt-2 p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs">
                  ⚠️ Este orçamento está antigo (criado há {daysOld} dias; limite {warningDays} dias).
                </div>;
            })()}
            </div>
          </div>

          {/* Informações da peça */}
          {(budget.part_quality || budget.warranty_months || budget.installments || budget.payment_condition) && <div className="border-t border-border/30 pt-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                {budget.part_quality && <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground text-xs block">Reparo:</span>
                      <p className="font-medium truncate">{budget.part_quality}</p>
                    </div>
                  </div>}
                {(() => {
              // Pegar o maior prazo de garantia entre todas as peças
              const maxWarranty = Math.max(budget.warranty_months || 0, ...parts.map((part: any) => part.warranty_months || 0));
              if (maxWarranty === 0) return null;
              return <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                      <div className="h-2 w-2 bg-green-500 rounded-full flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-xs block">Garantia:</span>
                        <p className="font-medium truncate">até {maxWarranty} meses</p>
                      </div>
                    </div>;
            })()}
                {/* Método de pagamento removido conforme solicitação */}
                {budget.installments && budget.installments > 1 && <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
                    <div className="h-2 w-2 bg-orange-500 rounded-full flex-shrink-0" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground text-xs block">Parcelas:</span>
                      <p className="font-medium truncate">{budget.installments}x</p>
                    </div>
                  </div>}
              </div>
            </div>}

          {/* Serviços / Peças */}
          <div className="border-t border-border/30 pt-4 mt-4">
            <div className="space-y-2">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">Qualidade / Peças<Package className="h-3 w-3" />
              </span>
              {parts && parts.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parts.slice(0, 3).map((part: any) => {
                const qty = part.quantity || 1;
                const unitPrice = (part.price ?? 0) / 100;
                const cashUnit = part.cash_price ? part.cash_price / 100 : unitPrice;
                const instUnit = part.installment_price ? part.installment_price / 100 : undefined;
                const count = (
                  part.installment_count ??
                  part.installments_count ??
                  part.installments ??
                  0
                );
                const cashTotal = cashUnit * qty;
                const installmentTotal = instUnit !== undefined ? (count > 1 ? (instUnit > cashUnit ? instUnit * qty : instUnit * count * qty) : instUnit * qty) : undefined;
                const monthlyInstallment = instUnit !== undefined && count > 1 ? (instUnit > cashUnit ? instUnit / count : instUnit) : undefined;
                return <div key={part.id} className="p-2.5 rounded-md border border-border/40 bg-muted/40">
                        <div className="text-[12px]">
                          <span className="text-muted-foreground">Qualidade/Tipo:</span>{' '}
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{part.part_type || '—'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {cashTotal > 0 && <span className="bg-green-500/10 px-2 py-0.5 rounded text-green-700 dark:text-green-400 text-[11px]">
                              À vista: {formatCurrencyFromReais(cashTotal)}
                            </span>}
                          {installmentTotal && <span className="bg-blue-500/10 px-2 py-0.5 rounded text-blue-700 dark:text-blue-400 text-[11px]">
                              {count ? `${count}x` : 'Parc.'}: {formatCurrencyFromReais(installmentTotal)}
                              {monthlyInstallment && ` (${count}x ${formatCurrencyFromReais(monthlyInstallment)})`}
                            </span>}
                          {part.warranty_months && <span className="bg-amber-500/10 px-2 py-0.5 rounded text-amber-700 dark:text-amber-400 text-[11px]">
                              Garantia: {part.warranty_months} meses
                            </span>}
                        </div>
                      </div>;
              })}
                </div> : <div className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-md">Nenhuma Qualidade / peça adicionado</div>}
            </div>
          </div>

          {/* Status badges */}
          {(budget.is_paid || budget.is_delivered) && <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/30">
              {budget.is_paid && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-800">
                  💰 Pago
                </span>}
              {budget.is_delivered && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-800">
                  📦 Entregue
                </span>}
            </div>}

          {/* Ações de ordem de serviço */}
          {hasCreatedOrder && createdOrderId && <div className="border-t border-border/30 pt-4 mt-4">
              <ServiceOrderActions createdOrderId={createdOrderId} formattedId={formattedId} compact={true} />
            </div>}
        </CardContent>

        {isDeleting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>}
      </Card>

      {/* Modal de edição */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
          <WormBudgetForm budget={budget} onSuccess={handleEditSuccess} onCancel={() => setIsEditOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Modal de ações (PDF) */}
      <Sheet open={isActionsOpen} onOpenChange={setIsActionsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <WormBudgetActions budget={budget} onClose={() => setIsActionsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Modal de WhatsApp */}
      <Sheet open={isWhatsAppSelectorOpen} onOpenChange={setIsWhatsAppSelectorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <WormWhatsAppSelector budget={budget} onClose={() => setIsWhatsAppSelectorOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Dialog de criação de ordem de serviço */}
      <ServiceOrderCreationDialog open={isServiceOrderDialogOpen} onOpenChange={setIsServiceOrderDialogOpen} budget={budget} onConfirm={handleConfirmCreateServiceOrder} isCreating={isCreating} />

      {/* Modal de novo orçamento (preenchido com dados do atual) */}
      <Sheet open={isNewBudgetWithDataOpen} onOpenChange={setIsNewBudgetWithDataOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
          <WormBudgetForm initialData={initialNewBudgetData} onSuccess={handleNewBudgetSuccess} onCancel={() => setIsNewBudgetWithDataOpen(false)} />
        </SheetContent>
      </Sheet>
    </>;
};