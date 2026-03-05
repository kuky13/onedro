/**
 * Parser de datas naturais em português
 */

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Converte queries em linguagem natural para ranges de datas
 */
export function parseDateQuery(query: string): DateRange {
  const lowerQuery = query.toLowerCase();
  const now = new Date();
  
  // HOJE
  if (/\bhoje\b/.test(lowerQuery)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  
  // ONTEM
  if (/\bontem\b/.test(lowerQuery)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  
  // ESSA SEMANA / ESTA SEMANA
  if (/\bessa semana\b|\besta semana\b/.test(lowerQuery)) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return { start: startOfWeek, end: now };
  }
  
  // SEMANA PASSADA
  if (/\bsemana passada\b|\bsemana anterior\b/.test(lowerQuery)) {
    const startOfLastWeek = new Date(now);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
    startOfLastWeek.setHours(0, 0, 0, 0);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
    endOfLastWeek.setHours(23, 59, 59, 999);
    return { start: startOfLastWeek, end: endOfLastWeek };
  }
  
  // ÚLTIMOS X DIAS
  const lastDaysMatch = lowerQuery.match(/últimos?\s+(\d+)\s+dias?|last\s+(\d+)\s+days?/);
  if (lastDaysMatch) {
    const days = parseInt(lastDaysMatch[1] || lastDaysMatch[2]);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    return { start: startDate, end: now };
  }
  
  // ESSE MÊS / ESTE MÊS
  if (/\besse m[êe]s\b|\beste m[êe]s\b/.test(lowerQuery)) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return { start: startOfMonth, end: now };
  }
  
  // MÊS PASSADO
  if (/\bm[êe]s passado\b|\bm[êe]s anterior\b/.test(lowerQuery)) {
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startOfLastMonth.setHours(0, 0, 0, 0);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);
    return { start: startOfLastMonth, end: endOfLastMonth };
  }
  
  // MÊS ESPECÍFICO (janeiro, fevereiro, etc)
  const months = [
    'janeiro', 'fevereiro', 'mar[çc]o', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  for (let i = 0; i < months.length; i++) {
    const monthPattern = new RegExp(`\\b${months[i]}\\b`, 'i');
    if (monthPattern.test(lowerQuery)) {
      const year = now.getFullYear();
      const start = new Date(year, i, 1, 0, 0, 0, 0);
      const end = new Date(year, i + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }
  
  // DATA ESPECÍFICA (10/01/2026, 10-01-2026, 10 01 2026)
  const dateMatch = query.match(/(\d{1,2})[/-\s](\d{1,2})(?:[/-\s](\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1; // Mês é 0-indexed
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
    
    // Converter ano de 2 dígitos para 4
    if (year < 100) {
      year = year < 50 ? 2000 + year : 1900 + year;
    }
    
    // Validar data
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const start = new Date(year, month, day, 0, 0, 0, 0);
      const end = new Date(year, month, day, 23, 59, 59, 999);
      
      // Verificar se a data é válida
      if (start.getDate() === day && start.getMonth() === month) {
        return { start, end };
      }
    }
  }
  
  // DATA POR EXTENSO (10 de janeiro, 15 de dezembro de 2024)
  const extendedDatePattern = /(\d{1,2})\s+de\s+(janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/i;
  const extendedMatch = lowerQuery.match(extendedDatePattern);
  if (extendedMatch) {
    const day = parseInt(extendedMatch[1]);
    const monthName = extendedMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const year = extendedMatch[3] ? parseInt(extendedMatch[3]) : now.getFullYear();
    
    const monthIndex = months.findIndex(m => {
      const normalized = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return new RegExp(`^${normalized}$`).test(monthName);
    });
    
    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const start = new Date(year, monthIndex, day, 0, 0, 0, 0);
      const end = new Date(year, monthIndex, day, 23, 59, 59, 999);
      
      if (start.getDate() === day) {
        return { start, end };
      }
    }
  }
  
  // PERÍODO ENTRE DATAS (de X até Y, entre X e Y)
  const periodPattern = /(?:de|desde|entre)\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\s+(?:até|at[ée]|e)\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i;
  const periodMatch = query.match(periodPattern);
  if (periodMatch) {
    const startDate = parseSingleDate(periodMatch[1], now);
    const endDate = parseSingleDate(periodMatch[2], now);
    
    if (startDate && endDate) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return { start: startDate, end: endDate };
    }
  }
  
  return { start: null, end: null };
}

/**
 * Auxiliar para parsear uma única data
 */
function parseSingleDate(dateStr: string, referenceDate: Date): Date | null {
  const match = dateStr.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (!match) return null;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;
  let year = match[3] ? parseInt(match[3]) : referenceDate.getFullYear();
  
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }
  
  const date = new Date(year, month, day);
  return date.getDate() === day ? date : null;
}
