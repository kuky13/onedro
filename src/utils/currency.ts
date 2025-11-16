/**
 * Utilitários para formatação monetária
 * Centraliza a lógica de formatação de valores em reais
 */

/**
 * Formata um valor monetário para exibição em reais brasileiros
 * @param value - Valor em centavos (como armazenado no banco)
 * @param options - Opções de formatação
 * @returns String formatada (ex: "R$ 1.500,00")
 */
export const formatCurrency = (
  value: number | null | undefined,
  options: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return options.showSymbol !== false ? 'R$ 0,00' : '0,00';
  }

  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  // Converter de centavos para reais
  const valueInReais = value / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(valueInReais);
};

/**
 * Formata um valor monetário que já está em reais (DECIMAL do banco)
 * @param value - Valor em reais (como vem do banco DECIMAL(10,2))
 * @param options - Opções de formatação
 * @returns String formatada (ex: "R$ 1.500,00")
 */
export const formatCurrencyFromReais = (
  value: number | string | null | undefined,
  options: {
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string => {
  if (value === null || value === undefined) {
    return options.showSymbol !== false ? 'R$ 0,00' : '0,00';
  }

  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) {
    return options.showSymbol !== false ? 'R$ 0,00' : '0,00';
  }

  const {
    showSymbol = true,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  return new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(numericValue);
};

/**
 * Converte um valor em reais para centavos (para armazenamento no banco)
 * @param value - Valor em reais (string ou number)
 * @returns Valor em centavos (number)
 */
export const toCents = (value: string | number): number => {
  if (typeof value === 'string') {
    // Remove símbolos de moeda e espaços
    const cleaned = value.replace(/[R$\s]/g, '');
    // Substitui vírgula por ponto
    const normalized = cleaned.replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }
  
  return Math.round(value * 100);
};

/**
 * Converte um valor em centavos para reais
 * @param value - Valor em centavos
 * @returns Valor em reais (number)
 */
export const fromCents = (value: number | null | undefined): number => {
  if (value === null || value === undefined || isNaN(value)) {
    return 0;
  }
  return value / 100;
};

/**
 * Valida se um valor monetário é válido
 * @param value - Valor a ser validado
 * @returns true se válido, false caso contrário
 */
export const isValidCurrency = (value: string | number): boolean => {
  if (typeof value === 'number') {
    return !isNaN(value) && value >= 0;
  }
  
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && parsed >= 0;
  }
  
  return false;
};

/**
 * Detecta se um valor tem muitos zeros consecutivos no final
 * @param value - Valor a ser analisado
 * @returns true se tem 4+ zeros consecutivos no final (mais restritivo)
 */
export const hasExcessiveZeros = (value: string): boolean => {
  const digits = value.replace(/\D/g, '');
  // Agora requer 4+ zeros consecutivos E valor >= 100000 para ser considerado excessivo
  return /0000+$/.test(digits) && digits.length >= 6;
};

/**
 * Detecta o contexto de um valor monetário para formatação inteligente
 * @param value - Valor digitado pelo usuário
 * @param fieldContext - Contexto do campo (labor, parts, total)
 * @returns Objeto com informações sobre como formatar
 */
export const detectCurrencyContext = (value: string, fieldContext?: 'labor' | 'parts' | 'total') => {
  const digits = value.replace(/\D/g, '');
  const numericValue = parseInt(digits, 10);
  
  if (isNaN(numericValue) || digits === '') {
    return { shouldFormat: false, formatType: 'none', confidence: 0 };
  }
  
  // Casos específicos baseados no contexto e valor - LÓGICA MAIS CONSERVADORA
  const scenarios = [
    // Valores muito pequenos (1-99) - sempre tratar como reais
    {
      condition: numericValue <= 99,
      formatType: 'as-is',
      confidence: 0.95,
      reason: 'small-value'
    },
    // Valores normais (100-999999) - tratar como reais (não dividir)
    // Esta é a regra principal - a maioria dos valores deve ser tratada como reais
    {
      condition: numericValue >= 100 && numericValue <= 999999,
      formatType: 'as-is',
      confidence: 0.9,
      reason: 'normal-value'
    },
    // Valores extremamente grandes (1000000+) com zeros excessivos - possivelmente centavos
    {
      condition: numericValue >= 1000000 && hasExcessiveZeros(digits),
      formatType: 'divide-by-100',
      confidence: 0.8,
      reason: 'extremely-large-with-excessive-zeros'
    },
    // Valores gigantescos (10000000+) - provavelmente centavos
    {
      condition: numericValue >= 10000000,
      formatType: 'divide-by-100',
      confidence: 0.75,
      reason: 'gigantic-value'
    }
  ];
  
  // Encontra o primeiro cenário que se aplica
  const matchedScenario = scenarios.find(scenario => scenario.condition);
  
  if (matchedScenario) {
    return {
      shouldFormat: true,
      formatType: matchedScenario.formatType,
      confidence: matchedScenario.confidence,
      reason: matchedScenario.reason,
      originalValue: digits,
      numericValue
    };
  }
  
  // Caso padrão - não formatar
  return {
    shouldFormat: false,
    formatType: 'as-is',
    confidence: 0.5,
    reason: 'default',
    originalValue: digits,
    numericValue
  };
};

/**
 * Formata um valor com detecção inteligente de zeros
 * @param value - Valor atual do input
 * @param fieldContext - Contexto do campo para melhor detecção
 * @returns Objeto com valor formatado e informações sobre a formatação
 */
export const smartFormatCurrency = (value: string, fieldContext?: 'labor' | 'parts' | 'total') => {
  const digits = value.replace(/\D/g, '');
  
  if (digits === '') {
    return { formattedValue: '', wasAutoFormatted: false, confidence: 0 };
  }
  
  const context = detectCurrencyContext(value, fieldContext);
  
  if (!context.shouldFormat || context.formatType === 'as-is') {
    return {
      formattedValue: digits,
      wasAutoFormatted: false,
      confidence: context.confidence,
      reason: context.reason
    };
  }
  
  if (context.formatType === 'divide-by-100') {
    const number = context.numericValue / 100;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
    
    return {
      formattedValue: formatted,
      wasAutoFormatted: true,
      confidence: context.confidence,
      reason: context.reason,
      originalValue: digits,
      detectedValue: number
    };
  }
  
  // Fallback para formatação normal
  const number = context.numericValue / 100;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
  
  return {
    formattedValue: formatted,
    wasAutoFormatted: false,
    confidence: context.confidence,
    reason: context.reason
  };
};

/**
 * Formata um valor para input de moeda (com máscara)
 * @param value - Valor atual do input
 * @param fieldContext - Contexto do campo para formatação inteligente
 * @returns Valor formatado para exibição no input
 */
export const formatCurrencyInput = (value: string, fieldContext?: 'labor' | 'parts' | 'total'): string => {
  const result = smartFormatCurrency(value, fieldContext);
  return result.formattedValue;
};

/**
 * Formata um valor para input de moeda com informações detalhadas
 * @param value - Valor atual do input
 * @param fieldContext - Contexto do campo para formatação inteligente
 * @returns Objeto com valor formatado e metadados
 */
export const formatCurrencyInputDetailed = (value: string, fieldContext?: 'labor' | 'parts' | 'total') => {
  return smartFormatCurrency(value, fieldContext);
};

/**
 * Extrai o valor numérico de um input formatado
 * @param formattedValue - Valor formatado do input
 * @returns Valor em reais (number)
 */
export const parseCurrencyInput = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  
  // Remove tudo exceto dígitos, vírgulas e pontos
  const cleaned = formattedValue.replace(/[^\d.,]/g, '');
  
  if (!cleaned) return 0;
  
  // Se tem vírgula, assume formato brasileiro (1.234,56)
  if (cleaned.includes(',')) {
    // Remove pontos (separadores de milhares) e substitui vírgula por ponto
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // Se só tem ponto, pode ser decimal em inglês ou separador de milhares
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Provavelmente decimal (ex: 123.45)
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    } else {
      // Provavelmente separador de milhares (ex: 1.234.567)
      const normalized = cleaned.replace(/\./g, '');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    }
  }
  
  // Só dígitos
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Converte um valor string para número decimal em reais
 * Função simplificada para uso com o novo CurrencyInput
 * @param value - Valor como string (pode estar formatado)
 * @returns Valor em reais como number
 */
export const parseToReais = (value: string): number => {
  return parseCurrencyInput(value);
};