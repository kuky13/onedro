import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { generateWhatsAppMessage, shareViaWhatsApp, copyTextToClipboard } from '@/utils/whatsappUtils';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useBudgetParts } from '@/hooks/worm/useBudgetParts';

interface WormWhatsAppSelectorProps {
  budget: any;
  onClose: () => void;
}

export const WormWhatsAppSelector: React.FC<WormWhatsAppSelectorProps> = ({ budget, onClose }) => {
  const { user, profile } = useAuth();
  const [copiedActions, setCopiedActions] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<any>(null);
  
  // Fetch budget parts data
  const { data: budgetParts = [] } = useBudgetParts(budget?.id);

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

  const handleCopyMessage = async () => {
    if (isProcessing) return;
    
    setIsProcessing('copy');
    try {
      // Buscar nome da empresa
      let companyName = 'Nossa Loja';
      if (user?.id) {
        const { data: companyData } = await supabase
          .from('company_info')
          .select('name')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        if (companyData?.name) {
          companyName = companyData.name;
        }
      }

      // Buscar perfil da loja como fallback
      if (companyName === 'Nossa Loja') {
        const { data: shopData } = await supabase
          .from('shop_profiles')
          .select('shop_name')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (shopData?.shop_name) {
          companyName = shopData.shop_name;
        }
      }

      // Buscar perfil da loja como fallback
      if (companyName === 'Nossa Loja') {
        const { data: shopData } = await supabase
          .from('shop_profiles')
          .select('shop_name')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (shopData?.shop_name) {
          companyName = shopData.shop_name;
        }
      }

      // Preparar dados completos do orçamento incluindo peças
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
        // Incluir dados das peças
        parts: budgetParts.map(part => ({
          name: part.part_type || part.name || 'Peça',
          quantity: part.quantity || 1,
          price: part.price ? (part.price / 100) : 0,
          cash_price: part.cash_price ? (part.cash_price / 100) : (part.price ? (part.price / 100) : 0),
          installment_price: part.installment_price ? (part.installment_price / 100) : (part.price ? (part.price / 100) : 0),
          // Propagar número de parcelas individual da peça
          installment_count: part.installment_count ?? part.installments_count ?? part.installments ?? null,
          warranty_months: part.warranty_months || budget.warranty_months || 3
        }))
      };

      // Usar template padrão se disponível, senão usar função legada
      const message = defaultTemplate 
        ? generateWhatsAppMessageFromTemplate(defaultTemplate.message_template, budgetData, companyName, profile?.budget_warning_days)
        : generateWhatsAppMessage(budgetData, profile?.budget_warning_days);
      
      const ok = await copyTextToClipboard(message);
      if (!ok) {
        throw new Error('clipboard-failed');
      }
      
      setCopiedActions(prev => new Set([...prev, 'copy']));
      toast.success('Mensagem copiada para a área de transferência!');
      
      // Auto-close after 2 seconds
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
      // Buscar nome da empresa
      let companyName = 'Nossa Loja';
      if (user?.id) {
        const { data: companyData } = await supabase
          .from('company_info')
          .select('name')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        if (companyData?.name) {
          companyName = companyData.name;
        }
      }

      // Preparar dados completos do orçamento incluindo peças
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
        // Incluir dados das peças
        parts: budgetParts.map(part => ({
          name: part.part_type || part.name || 'Peça',
          quantity: part.quantity || 1,
          price: part.price ? (part.price / 100) : 0,
          cash_price: part.cash_price ? (part.cash_price / 100) : (part.price ? (part.price / 100) : 0),
          installment_price: part.installment_price ? (part.installment_price / 100) : (part.price ? (part.price / 100) : 0),
          // Propagar número de parcelas individual da peça
          installment_count: part.installment_count ?? part.installments_count ?? part.installments ?? null,
          warranty_months: part.warranty_months || budget.warranty_months || 3
        }))
      };

      // Usar template padrão se disponível, senão usar função legada
      const message = defaultTemplate 
        ? generateWhatsAppMessageFromTemplate(defaultTemplate.message_template, budgetData, companyName, profile?.budget_warning_days)
        : generateWhatsAppMessage(budgetData, profile?.budget_warning_days);
      
      // Abrir WhatsApp com utilitário robusto para iOS
      shareViaWhatsApp(message);
      
      setCopiedActions(prev => new Set([...prev, 'send']));
      toast.success('Redirecionando para o WhatsApp...');
      
      // Auto-close after successful send
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
    <div className="space-y-6">
      <SheetHeader>
        <SheetTitle>Compartilhar via WhatsApp</SheetTitle>
      </SheetHeader>

      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium">Orçamento</h3>
            <span className="bg-primary/10 px-2 py-1 rounded-md text-sm font-mono font-medium text-primary">
              {budget.sequential_number 
                ? `OS: ${budget.sequential_number.toString().padStart(4, '0')}` 
                : `OS-${budget.id?.slice(-8)}`
              }
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {budget.client_name} - {budget.device_type} {budget.device_model}
          </p>
          {budget.client_phone && (
            <p className="text-sm text-muted-foreground mt-1">
              📞 {budget.client_phone}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* Copiar Mensagem */}
          <Button 
            onClick={handleCopyMessage}
            disabled={!!isProcessing}
            className="w-full justify-between h-16 p-4"
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                {isActionProcessing('copy') ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                ) : isActionCompleted('copy') ? (
                  <Check className="h-5 w-5 text-success" />
                ) : (
                  <Copy className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-left">
                <div className="font-medium">Copiar Mensagem</div>
                <div className="text-sm text-muted-foreground">
                  Copiar texto para enviar manualmente
                </div>
              </div>
            </div>
            {isActionCompleted('copy') && (
              <span className="text-sm text-success font-medium">
                Copiado
              </span>
            )}
          </Button>

          {/* Enviar Diretamente */}
          <Button 
            onClick={handleSendWhatsApp}
            disabled={!!isProcessing}
            className="w-full justify-between h-16 p-4 bg-green-600 hover:bg-green-700 text-white"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                {isActionProcessing('send') ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                ) : isActionCompleted('send') ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
              </div>
              <div className="text-left">
                <div className="font-medium">Enviar WhatsApp</div>
                <div className="text-sm opacity-90">
                  Abrir WhatsApp para compartilhar
                </div>
              </div>
            </div>
            {isActionCompleted('send') && (
              <span className="text-sm font-medium">
                Enviado
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};