// ============================================
// FASE 3: VALIDAÇÃO DE RESPOSTAS DA IA
// ============================================

import { BudgetData } from '@/services/budgetChatIntegration';

/**
 * Extrai números/preços mencionados em um texto
 */
function extractNumbers(text: string): number[] {
  const numbers: number[] = [];
  
  // Padrões de preços brasileiros
  const patterns = [
    /R\$\s*[\d.,]+/g,  // R$ 123.45 ou R$ 123,45
    /[\d.,]+\s*reais/gi, // 123 reais
    /valor.*?[\d.,]+/gi  // valor de 123
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Extrai apenas os números
        const numStr = match.replace(/[^\d.,]/g, '');
        const num = parseFloat(numStr.replace(',', '.'));
        if (!isNaN(num)) {
          numbers.push(num);
        }
      }
    }
  }
  
  return numbers;
}

/**
 * Extrai modelos de dispositivos mencionados
 */
function extractDeviceModels(text: string): string[] {
  const models: string[] = [];
  
  // Padrões comuns
  const patterns = [
    /\b(iPhone\s+\d+[^,.\s]*)/gi,
    /\b(Galaxy\s+[A-Z]\d+[^,.\s]*)/gi,
    /\b(Redmi\s+\d+[^,.\s]*)/gi,
    /\b([A-Z]\d{2}[^,.\s]*)/gi, // A12, S21, etc
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      models.push(...matches);
    }
  }
  
  return models.map(m => m.trim());
}

/**
 * Valida se a resposta da IA contém apenas dados reais
 */
export function validateAIResponse(
  aiResponse: string, 
  realData: BudgetData[]
): {
  valid: boolean;
  suspiciousItems: string[];
  confidence: number;
} {
  const suspiciousItems: string[] = [];
  
  // 1. Verificar preços mencionados
  const mentionedPrices = extractNumbers(aiResponse);
  const realPrices = realData.flatMap(b => [
    b.cash_price || 0,
    b.installment_price || 0,
    b.total_price || 0
  ].filter(p => p > 0));
  
  for (const price of mentionedPrices) {
    // Tolera diferença de até 1% (arredondamentos)
    const hasMatch = realPrices.some(rp => 
      Math.abs(price - rp) / rp < 0.01
    );
    
    if (!hasMatch && price > 10) { // Ignora números muito pequenos
      suspiciousItems.push(`Preço suspeito: R$ ${price.toFixed(2)}`);
    }
  }
  
  // 2. Verificar modelos mencionados
  const mentionedModels = extractDeviceModels(aiResponse);
  const realModels = realData
    .map(b => b.device_model?.toLowerCase().trim())
    .filter(Boolean);
  
  for (const model of mentionedModels) {
    const hasMatch = realModels.some(rm => 
      rm?.includes(model.toLowerCase()) || 
      model.toLowerCase().includes(rm || '')
    );
    
    if (!hasMatch) {
      suspiciousItems.push(`Modelo suspeito: ${model}`);
    }
  }
  
  // 3. Verificar se menciona números de orçamento
  const budgetNumbers = aiResponse.match(/#(\d+)/g);
  if (budgetNumbers) {
    const realNumbers = realData
      .map(b => b.sequential_number)
      .filter(Boolean);
    
    for (const numMatch of budgetNumbers) {
      const num = parseInt(numMatch.slice(1));
      if (!realNumbers.includes(num)) {
        suspiciousItems.push(`Número de orçamento suspeito: ${numMatch}`);
      }
    }
  }
  
  // Calcular confiança
  // 100% - (número de itens suspeitos * 20%)
  const confidence = Math.max(0, 100 - (suspiciousItems.length * 20));
  
  return {
    valid: suspiciousItems.length === 0,
    suspiciousItems,
    confidence
  };
}

/**
 * Verifica se a IA está tentando "inventar" uma resposta genérica
 */
export function detectGenericResponse(aiResponse: string): boolean {
  const genericPhrases = [
    'no momento não tenho',
    'não encontrei no sistema',
    'infelizmente não localizei',
    'não há registro',
    'aguarde enquanto busco',
    'deixe-me verificar',
    'posso criar um orçamento'
  ];
  
  const lowerResponse = aiResponse.toLowerCase();
  return genericPhrases.some(phrase => lowerResponse.includes(phrase));
}

/**
 * Verifica se a resposta da IA está formatada corretamente
 */
export function validateResponseFormat(
  aiResponse: string,
  expectedFormat: 'whatsapp' | 'list' | 'text'
): boolean {
  switch (expectedFormat) {
    case 'whatsapp':
      // Deve conter símbolos típicos de WhatsApp
      return /[📱💰✓*_]/.test(aiResponse);
      
    case 'list':
      // Deve conter bullets ou números
      return /^[\s]*[•\-\*\d]/.test(aiResponse);
      
    case 'text':
      // Qualquer texto válido
      return aiResponse.length > 10;
      
    default:
      return true;
  }
}
