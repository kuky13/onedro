import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateWhatsAppMessage, shareViaWhatsApp, copyTextToClipboard } from '@/utils/whatsappUtils';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';
import { toast } from 'sonner';

export const useWormActions = () => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState<string | null>(null);

  const handleDelete = async (budgetId: string) => {
    try {
      setIsDeleting(budgetId);
      
      const { data, error } = await supabase.rpc('soft_delete_budget_with_audit', {
        p_budget_id: budgetId,
        p_deletion_reason: 'Exclusão via seção Worm'
      });

      if (error) {
        throw new Error(error.message || 'Erro ao excluir orçamento');
      }

      const response = data as any;
      if (!response?.success) {
        throw new Error(response?.error || 'Falha na exclusão do orçamento');
      }

      toast.success('Orçamento movido para a lixeira');
      return { success: true };
    } catch (error) {
      console.error('Error deleting budget:', error);
      const message = error instanceof Error ? error.message : 'Erro ao excluir orçamento';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsDeleting(null);
    }
  };

  const handleWhatsAppShare = async (budget: any, useTemplate: boolean = true) => {
    try {
      setIsSharing(budget.id);
      const userId = budget.owner_id || budget.user_id || budget.created_by;
      const { data: companyData } = await supabase
        .from('company_info')
        .select('name')
        .eq('owner_id', userId)
        .maybeSingle();
      const companyName = companyData?.name || 'Nossa Loja';
      let defaultTemplate = null;
      if (useTemplate) {
        const { data: template } = await supabase
          .from('whatsapp_message_templates')
          .select('*')
          .eq('user_id', userId)
          .eq('is_default', true)
          .single();
        defaultTemplate = template;
      }
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_parts (
            id,
            name,
            price,
            cash_price,
            installment_price,
            installment_count,
            quantity,
            warranty_months,
            part_type
          )
        `)
        .eq('id', budget.id)
        .single();
      if (error) {
        console.error('Erro ao buscar orçamento:', error);
        toast.error('Erro ao buscar dados do orçamento');
        return;
      }
      const budgetData = {
        id: fullBudget.id,
        client_name: fullBudget.client_name || 'Cliente',
        client_phone: fullBudget.client_phone || 'Não informado',
        device_model: fullBudget.device_model || 'Dispositivo',
        device_type: fullBudget.device_type || 'Smartphone',
        issue: fullBudget.issue || 'Não informado',
        part_type: fullBudget.part_type || 'Serviço',
        part_quality: fullBudget.part_quality || fullBudget.part_type || 'Padrão',
        cash_price: fullBudget.cash_price || fullBudget.total_price || 0,
        installment_price: fullBudget.installment_price || fullBudget.cash_price || fullBudget.total_price || 0,
        installments: fullBudget.installments || 1,
        total_price: fullBudget.total_price || fullBudget.cash_price || 0,
        warranty_months: fullBudget.warranty_months || 3,
        payment_condition: fullBudget.payment_condition || 'Não especificado',
        includes_delivery: fullBudget.includes_delivery || false,
        includes_screen_protector: fullBudget.includes_screen_protector || false,
        custom_services: fullBudget.custom_services || '',
        delivery_date: fullBudget.delivery_date || '',
        notes: fullBudget.notes || '',
        status: fullBudget.status || 'pending',
        workflow_status: fullBudget.workflow_status || 'pending',
        created_at: fullBudget.created_at,
        valid_until: fullBudget.valid_until || fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        // BudgetData (whatsappTemplateUtils) espera string; nunca enviar null
        expires_at: fullBudget.expires_at ?? (fullBudget.valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()),
        parts: (fullBudget as any).budget_parts || []
      };
      const message = defaultTemplate
        ? generateWhatsAppMessageFromTemplate(defaultTemplate.message_template, budgetData, companyName)
        : generateWhatsAppMessage(budgetData);
      shareViaWhatsApp(message);
      toast.success('Redirecionando para o WhatsApp...');
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      toast.error('Erro ao compartilhar via WhatsApp');
    } finally {
      setIsSharing(null);
    }
  };

  const handleCopyDeviceBudgets = async (budgets: any[]) => {
    if (!budgets || budgets.length === 0) return;
    try {
      const first = budgets[0];
      const userId = first.owner_id || first.user_id || first.created_by;
      setIsSharing(first.id);
      const { data: companyData } = await supabase
        .from('company_info')
        .select('name')
        .eq('owner_id', userId)
        .maybeSingle();
      const companyName = companyData?.name || 'Nossa Loja';
      const { data: template } = await supabase
        .from('whatsapp_message_templates')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      const budgetData: any = {
        device_model: first.device_model || 'Dispositivo',
        device_type: first.device_type || 'Smartphone',
        issue: first.issue || first.part_quality || first.part_type || 'Serviço',
        includes_delivery: first.includes_delivery || false,
        includes_screen_protector: first.includes_screen_protector || false,
        custom_services: first.custom_services || '',
        notes: first.notes || '',
        valid_until: first.valid_until || first.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        parts: budgets.map(b => ({
          name: b.part_quality || b.part_type || b.issue || 'Opção',
          cash_price: b.cash_price || b.total_price || 0,
          price: b.total_price || b.cash_price || 0,
          installment_price: b.installment_price || b.cash_price || b.total_price || 0,
          warranty_months: b.warranty_months || 0,
          installments: b.installments || b.installments_count || 0,
        })),
      };
      const message = template?.message_template
        ? generateWhatsAppMessageFromTemplate(template.message_template, budgetData, companyName)
        : generateWhatsAppMessage(budgetData);
      const ok = await copyTextToClipboard(message);
      if (ok) {
        toast.success('Orçamentos do aparelho copiados para a área de transferência');
      } else {
        toast.error('Não foi possível copiar o texto');
      }
    } catch (error) {
      console.error('Error copying device budgets message:', error);
      toast.error('Erro ao gerar mensagem dos orçamentos');
    } finally {
      setIsSharing(null);
    }
  };

  return {
    handleDelete,
    handleWhatsAppShare,
    handleCopyDeviceBudgets,
    isDeleting,
    isSharing
  };
};
