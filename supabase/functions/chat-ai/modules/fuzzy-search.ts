/**
 * Funções para busca fuzzy (aproximada) de texto
 */

/**
 * Calcula a distância de Levenshtein entre duas strings
 * Retorna o número mínimo de edições (inserções, remoções, substituições) necessárias
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  const matrix: number[][] = [];
  
  // Inicializar primeira linha e coluna
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Preencher matriz
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substituição
          matrix[i][j - 1] + 1,     // Inserção
          matrix[i - 1][j] + 1      // Remoção
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Normaliza texto removendo acentos, convertendo para lowercase e removendo espaços extras
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD') // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos (acentos)
    .replace(/\s+/g, ' ') // Múltiplos espaços -> um espaço
    .trim();
}

/**
 * Busca fuzzy em uma lista de textos
 * Retorna os itens que estão dentro do threshold de similaridade
 */
export function fuzzySearch(
  query: string,
  items: string[],
  threshold: number = 3 // Máximo de diferenças permitidas
): string[] {
  const normalizedQuery = normalizeText(query);
  
  return items.filter(item => {
    const normalizedItem = normalizeText(item);
    const distance = levenshteinDistance(normalizedQuery, normalizedItem);
    return distance <= threshold;
  });
}

/**
 * Busca fuzzy com score de similaridade
 * Retorna array de { item, score } ordenado por melhor match
 */
export function fuzzySearchWithScores(
  query: string,
  items: string[],
  threshold: number = 3
): Array<{ item: string; score: number; distance: number }> {
  const normalizedQuery = normalizeText(query);
  
  const results = items
    .map(item => {
      const normalizedItem = normalizeText(item);
      const distance = levenshteinDistance(normalizedQuery, normalizedItem);
      
      // Score: quanto menor a distância, melhor (100 = match perfeito)
      const maxLen = Math.max(normalizedQuery.length, normalizedItem.length);
      const score = Math.max(0, 100 - (distance / maxLen) * 100);
      
      return { item, score, distance };
    })
    .filter(result => result.distance <= threshold)
    .sort((a, b) => a.distance - b.distance); // Ordenar por melhor match
  
  return results;
}

/**
 * Verifica se uma string contém outra, ignorando acentos e case
 */
export function normalizedIncludes(text: string, search: string): boolean {
  return normalizeText(text).includes(normalizeText(search));
}

/**
 * Busca parcial fuzzy - encontra se o termo aparece em alguma parte do texto
 */
export function partialFuzzyMatch(
  query: string,
  text: string,
  threshold: number = 2
): boolean {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);
  
  // Se é match exato normalizado
  if (normalizedText.includes(normalizedQuery)) {
    return true;
  }
  
  // Buscar por janelas deslizantes do tamanho da query
  const queryLen = normalizedQuery.length;
  for (let i = 0; i <= normalizedText.length - queryLen; i++) {
    const substring = normalizedText.substring(i, i + queryLen);
    const distance = levenshteinDistance(normalizedQuery, substring);
    if (distance <= threshold) {
      return true;
    }
  }
  
  return false;
}
