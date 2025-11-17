// ============================================
// FASE 4: WIZARD CONVERSACIONAL PARA CRIAÇÃO
// ============================================

import { BudgetData } from './budgetChatIntegration';
import { getMissingFields, validateBudgetData } from '@/utils/budgetValidation';

export type WizardStep = 
  | 'client_name'
  | 'client_phone'  
  | 'device_type'
  | 'device_model'
  | 'issue'
  | 'price'
  | 'confirm';

export interface WizardState {
  active: boolean;
  step: WizardStep;
  data: Partial<BudgetData>;
  conversationId?: string;
}

const WIZARD_KEY = 'budget_creation_wizard';

/**
 * Perguntas do wizard para cada campo
 */
export const wizardQuestions: Record<WizardStep, string> = {
  client_name: '👤 **Qual o nome do cliente?**',
  client_phone: '📱 **Qual o telefone?** (Ex: 11 99999-9999)',
  device_type: '🏭 **Qual a marca do aparelho?** (Ex: Samsung, Apple, Xiaomi)',
  device_model: '📱 **Qual o modelo do aparelho?** (Ex: iPhone 13, Galaxy A12, Redmi Note 10)',
  issue: '🔧 **Qual o problema/serviço?** (Ex: troca de tela, bateria, câmera)',
  price: '💰 **Qual o valor à vista?** (Ex: 150.00)',
  confirm: '✅ **Confirmar criação do orçamento?**\n\nDigite "confirmar" para criar ou "cancelar" para desistir.'
};

/**
 * Labels amigáveis para exibição
 */
export const fieldLabels: Record<string, string> = {
  client_name: 'Cliente',
  client_phone: 'Telefone',
  device_type: 'Marca',
  device_model: 'Modelo',
  issue: 'Serviço',
  price: 'Valor'
};

/**
 * Salva estado do wizard no localStorage
 */
export function saveWizardState(userId: string, state: WizardState): void {
  const key = `${WIZARD_KEY}_${userId}`;
  localStorage.setItem(key, JSON.stringify(state));
  console.log('[WIZARD] Estado salvo:', state.step);
}

/**
 * Recupera estado do wizard do localStorage
 */
