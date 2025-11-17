// ============================================
// FASE 4: VALIDAÇÃO DE ORÇAMENTOS
// ============================================

import { BudgetData } from '@/services/budgetChatIntegration';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valida se um número de telefone é válido no formato brasileiro
 */
export function isValidBrazilianPhone(phone: string): boolean {
  if (!phone) return false;
  
  // Remove caracteres especiais
  const cleaned = phone.replace(/\D/g, '');
  
  // Valida formato: (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
  // Aceita 10 ou 11 dígitos (com ou sem o 9 na frente)
  return /^(\d{2})9?\d{4}\d{4}$/.test(cleaned);
}

/**
 * Normaliza um número de telefone brasileiro
 */
export function normalizeBrazilianPhone(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // (XX) 9XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    // (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone; // Retorna original se não conseguir normalizar
}

/**
 * Valida dados completos de um orçamento
 */
export function validateBudgetData(data: Partial<BudgetData>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validações obrigatórias
  if (!data.client_name?.trim()) {
    errors.push('Nome do cliente é obrigatório');
  }
  
  if (!data.device_model?.trim()) {
    errors.push('Modelo do aparelho é obrigatório');
  }
  
  if (!data.issue?.trim() && !data.part_quality?.trim()) {
    errors.push('Problema/serviço é obrigatório');
  }
  
  if (!data.cash_price && !data.total_price) {
    errors.push('Preço é obrigatório');
  }
  
  // Validações opcionais com avisos
  if (data.client_phone && !isValidBrazilianPhone(data.client_phone)) {
    errors.push('Telefone inválido. Use formato: (11) 99999-9999');
  }
  
  if (!data.client_phone) {
    warnings.push('Telefone não informado. Não será possível enviar via WhatsApp.');
  }
  
  if (data.cash_price && data.cash_price <= 0) {
    errors.push('Preço deve ser maior que zero');
  }
  
  if (data.cash_price && data.cash_price > 50000) {
    warnings.push('Preço muito alto. Verifique se está correto.');
  }
  
  if (!data.warranty_months) {
    warnings.push('Garantia não informada');
  }
  
  if (!data.device_type) {
    warnings.push('Marca do aparelho não informada');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Valida apenas campos essenciais (para validação rápida durante wizard)
 */
export function validateEssentialFields(data: Partial<BudgetData>): boolean {
  return !!(
    data.client_name?.trim() &&
    data.device_model?.trim() &&
    (data.issue?.trim() || data.part_quality?.trim())
  );
}

/**
 * Retorna lista de campos faltantes
 */
export function getMissingFields(data: Partial<BudgetData>): string[] {
  const missing: string[] = [];
  
  if (!data.client_name?.trim()) missing.push('client_name');
  if (!data.client_phone?.trim()) missing.push('client_phone');
  if (!data.device_model?.trim()) missing.push('device_model');
  if (!data.device_type?.trim()) missing.push('device_type');
  if (!data.issue?.trim() && !data.part_quality?.trim()) missing.push('issue');
  if (!data.cash_price && !data.total_price) missing.push('price');
  
  return missing;
}
