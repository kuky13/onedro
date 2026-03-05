import { parseDateQuery } from "./date-parser.ts";

export interface ExtractedEntities {
  numbers: number[];
  phones: string[];
  dates: { start: Date | null; end: Date | null };
  deviceModels: string[];
  clientNames: string[];
  statuses: string[];
  repairs: string[];
  searchType: 'specific' | 'mixed' | 'general';
}

// Marcas conhecidas de dispositivos
const DEVICE_BRANDS = [
  'iphone', 'samsung', 'motorola', 'xiaomi', 'lg', 'asus', 'nokia', 
  'galaxy', 'note', 'plus', 'pro', 'max', 'redmi', 'poco', 'oneplus',
  'huawei', 'honor', 'realme', 'oppo', 'vivo', 'sony', 'lenovo',
  'moto', 'pixel', 'tcl', 'infinix', 'tecno', 'nothing'
];

// Known model prefixes (e.g., "S23", "A54", "G84")
const MODEL_PREFIX_PATTERN = /\b(s|a|m|j|z|f|g|c|k|note|fold|flip)\s*(\d{1,3})\s*(fe|plus|ultra|pro|max|lite|[a-z])?(\s+(fe|plus|ultra|pro|max|lite|5g))?\b/gi;

// Status conhecidos
const STATUS_MAP: Record<string, string> = {
  'pendente': 'pending',
  'pendentes': 'pending',
  'aguardando': 'pending',
  'andamento': 'in_progress',
  'em andamento': 'in_progress',
  'processando': 'in_progress',
  'concluído': 'completed',
  'concluido': 'completed',
  'concluídos': 'completed',
  'concluidos': 'completed',
  'finalizado': 'completed',
  'entregue': 'delivered',
  'entregues': 'delivered',
  'retirado': 'delivered'
};

// Palavras relacionadas a reparos
const REPAIR_KEYWORDS = [
  'tela', 'bateria', 'câmera', 'camera', 'traseira', 'frontal',
  'carregamento', 'alto-falante', 'microfone', 'botão', 'botao',
  'touch', 'display', 'lcd', 'troca', 'reparo', 'conserto',
  'substituição', 'substituicao', 'manutenção', 'manutencao',
  'vidro', 'placa', 'conector', 'carcaça', 'carcaca', 'alto falante',
  'sensor', 'flex', 'cabo', 'chip', 'software', 'firmware'
];

/**
 * Extrai todas as entidades de uma query do usuário
 */
export function extractEntitiesFromQuery(query: string): ExtractedEntities {
  const lowerQuery = query.toLowerCase();
  
  const entities: ExtractedEntities = {
    numbers: extractNumbers(query),
    phones: extractPhones(query),
    dates: parseDateQuery(query),
    deviceModels: extractDeviceModels(query),
    clientNames: extractNames(query),
    statuses: extractStatus(lowerQuery),
    repairs: extractRepairs(lowerQuery),
    searchType: 'general'
  };
  
  // Determinar tipo de busca
  if (entities.numbers.length > 0 && entities.numbers.length === 1) {
    entities.searchType = 'specific';
  } else if (
    entities.deviceModels.length > 0 || 
    entities.clientNames.length > 0 || 
    entities.phones.length > 0 ||
    entities.dates.start !== null ||
    entities.statuses.length > 0
  ) {
    entities.searchType = 'mixed';
  }
  
  return entities;
}

/**
 * Extrai números da query (potenciais números de OS)
 */
function extractNumbers(query: string): number[] {
  const numbers: number[] = [];
  
  // Padrões: "16", "0016", "OS 16", "ordem 16", "#16"
  const matches = query.match(/\b(\d{1,6})\b/g);
  
  if (matches) {
    matches.forEach(match => {
      const num = parseInt(match.replace(/^0+/, '') || '0');
      if (num > 0 && num < 999999) {
        numbers.push(num);
      }
    });
  }
  
  return [...new Set(numbers)];
}

/**
 * Extrai telefones da query
 */
function extractPhones(query: string): string[] {
  const phones: string[] = [];
  
  const patterns = [
    /\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g,
    /\b\d{10,11}\b/g
  ];
  
  patterns.forEach(pattern => {
    const matches = query.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const normalized = match.replace(/\D/g, '');
        if (normalized.length >= 10 && normalized.length <= 11) {
          phones.push(normalized);
        }
      });
    }
  });
  
  return [...new Set(phones)];
}

/**
 * Extrai modelos de dispositivos - MELHORADO para capturar "S23 FE", "A54", "Galaxy S23", etc.
 */
