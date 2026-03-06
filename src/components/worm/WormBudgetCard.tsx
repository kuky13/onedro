// @ts-nocheck
import { useEffect, useState } from 'react';
import {
  MessageCircle, Edit, Trash2, MoreVertical, Calendar, Wrench, FilePlus,
  Package, Clock, Store, Shield, Smartphone, DollarSign, CreditCard,
  ChevronDown, ChevronUp, Sparkles, Printer
} from 'lucide-react';
import { formatCurrencyFromReais, formatCurrency } from '@/utils/currency';
import { WormBudgetForm } from './WormBudgetForm';
import { WormBudgetActions } from './WormBudgetActions';
import { WormWhatsAppSelector } from './WormWhatsAppSelector';
import { ServiceOrderCreationDialog } from './ServiceOrderCreationDialog';
import { ServiceOrderActions } from './ServiceOrderActions';
import { ImportToStoreDialog } from './ImportToStoreDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCreateServiceOrderFromBudget } from '@/hooks/useCreateServiceOrderFromBudget';
import { useBudgetServiceOrder } from '@/hooks/useBudgetServiceOrder';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useBudgetParts } from '@/hooks/worm/useBudgetParts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { generateBudgetPdf } from '@/utils/wormPdfGenerator';
import { supabase } from '@/integrations/supabase/client';
import { usePdfTemplates } from '@/hooks/worm/usePdfTemplates';

