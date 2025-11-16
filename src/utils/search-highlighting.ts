/**
 * Utilitários para highlighting de termos de busca nos resultados
 */

export interface HighlightOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  maxHighlights?: number;
  highlightClass?: string;
}

/**
 * Destaca termos de busca em um texto
 */
export function highlightSearchTerms(
  text: string,
  searchTerm: string,
  options: HighlightOptions = {}
): string {
  if (!text || !searchTerm) return text;

  const {
    caseSensitive = false,
    wholeWords = false,
    maxHighlights = 10,
    highlightClass = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded font-medium'
  } = options;

  // Normaliza o termo de busca
  const normalizedSearchTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  const normalizedText = caseSensitive ? text : text.toLowerCase();

  // Divide o termo de busca em palavras individuais
  const searchWords = normalizedSearchTerm
    .split(/\s+/)
    .filter(word => word.length > 0)
    .slice(0, 5); // Limita a 5 palavras para performance

  if (searchWords.length === 0) return text;

  let highlightedText = text;
  let highlightCount = 0;

  // Destaca cada palavra do termo de busca
  for (const word of searchWords) {
    if (highlightCount >= maxHighlights) break;

    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = wholeWords 
      ? new RegExp(`\\b${escapedWord}\\b`, caseSensitive ? 'g' : 'gi')
      : new RegExp(escapedWord, caseSensitive ? 'g' : 'gi');

    const matches = highlightedText.match(pattern);
    if (matches) {
      highlightCount += matches.length;
      highlightedText = highlightedText.replace(
        pattern,
        `<mark class="${highlightClass}">$&</mark>`
      );
    }
  }

  return highlightedText;
}

/**
 * Destaca termos de busca em múltiplos campos de um objeto
 */
export function highlightObjectFields<T extends Record<string, any>>(
  item: T,
  searchTerm: string,
  fields: (keyof T)[],
  options: HighlightOptions = {}
): T & { _highlighted?: Record<string, string> } {
  if (!searchTerm || fields.length === 0) return item;

  const highlighted: Record<string, string> = {};

  for (const field of fields) {
    const value = item[field];
    if (typeof value === 'string') {
      highlighted[field as string] = highlightSearchTerms(value, searchTerm, options);
    }
  }

  return {
    ...item,
    _highlighted: highlighted
  };
}

/**
 * Calcula a relevância de um resultado baseado na posição dos termos encontrados
 */
export function calculateRelevanceScore(
  text: string,
  searchTerm: string,
  options: { fieldWeight?: number; positionWeight?: boolean } = {}
): number {
  if (!text || !searchTerm) return 0;

  const { fieldWeight = 1, positionWeight = true } = options;
  const normalizedText = text.toLowerCase();
  const normalizedSearchTerm = searchTerm.toLowerCase();

  // Pontuação base para correspondência exata
  let score = 0;
  
  // Correspondência exata (maior pontuação)
  if (normalizedText.includes(normalizedSearchTerm)) {
    score += 1.0;
    
    // Bônus se estiver no início
    if (positionWeight && normalizedText.startsWith(normalizedSearchTerm)) {
      score += 0.5;
    }
  }

  // Correspondência de palavras individuais
  const searchWords = normalizedSearchTerm.split(/\s+/).filter(word => word.length > 0);
  const textWords = normalizedText.split(/\s+/);
  
  let wordMatches = 0;
  for (const searchWord of searchWords) {
    for (const textWord of textWords) {
      if (textWord.includes(searchWord)) {
        wordMatches++;
        break;
      }
    }
  }
  
  // Adiciona pontuação proporcional às palavras encontradas
  if (searchWords.length > 0) {
    score += (wordMatches / searchWords.length) * 0.7;
  }

  // Aplica peso do campo
  score *= fieldWeight;

  // Normaliza para 0-1
  return Math.min(score, 1);
}

/**
 * Cria um snippet de texto destacando os termos de busca
 */
export function createSearchSnippet(
  text: string,
  searchTerm: string,
  maxLength: number = 150
): string {
  if (!text || !searchTerm) return text.slice(0, maxLength);

  const normalizedText = text.toLowerCase();
  const normalizedSearchTerm = searchTerm.toLowerCase();
  
  // Encontra a primeira ocorrência do termo
  const index = normalizedText.indexOf(normalizedSearchTerm);
  
  if (index === -1) {
    return text.slice(0, maxLength) + (text.length > maxLength ? '...' : '');
  }

  // Calcula o início e fim do snippet
  const start = Math.max(0, index - Math.floor((maxLength - searchTerm.length) / 2));
  const end = Math.min(text.length, start + maxLength);
  
  let snippet = text.slice(start, end);
  
  // Adiciona reticências se necessário
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  
  return snippet;
}

/**
 * Hook React para highlighting de resultados de busca
 */
export function useSearchHighlighting() {
  const highlight = (text: string, searchTerm: string, options?: HighlightOptions) => {
    return highlightSearchTerms(text, searchTerm, options);
  };

  const highlightObject = <T extends Record<string, any>>(
    item: T,
    searchTerm: string,
    fields: (keyof T)[],
    options?: HighlightOptions
  ) => {
    return highlightObjectFields(item, searchTerm, fields, options);
  };

  const calculateScore = (
    text: string,
    searchTerm: string,
    options?: { fieldWeight?: number; positionWeight?: boolean }
  ) => {
    return calculateRelevanceScore(text, searchTerm, options);
  };

  const createSnippet = (
    text: string,
    searchTerm: string,
    maxLength?: number
  ) => {
    return createSearchSnippet(text, searchTerm, maxLength);
  };

  return {
    highlight,
    highlightObject,
    calculateScore,
    createSnippet
  };
}