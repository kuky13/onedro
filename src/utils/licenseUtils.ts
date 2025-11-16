/**
 * Utilitários para validação e manipulação de códigos de licença
 * Baseado no sistema de licenças de 13 dígitos
 */

/**
 * Valida o formato de um código de licença
 * @param code - Código da licença para validar
 * @returns true se o formato for válido, false caso contrário
 */
export function validateLicenseCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  // Remover espaços e converter para maiúsculo
  const cleanCode = code.trim().toUpperCase();
  
  // Verificar se tem 13 caracteres
  if (cleanCode.length !== 13) return false;
  
  // Verificar se é licença de teste (formato TRIALXXXXXXXX)
  if (cleanCode.startsWith('TRIAL')) {
    return /^TRIAL[A-Z0-9]{8}$/.test(cleanCode);
  }
  
  // Verificar se é licença normal (formato DDDDDDXXXXXXX - 6 dígitos + 7 alfanuméricos)
  if (/^[0-9]{6}[A-Z0-9]{7}$/.test(cleanCode)) {
    const days = parseInt(cleanCode.substring(0, 6));
    return days > 0 && days <= 999999; // Máximo ~2740 anos
  }
  
  // Verificar se é licença legada (13 caracteres alfanuméricos)
  return /^[A-Z0-9]{13}$/.test(cleanCode);
}

/**
 * Decodifica o número de dias de um código de licença
 * @param code - Código da licença
 * @returns Número de dias da licença (30 como padrão para licenças legadas)
 */
export function decodeLicenseDays(code: string): number {
  if (!code || typeof code !== 'string') return 30;
  
  const cleanCode = code.trim().toUpperCase();
  
  // Verificar se tem 13 caracteres
  if (cleanCode.length !== 13) return 30;
  
  // Se é licença de teste, sempre 7 dias
  if (cleanCode.startsWith('TRIAL')) {
    return 7;
  }
  
  // Se começa com 6 dígitos, é licença nova com dias codificados
  if (/^[0-9]{6}/.test(cleanCode)) {
    try {
      const daysStr = cleanCode.substring(0, 6);
      const days = parseInt(daysStr, 10);
      return isNaN(days) || days <= 0 ? 30 : days;
    } catch {
      return 30;
    }
  }
  
  // Licença legada - padrão 30 dias
  return 30;
}

/**
 * Verifica se um código é de licença de teste
 * @param code - Código da licença
 * @returns true se for licença de teste, false caso contrário
 */
export function isTrialLicense(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  const cleanCode = code.trim().toUpperCase();
  return cleanCode.startsWith('TRIAL') && cleanCode.length === 13 && /^TRIAL[A-Z0-9]{8}$/.test(cleanCode);
}

/**
 * Gera um código de licença de teste
 * @returns Código de licença de teste no formato TRIALXXXXXXXX
 */
export function generateTrialCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomSuffix = '';
  
  for (let i = 0; i < 8; i++) {
    randomSuffix += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return 'TRIAL' + randomSuffix;
}

/**
 * Verifica se um usuário pode criar uma licença de teste
 * @param existingLicenses - Array de códigos de licenças existentes do usuário
 * @returns true se pode criar licença de teste, false caso contrário
 */
export function checkTrialEligibility(existingLicenses: string[]): boolean {
  // Usuário não pode ter licença de teste se já tiver uma
  return !existingLicenses.some(license => isTrialLicense(license));
}

/**
 * Calcula os dias restantes de uma licença de teste
 * @param createdAt - Data de criação da licença (ISO string)
 * @returns Número de dias restantes (0 se expirada)
 */
export function getTrialDaysRemaining(createdAt: string): number {
  if (!createdAt || typeof createdAt !== 'string') return 0;
  
  try {
    const created = new Date(createdAt);
    
    // Verificar se a data é válida
    if (isNaN(created.getTime())) return 0;
    
    const now = new Date();
    const expiresAt = new Date(created.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 dias
    
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

/**
 * Verifica se uma licença de teste está expirada
 * @param createdAt - Data de criação da licença (ISO string)
 * @returns true se expirada, false caso contrário
 */
export function isTrialExpired(createdAt: string): boolean {
  if (!createdAt || typeof createdAt !== 'string') return true;
  
  try {
    const created = new Date(createdAt);
    
    // Verificar se a data é válida
    if (isNaN(created.getTime())) return true;
    
    return getTrialDaysRemaining(createdAt) <= 0;
  } catch {
    return true;
  }
}