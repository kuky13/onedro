import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { SheetTitle } from '@/components/ui/sheet';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { generateWhatsAppMessage, shareViaWhatsApp, copyTextToClipboard, isIOS } from '@/utils/whatsappUtils';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useBudgetParts } from '@/hooks/worm/useBudgetParts';

interface WormWhatsAppSelectorProps {
  budget?: any;
  budgets?: any[];
  onClose: () => void;
}

export const WormWhatsAppSelector: React.FC<WormWhatsAppSelectorProps> = ({ budget, budgets, onClose }) => {
  const { user, profile } = useAuth();
  const [copiedActions, setCopiedActions] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<any>(null);
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isiOS = isIOS();
  
  // Se for array de orçamentos, usar o ID do primeiro para as peças se necessário
  const targetBudgetId = budgets ? budgets[0]?.id : budget?.id;
  const { data: budgetParts = [] } = useBudgetParts(targetBudgetId);

  useEffect(() => {
    const fetchDefaultTemplate = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('whatsapp_message_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        
        if (data) {
          setDefaultTemplate(data);
        }
      } catch (error) {
        console.error('Error fetching default template:', error);
      }
    };

    fetchDefaultTemplate();
  }, [user?.id]);

  useEffect(() => {
    const prepareMessage = async () => {
      if (!user?.id) return;
      
      let companyName = 'Nossa Loja';
      try {
        const { data: companyData } = await supabase
          .from('company_info')
          .select('name')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (companyData?.name) companyName = companyData.name;
      } catch {
        // Ignore
      }

      if (companyName === 'Nossa Loja') {
        try {
          const { data: shopData } = await supabase
            .from('shop_profiles')
            .select('shop_name')
            .eq('user_id', user?.id)
            .maybeSingle();
          if (shopData?.shop_name) companyName = shopData.shop_name;
        } catch {
          // Ignore
        }
      }

      let message = '';

      if (budgets && budgets.length > 0) {
        // Múltiplos orçamentos
        const first = budgets[0];
        const budgetData: any = {
          device_model: first.device_model || 'Dispositivo',
          device_type: first.device_type || 'Smartphone',
          issue: first.issue || first.part_quality || first.part_type || 'Serviço',
          includes_delivery: first.includes_delivery || false,
          includes_screen_protector: first.includes_screen_protector || false,
          custom_services: first.custom_services || '',
          notes: first.notes || '',
          shop_name: companyName,
          valid_until: first.valid_until || first.expires_at || new Date(Date.now() + (profile?.budget_warning_days || 15) * 24 * 60 * 60 * 1000).toISOString(),
          parts: budgets.map(b => ({
            name: b.part_quality || b.part_type || b.issue || 'Opção',
            cash_price: b.cash_price || b.total_price || 0,
            price: b.total_price || b.cash_price || 0,
            installment_price: b.installment_price || b.cash_price || b.total_price || 0,
            warranty_months: b.warranty_months || 0,
            installments: b.installments || b.installments_count || 0,
          })),
        };
        
        message = defaultTemplate?.message_template
          ? generateWhatsAppMessageFromTemplate(defaultTemplate.message_template, budgetData, companyName, profile?.budget_warning_days)
          : generateWhatsAppMessage(budgetData, profile?.budget_warning_days);
      } else if (budget) {
        // Orçamento único
        const budgetData = {
          id: budget.id,
          client_name: budget.client_name || 'Cliente',
          client_phone: budget.client_phone || 'Não informado',
          device_model: budget.device_model || 'Dispositivo',
          device_type: budget.device_type || 'Smartphone',
          issue: budget.issue || 'Não informado',
          part_type: budget.part_type || 'Serviço',
          part_quality: budget.part_quality || budget.part_type || 'Padrão',
          cash_price: budget.cash_price || budget.total_price || 0,
          installment_price: budget.installment_price || budget.cash_price || budget.total_price || 0,
          installments: budget.installments || 1,
          installments_count: budget.installments_count || 0,
          total_price: budget.total_price || budget.cash_price || 0,
          warranty_months: budget.warranty_months || 3,
          payment_condition: budget.payment_condition || 'Não especificado',
          shop_name: companyName,
          includes_delivery: budget.includes_delivery || false,
          includes_screen_protector: budget.includes_screen_protector || false,
          custom_services: budget.custom_services || '',
          delivery_date: budget.delivery_date,
          notes: budget.notes || '',
          status: budget.status || 'pending',
          workflow_status: budget.workflow_status || 'pending',
          created_at: budget.created_at,
          valid_until: budget.valid_until || budget.expires_at || new Date(Date.now() + (profile?.budget_warning_days || 15) * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: budget.expires_at,
          parts: budgetParts.map(part => ({
            name: part.part_type || part.name || 'Peça',
            quantity: part.quantity || 1,
            price: part.price ? (part.price / 100) : 0,
            cash_price: part.cash_price ? (part.cash_price / 100) : (part.price ? (part.price / 100) : 0),
            installment_price: part.installment_price ? (part.installment_price / 100) : (part.price ? (part.price / 100) : 0),
            installment_count: part.installment_count ?? null,
            warranty_months: part.warranty_months || budget.warranty_months || 3
          }))
        } as any;
        
        message = defaultTemplate 
          ? generateWhatsAppMessageFromTemplate(defaultTemplate.message_template, budgetData, companyName, profile?.budget_warning_days)
          : generateWhatsAppMessage(budgetData, profile?.budget_warning_days);
      }
      
      setPreviewMessage(message);
    };

    prepareMessage();
  }, [isiOS, user?.id, defaultTemplate, budgetParts, budget, budgets, profile?.budget_warning_days]);

  const handleCopyMessage = async () => {
    if (isProcessing) return;
    
    setIsProcessing('copy');
    try {
      if (isiOS) {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(0, 99999);
        const ok = document.execCommand('copy');
        if (ok) {
          setCopiedActions(prev => new Set([...prev, 'copy']));
          toast.success('Copiado para a área de transferência!');
        } else {
          toast.info('Selecione o texto e copie manualmente');
        }
        return;
      }
      
      const ok = await copyTextToClipboard(previewMessage);
      if (!ok) {
        throw new Error('clipboard-failed');
      }
      
      setCopiedActions(prev => new Set([...prev, 'copy']));
      toast.success('Mensagem copiada!');
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error copying message:', error);
      toast.error('Erro ao copiar mensagem');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendWhatsApp = async () => {
    if (isProcessing) return;
    
    setIsProcessing('send');
    try {
      shareViaWhatsApp(previewMessage);
      setCopiedActions(prev => new Set([...prev, 'copy', 'send']));
      toast.success('Redirecionando para o WhatsApp...');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('Erro ao enviar para WhatsApp');
    } finally {
      setIsProcessing(null);
    }
  };

  const isActionCompleted = (action: string) => copiedActions.has(action);
  const isActionProcessing = (action: string) => isProcessing === action;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 pb-2 border-b">
        <SheetTitle className="text-xl font-bold">Compartilhar Orçamento</SheetTitle>
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">
              {budgets ? 'Múltiplos Orçamentos' : 'Orçamento Único'}
            </h3>
            <span className="bg-primary/10 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-primary border border-primary/20">
              {budgets ? `${budgets.length} opções` : (budget?.sequential_number ? `OR: ${budget.sequential_number.toString().padStart(4, '0')}` : 'NOVO')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {budgets ? budgets[0]?.device_model : budget?.client_name}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Prévia da Mensagem</h4>
            {isiOS && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary h-7 px-2"
                onClick={() => {
                  textareaRef.current?.focus();
                  textareaRef.current?.select();
                }}
              >
                Selecionar Tudo
              </Button>
            )}
          </div>
          
          <div className="relative group">
            <textarea
              ref={textareaRef}
              readOnly
              value={previewMessage}
              className="w-full h-64 rounded-xl border border-border/50 bg-muted/30 p-4 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none scrollbar-thin"
              placeholder="Gerando mensagem..."
            />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none rounded-b-xl" />
          </div>
          
          {isiOS && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-blue-500">i</span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-tight">
                No iPhone, você pode tocar em <strong>Selecionar Tudo</strong> e depois em <strong>Copiar</strong> no menu do sistema, ou usar o botão abaixo.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 pb-8">
          <Button 
            onClick={handleCopyMessage}
            disabled={!!isProcessing || !previewMessage}
            className={`w-full justify-between h-14 px-4 transition-all duration-300 ${isActionCompleted('copy') ? 'bg-success/10 border-success/30 text-success' : 'hover:border-primary/50'}`}
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isActionCompleted('copy') ? 'bg-success/20' : 'bg-muted'}`}>
                {isActionProcessing('copy') ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                ) : isActionCompleted('copy') ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Copiar Texto</div>
                <div className="text-[10px] text-muted-foreground">
                  {isiOS ? 'Copia para sua área de transferência' : 'Pronto para colar onde quiser'}
                </div>
              </div>
            </div>
            {isActionCompleted('copy') && (
              <span className="text-xs font-bold uppercase tracking-wider">Copiado</span>
            )}
          </Button>

          <Button 
            onClick={handleSendWhatsApp}
            disabled={!!isProcessing || !previewMessage}
            className="w-full justify-between h-14 px-4 bg-[#25D366] hover:bg-[#128C7E] text-white border-0 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
                {isActionProcessing('send') ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">Enviar WhatsApp</div>
                <div className="text-[10px] opacity-80">Abrir conversa no WhatsApp</div>
              </div>
            </div>
            <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full h-12 text-muted-foreground hover:text-foreground"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};