function extractDeviceModels(query: string): string[] {
  const models: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // 1. Buscar por marcas conhecidas + número/modelo
  DEVICE_BRANDS.forEach(brand => {
    if (lowerQuery.includes(brand)) {
      // Pattern: brand + optional space + alphanumeric model
      const brandPattern = new RegExp(`${brand}\\s*[a-z0-9\\s+\\-]*\\d+[a-z0-9\\s]*(?:fe|plus|ultra|pro|max|lite|5g)?`, 'gi');
      const matches = query.match(brandPattern);
      
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.trim().replace(/\s+/g, ' ');
          if (cleaned.length > brand.length + 1) {
            models.push(cleaned);
          }
        });
      }
    }
  });
  
  // 2. Detect standalone model codes like "S23 FE", "A54", "A12", "M54", "Z Fold 5"
  const modelMatches = query.matchAll(MODEL_PREFIX_PATTERN);
  for (const match of modelMatches) {
    const fullMatch = match[0].trim().replace(/\s+/g, ' ');
    // Avoid adding if already captured by brand detection
    const isDuplicate = models.some(m => 
      m.toLowerCase().includes(fullMatch.toLowerCase()) || 
      fullMatch.toLowerCase().includes(m.toLowerCase())
    );
    if (!isDuplicate && fullMatch.length >= 2) {
      models.push(fullMatch);
    }
  }
  
  // 3. Specific iPhone patterns
  const iphonePattern = /iphone\s*\d+(\s*(pro\s*max|pro|plus|mini))?/gi;
  const iphoneMatches = query.match(iphonePattern);
  if (iphoneMatches) {
    iphoneMatches.forEach(match => {
      if (!models.some(m => m.toLowerCase() === match.trim().toLowerCase())) {
        models.push(match.trim());
      }
    });
  }
  
  // 4. Moto patterns: "Moto G84", "Moto G9 Play", "Moto Edge"
  const motoPattern = /moto\s*(?:g|e|edge|razr)\s*\d*\s*(?:play|plus|power|stylus|5g)?/gi;
  const motoMatches = query.match(motoPattern);
  if (motoMatches) {
    motoMatches.forEach(match => {
      if (!models.some(m => m.toLowerCase() === match.trim().toLowerCase())) {
        models.push(match.trim());
      }
    });
  }

  // 5. Padrão genérico: palavra + número (ex: "Redmi 13C")
  if (models.length === 0) {
    const genericPattern = /\b([a-z]+\s*\d+[a-z0-9\s]*)\b/gi;
    const matches = query.match(genericPattern);
    if (matches) {
      matches.forEach(match => {
        if (!/^\d+$/.test(match.trim())) {
          models.push(match.trim());
        }
      });
    }
  }
  
  return [...new Set(models.map(m => m.trim()))];
}

// All brand names (lowercase) used to filter false client names
const ALL_BRAND_NAMES = [
  ...DEVICE_BRANDS,
  'samsung', 'apple', 'google', 'microsoft', 'dell', 'hp', 'acer',
  'positivo', 'multilaser', 'alcatel', 'zte', 'meizu', 'black shark',
];

/**
 * Extrai nomes de clientes (heurística básica)
 * Filtra marcas de dispositivo para evitar ruído
 */
function extractNames(query: string): string[] {
  const names: string[] = [];
  
  const patterns = [
    /\b(?:do|da|de|dos|das)\s+([A-ZÇÁÀÂÃÉÊÍÓÔÕÚ][a-zçáàâãéêíóôõú]+(?:\s+[A-ZÇÁÀÂÃÉÊÍÓÔÕÚ][a-zçáàâãéêíóôõú]+)*)/g,
    /\bcliente\s+([A-ZÇÁÀÂÃÉÊÍÓÔÕÚ][a-zçáàâãéêíóôõú]+(?:\s+[A-ZÇÁÀÂÃÉÊÍÓÔÕÚ][a-zçáàâãéêíóôõú]+)*)/gi
  ];
  
  patterns.forEach(pattern => {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const candidate = match[1].trim();
        const candidateLower = candidate.toLowerCase();
        
        // Skip if candidate is a known brand
        if (ALL_BRAND_NAMES.includes(candidateLower)) continue;
        
        // Skip if candidate looks like a model code (e.g., "S23", "A54", "Redmi")
        if (/^[a-z]\d{1,3}$/i.test(candidateLower)) continue;
        
        // Skip if first word of candidate is a brand
        const firstWord = candidateLower.split(/\s+/)[0];
        if (ALL_BRAND_NAMES.includes(firstWord)) continue;
        
        names.push(candidate);
      }
    }
  });
  
  return [...new Set(names)];
}

/**
 * Extrai status de OS
 */
function extractStatus(lowerQuery: string): string[] {
  const statuses: string[] = [];
  
  Object.entries(STATUS_MAP).forEach(([key, value]) => {
    if (lowerQuery.includes(key)) {
      statuses.push(value);
    }
  });
  
  return [...new Set(statuses)];
}

/**
 * Extrai tipos de reparos mencionados
 */
function extractRepairs(lowerQuery: string): string[] {
  const repairs: string[] = [];
  
  REPAIR_KEYWORDS.forEach(keyword => {
    if (lowerQuery.includes(keyword)) {
      repairs.push(keyword);
    }
  });
  
  return [...new Set(repairs)];
}
