// ============================================
// FASE 5: SERVIÇO DE ENVIO WHATSAPP
// ============================================

import { BudgetData } from './budgetChatIntegration';
import { supabase } from '@/integrations/supabase/client';
import { 
  createWhatsAppUrl, 
  validateBeforeSend,
  validateMessageLength,
  preparePhoneForWhatsApp
} from '@/utils/whatsappValidation';
import { generateWhatsAppMessageFromTemplate } from '@/utils/whatsappTemplateUtils';
import { toast } from 'sonner';

export interface SendOptions {
  method: 'whatsapp' | 'copy' | 'custom';
  customPhone?: string;
  showPreview?: boolean;
}

export interface SendResult {
  success: boolean;
  error?: string;
  url?: string;
  message?: string;
}

/**
 * Envia orçamento via WhatsApp
 */
export async function sendBudgetMessage(
  budget: BudgetData,
  template: string,
  companyName: string,
  userId: string,
  options: SendOptions = { method: 'whatsapp' }
): Promise<SendResult> {
  try {
    // Validar antes de enviar
    const validation = await validateBeforeSend(budget, !!template);
    
    if (!validation.canSend) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }
    
    // Gerar mensagem formatada
    const message = generateWhatsAppMessageFromTemplate(
      template,
      budget,
      companyName,
      30 // dias de validade
    );
    
    // Validar tamanho da mensagem
    const lengthValidation = validateMessageLength(message);
    if (!lengthValidation.valid) {
      return {
        success: false,
        error: lengthValidation.warning
      };
    }
    
    // Determinar telefone de destino
    let targetPhone = budget.client_phone || '';
    if (options.method === 'custom' && options.customPhone) {
      targetPhone = options.customPhone;
    }
    
    if (!targetPhone) {
      return {
        success: false,
        error: 'Nenhum telefone informado'
      };
    }
    
    const cleanPhone = preparePhoneForWhatsApp(targetPhone);
    
    // Executar ação baseada no método
    switch (options.method) {
      case 'whatsapp': {
        const url = createWhatsAppUrl(cleanPhone, message);
        
        // Salvar histórico de envio
        await saveWhatsAppSend(budget.id || '', cleanPhone, message, userId);
        
        // Abrir WhatsApp
        window.open(url, '_blank');
        
        return {
          success: true,
          url,
          message
        };
      }
      
      case 'copy': {
        // Copiar para clipboard
        await navigator.clipboard.writeText(message);
        
        toast.success('Mensagem copiada!', {
          description: 'Cole no WhatsApp do cliente'
        });
        
        return {
          success: true,
          message
        };
      }
      
      case 'custom': {
        if (!options.customPhone) {
          return {
            success: false,
            error: 'Telefone customizado não informado'
          };
        }
        
        const url = createWhatsAppUrl(cleanPhone, message);
        
        // Salvar histórico
        await saveWhatsAppSend(budget.id || '', cleanPhone, message, userId);
        
        // Abrir WhatsApp
        window.open(url, '_blank');
        
        return {
          success: true,
          url,
          message
        };
      }
      
      default:
        return {
          success: false,
          error: 'Método de envio inválido'
        };
    }
  } catch (error) {
    console.error('[WHATSAPP_SERVICE] Erro ao enviar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Salva histórico de envio no banco
 */
async function saveWhatsAppSend(
  budgetId: string,
  phone: string,
  message: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('whatsapp_sends')
      .insert({
        budget_id: budgetId,
        phone,
        message,
        user_id: userId,
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('[WHATSAPP_SERVICE] Erro ao salvar histórico:', error);
    }
  } catch (error) {
    console.error('[WHATSAPP_SERVICE] Exceção ao salvar histórico:', error);
  }
}

/**
 * Busca histórico de envios de um usuário
 */
export async function getWhatsAppHistory(
  userId: string,
  limit: number = 20
): Promise<Array<{
  id: string;
  budget_id: string;
  phone: string;
  sent_at: string;
  budget?: BudgetData;
}>> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_sends')
      .select(`
        id,
        budget_id,
        phone,
        sent_at,
        budgets (
          id,
          client_name,
          device_model,
          sequential_number,
          cash_price
        )
      `)
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      budget_id: item.budget_id,
      phone: item.phone,
      sent_at: item.sent_at,
      budget: item.budgets ? {
        id: item.budgets.id,
        client_name: item.budgets.client_name,
        device_model: item.budgets.device_model,
        sequential_number: item.budgets.sequential_number,
        cash_price: item.budgets.cash_price
      } as any : undefined
    }));
  } catch (error) {
    console.error('[WHATSAPP_SERVICE] Erro ao buscar histórico:', error);
    return [];
  }
}

/**
 * Reenvia uma mensagem anterior
 */
export async function resendPreviousMessage(
  historyId: string,
  userId: string
): Promise<SendResult> {
  try {
    // Buscar mensagem do histórico
    const { data, error } = await supabase
      .from('whatsapp_sends')
      .select('phone, message, budget_id')
      .eq('id', historyId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return {
        success: false,
        error: 'Mensagem não encontrada no histórico'
      };
    }
    
    // Criar URL e abrir
    const url = createWhatsAppUrl(data.phone, data.message);
    window.open(url, '_blank');
    
    // Salvar novo envio
    await saveWhatsAppSend(data.budget_id, data.phone, data.message, userId);
    
    return {
      success: true,
      url,
      message: data.message
    };
  } catch (error) {
    console.error('[WHATSAPP_SERVICE] Erro ao reenviar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao reenviar'
    };
  }
}