export function getWizardState(userId: string): WizardState | null {
  const key = `${WIZARD_KEY}_${userId}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) return null;
  
  try {
    const state = JSON.parse(stored);
    console.log('[WIZARD] Estado recuperado:', state.step);
    return state;
  } catch {
    return null;
  }
}

/**
 * Limpa estado do wizard
 */
export function clearWizardState(userId: string): void {
  const key = `${WIZARD_KEY}_${userId}`;
  localStorage.removeItem(key);
  console.log('[WIZARD] Estado limpo');
}

/**
 * Determina próximo passo do wizard
 */
export function getNextStep(currentStep: WizardStep, data: Partial<BudgetData>): WizardStep | null {
  const stepOrder: WizardStep[] = [
    'client_name',
    'client_phone',
    'device_type',
    'device_model',
    'issue',
    'price',
    'confirm'
  ];
  
  // Encontra campos faltantes
  const missing = getMissingFields(data);
  
  // Se não há campos faltantes, vai para confirmação
  if (missing.length === 0) {
    return currentStep === 'confirm' ? null : 'confirm';
  }
  
  // Encontra próximo campo faltante
  for (const step of stepOrder) {
    if (missing.includes(step)) {
      return step;
    }
  }
  
  return 'confirm';
}

/**
 * Inicia wizard com dados parciais
 */
export function startWizard(
  userId: string,
  initialData: Partial<BudgetData> = {},
  conversationId?: string
): WizardState {
  const missing = getMissingFields(initialData);
  const firstMissingField = missing[0] || 'client_name';
  
  const state: WizardState = {
    active: true,
    step: firstMissingField as WizardStep,
    data: initialData,
    conversationId
  };
  
  saveWizardState(userId, state);
  console.log('[WIZARD] Iniciado:', firstMissingField, 'Dados iniciais:', initialData);
  
  return state;
}

/**
 * Processa resposta do usuário e atualiza wizard
 */
export function processWizardResponse(
  userId: string,
  currentState: WizardState,
  userInput: string
): {
  state: WizardState;
  message: string;
  completed: boolean;
  cancelled: boolean;
} {
  const step = currentState.step;
  const data = { ...currentState.data };
  
  console.log('[WIZARD] Processando resposta:', step, userInput);
  
  // Tratamento especial para confirmação
  if (step === 'confirm') {
    const input = userInput.toLowerCase().trim();
    
    if (input.includes('confirm') || input.includes('sim') || input === 's') {
      return {
        state: currentState,
        message: '✅ Orçamento confirmado! Criando...',
        completed: true,
        cancelled: false
      };
    }
    
    if (input.includes('cancel') || input.includes('não') || input === 'n') {
      clearWizardState(userId);
      return {
        state: currentState,
        message: '❌ Criação cancelada.',
        completed: false,
        cancelled: true
      };
    }
  }
  
  // Atualiza campo atual
  const value = userInput.trim();
  
  switch (step) {
    case 'client_name':
      data.client_name = value;
      break;
      
    case 'client_phone':
      data.client_phone = value.replace(/\D/g, ''); // Remove não-numéricos
      break;
      
    case 'device_type':
      data.device_type = value;
      break;
      
    case 'device_model':
      data.device_model = value;
      break;
      
    case 'issue':
      data.issue = value;
      data.part_quality = value; // Usar mesmo valor para os dois
      break;
      
    case 'price':
      const priceValue = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(priceValue) && priceValue > 0) {
        data.cash_price = priceValue;
        data.total_price = priceValue;
      } else {
        return {
          state: currentState,
          message: '❌ Valor inválido. Por favor, digite um número válido (Ex: 150.00)',
          completed: false,
          cancelled: false
        };
      }
      break;
  }
  
  // Determina próximo passo
  const nextStep = getNextStep(step, data);
  
  if (!nextStep) {
    // Wizard completo!
    return {
      state: { ...currentState, data },
      message: '✅ Orçamento confirmado! Criando...',
      completed: true,
      cancelled: false
    };
  }
  
  // Atualiza estado
  const newState: WizardState = {
    ...currentState,
    step: nextStep,
    data
  };
  
  saveWizardState(userId, newState);
  
  // Monta mensagem de confirmação + próxima pergunta
  let message = `✅ ${fieldLabels[step]}: **${value}**\n\n`;
  message += wizardQuestions[nextStep];
  
  return {
    state: newState,
    message,
    completed: false,
    cancelled: false
  };
}

/**
 * Gera resumo dos dados coletados
 */
export function generateWizardSummary(data: Partial<BudgetData>): string {
  const lines: string[] = ['📋 **Resumo do Orçamento:**\n'];
  
  if (data.client_name) {
    lines.push(`👤 Cliente: **${data.client_name}**`);
  }
  
  if (data.client_phone) {
    lines.push(`📱 Telefone: **${data.client_phone}**`);
  }
  
  if (data.device_type) {
    lines.push(`🏭 Marca: **${data.device_type}**`);
  }
  
  if (data.device_model) {
    lines.push(`📱 Modelo: **${data.device_model}**`);
  }
  
  if (data.issue || data.part_quality) {
    lines.push(`🔧 Serviço: **${data.issue || data.part_quality}**`);
  }
  
  if (data.cash_price) {
    lines.push(`💰 Valor: **R$ ${data.cash_price.toFixed(2)}**`);
  }
  
  return lines.join('\n');
}

/**
 * Verifica se input parece cancelamento
 */
export function isCancellationIntent(input: string): boolean {
  const cancellationWords = [
    'cancelar',
    'desistir',
    'parar',
    'sair',
    'não quero',
    'esquece'
  ];
  
  const lowerInput = input.toLowerCase();
  return cancellationWords.some(word => lowerInput.includes(word));
}
