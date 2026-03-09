import { ROUTE_CONFIG } from '@/config/routeConfig';

/**
 * Cache inteligente multi-tab com sincronização via BroadcastChannel
 * Implementa cache compartilhado entre abas com invalidação automática
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live em ms
  version: string;
}

interface CacheMessage {
  type: 'invalidate' | 'update' | 'clear';
  key?: string;
  data?: any;
  timestamp: number;
}

class MultiTabCache {
  private cache = new Map<string, CacheEntry>();
  private channel: any = null;
  private readonly config = ROUTE_CONFIG.cache;
  private listeners = new Set<(key: string, data: any) => void>();

  private checkVersion() {
    const storedVersion = localStorage.getItem('cache-version');
    if (storedVersion !== this.config.version) {
      this.clear();
      localStorage.setItem('cache-version', this.config.version);
    }
  }

  constructor() {
    // Lazy-load broadcast-channel para reduzir bundle inicial
    const channelName = (this.config as any).channelName ?? 'multitab-cache';
    this.channelReady = import('broadcast-channel').then(({ BroadcastChannel }) => {
      this.channel = new BroadcastChannel(channelName);
      this.setupChannelListener();
    }).catch(() => {
      // fallback: sem sincronização multi-tab
    });
    this.startCleanupTimer();
    this.checkVersion();
  }

  private setupChannelListener() {
    if (!this.channel) return;
    this.channel.addEventListener('message', (event: MessageEvent<CacheMessage>) => {
      const { type, key, data, timestamp } = event.data;
      
      // Ignorar mensagens antigas (mais de 1 segundo)
      if (Date.now() - timestamp > 1000) return;

      switch (type) {
        case 'invalidate':
          if (key) {
            this.cache.delete(key);
            this.notifyListeners(key, null);
          }
          break;
        case 'update':
          if (key && data) {
            this.setLocal(key, data.data, data.ttl);
            this.notifyListeners(key, data.data);
          }
          break;
        case 'clear':
          this.cache.clear();
          break;
      }
    });
  }

  private startCleanupTimer() {
    // Limpeza automática baseada na configuração
    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 Cache cleanup: removidas ${keysToDelete.length} entradas expiradas`);
    }
  }

  private setLocal<T>(key: string, data: T, ttl = this.config.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.config.version
    });
  }

  private notifyListeners(key: string, data: any) {
    this.listeners.forEach(listener => {
      try {
        listener(key, data);
      } catch (error) {
        console.error('Erro ao notificar listener do cache:', error);
      }
    });
  }

  /**
   * Define um valor no cache e sincroniza com outras abas
   */
  set<T>(key: string, data: T, ttl = this.config.defaultTTL): void {
    this.setLocal(key, data, ttl);
    
    // Notificar outras abas (se canal já estiver pronto)
    this.channel?.postMessage({
      type: 'update',
      key,
      data: { data, ttl },
      timestamp: Date.now()
    });
  }

  /**
   * Obtém um valor do cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Verificar versão
    if (entry.version !== this.config.version) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Verifica se uma chave existe e não expirou
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalida uma chave específica em todas as abas
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    
    this.channel?.postMessage({
      type: 'invalidate',
      key,
      timestamp: Date.now()
    });
  }

  /**
   * Limpa todo o cache em todas as abas
   */
  clear(): void {
    this.cache.clear();
    
    this.channel?.postMessage({
      type: 'clear',
      timestamp: Date.now()
    });
  }

  /**
   * Adiciona um listener para mudanças no cache
   */
  addListener(listener: (key: string, data: any) => void): () => void {
    this.listeners.add(listener);
    
    // Retorna função para remover o listener
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      version: this.config.version
    };
  }

  /**
   * Destrói o cache e fecha o canal
   */
  destroy(): void {
    this.cache.clear();
    this.listeners.clear();
    this.channel?.close();
  }
}

// Instância singleton
export const multiTabCache = new MultiTabCache();

// Cleanup automático quando a página é fechada
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    multiTabCache.destroy();
  });
}

export default MultiTabCache;