interface Budget {
  id: string;
  client_name?: string;
  client_phone?: string;
  device_model?: string;
  device_type?: string;
  issue?: string | null;
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
  onWhatsAppShare: _onWhatsAppShare,
  onUpdate,
  isDeleting = false,
}: WormBudgetCardProps) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isWhatsAppSelectorOpen, setIsWhatsAppSelectorOpen] = useState(false);
  const [isServiceOrderDialogOpen, setIsServiceOrderDialogOpen] = useState(false);
  const [isNewBudgetWithDataOpen, setIsNewBudgetWithDataOpen] = useState(false);
  const [isImportToStoreOpen, setIsImportToStoreOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);

  const { createServiceOrderFromBudget, isCreating, isSuccess, data: createdOrderData } =
    useCreateServiceOrderFromBudget(profile?.id);
  const { createdOrderId, formattedId, createdOrderCount, hasCreatedOrder, saveCreatedOrder, isLoading: isLoadingOrder } =
    useBudgetServiceOrder(budget.id);
  const { data: parts = [] } = useBudgetParts(budget.id);
  const { data: pdfTemplates = [] } = usePdfTemplates(profile?.id);

  useEffect(() => {
    if (isSuccess && createdOrderData && !hasCreatedOrder) {
      const displayId = createdOrderData.sequential_number
        ? `OS-${String(createdOrderData.sequential_number).padStart(4, '0')}`
        : `OS-${createdOrderData.id.slice(-8)}`;
      saveCreatedOrder(createdOrderData.id, displayId);
      setIsServiceOrderDialogOpen(false);
      onUpdate();
    }
  }, [isSuccess, createdOrderData, hasCreatedOrder, saveCreatedOrder, onUpdate]);

  const handleEditSuccess = () => { setIsEditOpen(false); onUpdate(); };
  const handleWhatsAppClick = () => setIsWhatsAppSelectorOpen(true);
  const handleCreateServiceOrder = () => setIsServiceOrderDialogOpen(true);
  const handleNewBudgetWithData = () => setIsNewBudgetWithDataOpen(true);

  const handleOpenWarranty = () => {
    if (!hasCreatedOrder || !createdOrderId) {
      toast.error('É necessário criar uma Ordem de Serviço antes de abrir uma garantia', {
        description: 'Clique em "Criar OS" no menu para gerar uma ordem de serviço primeiro.',
      });
      return;
    }
    navigate('/garantia', { state: { warrantyPrefill: { serviceOrderId: createdOrderId } } });
  };

  const handleConfirmCreateServiceOrder = (customization: { priority: 'low' | 'medium' | 'high'; additional_notes: string }) => {
    createServiceOrderFromBudget({ budget, customization });
  };

  const handleNewBudgetSuccess = () => { setIsNewBudgetWithDataOpen(false); onUpdate(); };

  const handleGeneratePdf = async (paperWidth: '58mm' | '80mm') => {
    try {
      toast.loading('Gerando PDF...');
      
      let companyName = 'Nossa Loja';
      let companyPhone = '';
      let companyAddress = '';
      
      // Tenta pegar dados da empresa (similar ao WhatsAppSelector)
      try {
        const { data: companyData } = await supabase
          .from('company_info')
          .select('name, phone, address')
          .eq('owner_id', profile?.id)
          .maybeSingle();
        if (companyData) {
          if (companyData.name) companyName = companyData.name;
          if (companyData.phone) companyPhone = companyData.phone;
          if (companyData.address) companyAddress = companyData.address;
        }
      } catch (e) { console.error(e); }

      if (companyName === 'Nossa Loja') {
        try {
          const { data: shopData } = await supabase
            .from('shop_profiles')
            .select('shop_name, whatsapp, address')
            .eq('user_id', profile?.id)
            .maybeSingle();
          if (shopData) {
            if (shopData.shop_name) companyName = shopData.shop_name;
            if (shopData.whatsapp) companyPhone = shopData.whatsapp;
            if (shopData.address) companyAddress = shopData.address;
          }
        } catch (e) { console.error(e); }
      }

      // Encontrar template
      const defaultTemplate = pdfTemplates?.find((t: any) => t.is_default) || pdfTemplates?.[0];
      const templateContent = defaultTemplate?.service_section_template || `
{nome_empresa} 
{endereco}
{num_or} 
{telefone_contato} 
Aparelho:{modelo_dispositivo} 
Serviço: {nome_reparo} 

{qualidades_inicio}{qualidade_nome} – {peca_garantia_meses} meses de garantia 
À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} no cartão 

{qualidades_fim} 
Observações: {observacoes} 

Valido até {data_validade}
`;

      generateBudgetPdf({
        budget,
        parts,
        template: templateContent,
        paperWidth,
        companyName,
        companyPhone,
        companyAddress
      });
      
      toast.dismiss();
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.dismiss();
      toast.error('Erro ao gerar PDF');
    }
  };

  const duplicatedBudgetData = { ...budget, id: undefined, created_at: undefined, updated_at: undefined, sequential_number: undefined, workflow_status: 'pending' };

  const warningDays = profile?.budget_warning_days ?? 15;
  const isWarningEnabled = profile?.budget_warning_enabled ?? true;
  const now = new Date();
  const expiryStr = budget.valid_until || budget.expires_at;
  const expiryDate = expiryStr ? new Date(expiryStr) : null;

  // Compute expiry info
  let expiryInfo: { remainingDays: number; isNear: boolean } | null = null;
  if (expiryDate) {
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfExpiry = new Date(expiryDate); startOfExpiry.setHours(0, 0, 0, 0);
    const msDiff = startOfExpiry.getTime() - startOfToday.getTime();
    const remainingDays = Math.max(Math.ceil(msDiff / (1000 * 60 * 60 * 24)), 0);
    if (remainingDays > 0) {
      expiryInfo = { remainingDays, isNear: remainingDays <= Math.ceil((warningDays || 15) * 0.3) };
    }
  }

  // Old budget warning
  const createdDate = new Date(budget.created_at);
  const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const hasValidFutureExpiry = expiryDate && expiryDate.getTime() > now.getTime();
  const isOld = isWarningEnabled && daysOld >= warningDays && !hasValidFutureExpiry;

  // Payment badge (only paid/delivered, no "Pendente")
  const getWorkflowBadge = () => {
    if (budget.is_paid && budget.is_delivered) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">📦 Entregue</Badge>;
    }
    if (budget.is_paid) {
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">💰 Pago</Badge>;
    }
    return null;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <>
      <div className="rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-all duration-300 overflow-hidden relative">
        <div className="p-4 space-y-3">
          {/* Top row: OR code + status + menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <h4 className="font-semibold text-base leading-tight">
                  {budget.part_quality || budget.issue || 'Orçamento'}
                </h4>
              </div>
              {getWorkflowBadge()}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer font-medium">
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setIsPdfDialogOpen(true)} className="cursor-pointer">
                  <Printer className="h-4 w-4 mr-2" /> Imprimir PDF
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleWhatsAppClick} className="cursor-pointer">
                  <MessageCircle className="h-4 w-4 mr-2" /> Enviar WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNewBudgetWithData} className="cursor-pointer">
                  <FilePlus className="h-4 w-4 mr-2" /> Copiar orçamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreateServiceOrder} className="cursor-pointer text-primary focus:text-primary" disabled={isCreating || isLoadingOrder}>
                  <Wrench className="h-4 w-4 mr-2" />
                  {createdOrderCount > 0 ? `Criar OS (${createdOrderCount} já criadas)` : 'Criar OS'}
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>Tem certeza? Esta ação pode ser desfeita na lixeira.</AlertDialogDescription>
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

          {/* Info pills (like service-orders) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Reparo */}
            <div className="bg-muted/20 border border-border/30 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Reparo</span>
              </div>
              <div className="mt-0.5 font-medium text-sm text-foreground line-clamp-1">
                {budget.issue || budget.part_quality || '—'}
              </div>
            </div>

            {/* Valor */}
            <div className="bg-muted/20 border border-border/30 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Valor</span>
              </div>
              <div className="mt-0.5 font-medium text-sm text-foreground">
                {budget.cash_price ? formatCurrency(budget.cash_price) : budget.total_price ? formatCurrency(budget.total_price) : '—'}
              </div>
            </div>

            {/* Data */}
            <div className="bg-muted/20 border border-border/30 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Criação</span>
              </div>
              <div className="mt-0.5 font-medium text-sm text-foreground">
                {formatDate(budget.created_at)}
              </div>
            </div>

            {/* Qualidade */}
            <div className="bg-muted/20 border border-border/30 rounded-xl p-2.5">
              <div className="flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Qualidade</span>
              </div>
              <div className="mt-0.5 font-medium text-[12px] text-foreground break-words">
                {budget.part_quality || '—'}
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(expiryInfo || isOld) && (
            <div className="flex flex-wrap gap-2">
              {expiryInfo && (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs ${expiryInfo.isNear
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  }`}>
                  <Clock className="h-3 w-3" />
                  Restam {expiryInfo.remainingDays} dia{expiryInfo.remainingDays > 1 ? 's' : ''}
                </div>
              )}
              {isOld && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                  ⚠️ Antigo ({daysOld}d)
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">


            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-xl text-xs"
            >
              {isExpanded ? (
                <><ChevronUp className="h-3.5 w-3.5 mr-1.5" />Recolher</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5 mr-1.5" />Detalhes</>
              )}
            </Button>
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="space-y-3 pt-3 border-t border-border/30 animate-in slide-in-from-top-2 duration-300">
              {/* Informações */}
              <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">Informações</span>
                </div>

                {parts && parts.length > 0 ? (
                  <div className="space-y-3">
                    {parts.map((part: any) => {
                      const qty = part.quantity || 1;
                      const cashUnit = part.cash_price ? part.cash_price : part.price ?? 0;
                      const instUnit = part.installment_price || undefined;
                      const count = part.installment_count ?? 0;
                      const cashTotal = cashUnit * qty;
                      const installmentTotal = instUnit !== undefined ? (count && count > 1 ? instUnit * count * qty : instUnit * qty) : undefined;

                      return (
                        <div key={part.id} className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Qualidade</div>
                            <div className="font-medium text-sm">{part.part_type || '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Garantia</div>
                            <div className="font-medium text-sm">{part.warranty_months ? `${part.warranty_months} meses` : '—'}</div>
                          </div>
                          {cashTotal > 0 && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">À vista</div>
                              <div className="font-medium text-sm text-green-600 dark:text-green-400">{formatCurrency(cashTotal)}</div>
                            </div>
                          )}
                          {installmentTotal && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-0.5">Parcelado</div>
                              <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                                {formatCurrency(installmentTotal)}{count ? ` • ${count}x` : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Qualidade</div>
                      <div className="font-medium text-sm">{budget.part_quality || '—'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Garantia</div>
                      <div className="font-medium text-sm">{budget.warranty_months ? `${budget.warranty_months} meses` : '—'}</div>
                    </div>
                    {budget.cash_price && budget.cash_price > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">À vista</div>
                        <div className="font-medium text-sm text-green-600 dark:text-green-400">{formatCurrency(budget.cash_price)}</div>
                      </div>
                    )}
                    {budget.installment_price && budget.installments && budget.installments > 1 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Parcelado</div>
                        <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                          {formatCurrency(budget.installment_price * budget.installments)} • {budget.installments}x
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Botão Adicionar à Loja separado */}
              {parts && parts.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setIsImportToStoreOpen(true)} className="w-full rounded-xl border-primary/30 hover:bg-primary/10 text-foreground">
                  <Store className="h-4 w-4 mr-2" />
                  Adicionar à Loja
                </Button>
              )}

              {/* Service Order Actions */}
              {hasCreatedOrder && createdOrderId && (
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
                  <ServiceOrderActions createdOrderId={createdOrderId} formattedId={formattedId} compact={true} />
                </div>
              )}
            </div>
          )}
        </div>

        {isDeleting && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </div>

      {/* Sheets / Dialogs */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <WormBudgetForm budget={budget} onSuccess={handleEditSuccess} onCancel={() => setIsEditOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isActionsOpen} onOpenChange={setIsActionsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <WormBudgetActions budget={budget} onClose={() => setIsActionsOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isWhatsAppSelectorOpen} onOpenChange={setIsWhatsAppSelectorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <WormWhatsAppSelector budget={budget} onClose={() => setIsWhatsAppSelectorOpen(false)} />
        </SheetContent>
      </Sheet>

      <ServiceOrderCreationDialog open={isServiceOrderDialogOpen} onOpenChange={setIsServiceOrderDialogOpen} budget={budget} onConfirm={handleConfirmCreateServiceOrder} isCreating={isCreating} />

      <Sheet open={isNewBudgetWithDataOpen} onOpenChange={setIsNewBudgetWithDataOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <WormBudgetForm initialData={duplicatedBudgetData} onSuccess={handleNewBudgetSuccess} onCancel={() => setIsNewBudgetWithDataOpen(false)} />
        </SheetContent>
      </Sheet>

      <ImportToStoreDialog open={isImportToStoreOpen} onOpenChange={setIsImportToStoreOpen} budget={budget} parts={parts} />

      <Dialog open={isPdfDialogOpen} onOpenChange={setIsPdfDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Imprimir Orçamento</DialogTitle>
            <DialogDescription>
              Escolha o tamanho do papel para gerar o PDF térmico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 hover:bg-muted/50 hover:border-primary/50 transition-all"
              onClick={() => { handleGeneratePdf('58mm'); setIsPdfDialogOpen(false); }}
            >
              <Printer className="h-8 w-8 text-primary" />
              <div className="space-y-1">
                <div className="font-semibold">58mm</div>
                <div className="text-xs text-muted-foreground">Pequeno</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 hover:bg-muted/50 hover:border-primary/50 transition-all"
              onClick={() => { handleGeneratePdf('80mm'); setIsPdfDialogOpen(false); }}
            >
              <Printer className="h-10 w-10 text-primary" />
              <div className="space-y-1">
                <div className="font-semibold">80mm</div>
                <div className="text-xs text-muted-foreground">Padrão</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
