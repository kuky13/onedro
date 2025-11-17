// ============================================
// FASE 5: VALIDAÇÃO DE ENVIO WHATSAPP
// ============================================

import { BudgetData } from '@/services/budgetChatIntegration';
import { isValidBrazilianPhone } from './budgetValidation';

export interface WhatsAppValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canSend: boolean;
}

/**
 * Valida se um orçamento pode ser enviado via WhatsApp
 */
export async function validateBeforeSend(
  budget: BudgetData,
  hasTemplate: boolean = false
): Promise<WhatsAppValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Verificar telefone
  if (!budget.client_phone) {
    errors.push('Cliente não tem telefone cadastrado');
  } else if (!isValidBrazilianPhone(budget.client_phone)) {
    errors.push('Telefone inválido. Formato esperado: (11) 99999-9999');
  }
  
  // Verificar template
  if (!hasTemplate) {
    warnings.push('Usando template padrão. Configure seu template em Configurações > WhatsApp');
  }
  
  // Verificar dados essenciais do orçamento
  if (!budget.device_model) {
    warnings.push('Modelo do aparelho não informado no orçamento');
  }
  
  if (!budget.cash_price || budget.cash_price <= 0) {
    warnings.push('Preço não informado ou inválido no orçamento');
  }
  
  if (!budget.client_name) {
    warnings.push('Nome do cliente não informado');
  }
  
  // Verificar expiração
  if (budget.expires_at) {
    const expiresAt = new Date(budget.expires_at);
    const now = new Date();
    
    if (expiresAt < now) {
      warnings.push('⚠️ Orçamento expirado! Considere atualizar a data de validade.');
    }
  }
  
  // Verificar status
  if (budget.workflow_status === 'completed') {
    warnings.push('Orçamento já foi concluído');
  }
  
  if (budget.workflow_status === 'cancelled') {
    warnings.push('Orçamento foi cancelado');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    canSend: errors.length === 0
  };
}

/**
 * Prepara número de telefone para WhatsApp
 * Remove caracteres especiais e adiciona código do país
 */
export function preparePhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tem o código do país (55), adiciona
  if (!cleaned.startsWith('55') && cleaned.length >= 10) {
    return '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Cria URL do WhatsApp com mensagem pré-formatada
 */
export function createWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = preparePhoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Valida se uma mensagem está dentro do limite do WhatsApp
 * WhatsApp tem um limite de ~65535 caracteres, mas é bom manter menor
 */
export function validateMessageLength(message: string): {
  valid: boolean;
  length: number;
  warning?: string;
} {
  const length = message.length;
  const maxLength = 4096; // Limite seguro para URLs
  const warningLength = 3000;
  
  if (length > maxLength) {
    return {
      valid: false,
      length,
      warning: `Mensagem muito longa (${length} caracteres). Limite: ${maxLength}`
    };
  }
  
  if (length > warningLength) {
    return {
      valid: true,
      length,
      warning: `Mensagem próxima do limite (${length}/${maxLength} caracteres)`
    };
  }
  
  return {
    valid: true,
    length
  };
}
