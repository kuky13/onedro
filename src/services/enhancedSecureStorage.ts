/**
 * Sistema de Armazenamento Seguro Aprimorado
 * Implementa AES-256-GCM com PBKDF2, rotação de chaves e validação HMAC
 * OneDrip Security Enhancement 2025
 */

// Configurações de segurança
const SECURITY_CONFIG = {
  PBKDF2_ITERATIONS: 100000,
  KEY_ROTATION_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas
  HMAC_KEY_LENGTH: 256,
  AES_KEY_LENGTH: 256,
  IV_LENGTH: 12,
  SALT_LENGTH: 16,
  MAX_KEY_AGE: 7 * 24 * 60 * 60 * 1000, // 7 dias
  TIMING_ATTACK_DELAY: 100, // ms
} as const;

// Interfaces
export interface EnhancedSecureStorageOptions {
  encrypt?: boolean;
  storage?: 'localStorage' | 'sessionStorage';
  ttl?: number;
  context?: string;
  enableIntegrityCheck?: boolean;
  enableTimingProtection?: boolean;
}

export interface StorageMetadata {
  version: string;
  algorithm: string;
  keyId: string;
  timestamp: number;
  ttl?: number;
  integrity?: string;
  context: string;
}

export interface EncryptedData {
  data: string;
  metadata: StorageMetadata;
  hmac: string;
}

export interface KeyRotationInfo {
  keyId: string;
  createdAt: number;
  lastUsed: number;
  rotationCount: number;
}

/**
 * Classe aprimorada para armazenamento seguro
 */
export class EnhancedSecureStorage {
  private static instance: EnhancedSecureStorage;
  private keyCache = new Map<string, CryptoKey>();
  private hmacKeyCache = new Map<string, CryptoKey>();
  private keyRotationInfo = new Map<string, KeyRotationInfo>();
  private masterKey: string;
  private isInitialized = false;

  private constructor() {
    this.masterKey = this.getMasterKey();
    this.initializeKeyRotation();
  }

  static getInstance(): EnhancedSecureStorage {
    if (!EnhancedSecureStorage.instance) {
      EnhancedSecureStorage.instance = new EnhancedSecureStorage();
    }
    return EnhancedSecureStorage.instance;
  }

  /**
   * Método estático para inicializar o sistema de armazenamento seguro
   */
  static async initialize(): Promise<void> {
    const instance = EnhancedSecureStorage.getInstance();
    await instance.initializeKeyRotation();
  }

  /**
   * Método estático para verificar se as chaves precisam ser rotacionadas
   */
  static async shouldRotateKeys(): Promise<boolean> {
    const instance = EnhancedSecureStorage.getInstance();
    return instance.shouldRotateKeys();
  }

  /**
   * Método estático para rotacionar chaves
   */
  static async rotateKeys(context?: string): Promise<void> {
    const instance = EnhancedSecureStorage.getInstance();
    await instance.rotateKeys(context);
  }

  /**
   * Método estático para limpeza de dados expirados
   */
  static async cleanup(): Promise<void> {
    const instance = EnhancedSecureStorage.getInstance();
    await instance.cleanup();
  }

  /**
   * Obtém a chave mestra do ambiente ou gera uma nova
   */
  private getMasterKey(): string {
    const envKey = import.meta.env.VITE_ENCRYPTION_KEY;
    if (envKey && envKey !== 'default-key-change-in-production') {
      return envKey;
    }

    // Gera chave baseada em características do navegador (fallback)
    const browserFingerprint = this.generateBrowserFingerprint();
    return `onedrip-enhanced-${browserFingerprint}-2025`;
  }

  /**
   * Gera fingerprint do navegador para chave única
   */
  private generateBrowserFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('OneDrip Security', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    return btoa(fingerprint).slice(0, 32);
  }

  /**
   * Inicializa sistema de rotação de chaves
   */
  private async initializeKeyRotation(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Carrega informações de rotação existentes
      const rotationData = localStorage.getItem('onedrip_key_rotation');
      if (rotationData) {
        const parsed = JSON.parse(rotationData);
        this.keyRotationInfo = new Map(Object.entries(parsed));
      }

      // Verifica se precisa rotacionar chaves
      await this.checkAndRotateKeys();
      
      // Agenda próxima rotação
      this.scheduleKeyRotation();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Erro ao inicializar rotação de chaves:', error);
    }
  }

  /**
   * Gera chave PBKDF2 aprimorada
   */
  private async generatePBKDF2Key(
    context: string,
    keyId: string,
    purpose: 'encryption' | 'hmac' = 'encryption'
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const salt = encoder.encode(`${context}-${keyId}-${purpose}-onedrip-2025`);
    
    // Importa material da chave
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.masterKey),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Deriva chave específica
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: SECURITY_CONFIG.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { 
        name: purpose === 'encryption' ? 'AES-GCM' : 'HMAC',
        length: purpose === 'encryption' ? SECURITY_CONFIG.AES_KEY_LENGTH : SECURITY_CONFIG.HMAC_KEY_LENGTH,
        ...(purpose === 'hmac' && { hash: 'SHA-256' })
      },
      false,
      purpose === 'encryption' ? ['encrypt', 'decrypt'] : ['sign', 'verify']
    );
  }

  /**
   * Obtém ou gera chave de criptografia
   */
  private async getEncryptionKey(context: string): Promise<{ key: CryptoKey; keyId: string }> {
    const keyId = this.getCurrentKeyId(context);
    const cacheKey = `${context}-${keyId}`;

    if (this.keyCache.has(cacheKey)) {
      return { key: this.keyCache.get(cacheKey)!, keyId };
    }

    const key = await this.generatePBKDF2Key(context, keyId, 'encryption');
    this.keyCache.set(cacheKey, key);
    
    // Atualiza informações de uso da chave
    this.updateKeyUsage(context, keyId);
    
    return { key, keyId };
  }

  /**
   * Obtém ou gera chave HMAC
   */
  private async getHMACKey(context: string, keyId: string): Promise<CryptoKey> {
    const cacheKey = `${context}-${keyId}-hmac`;

    if (this.hmacKeyCache.has(cacheKey)) {
      return this.hmacKeyCache.get(cacheKey)!;
    }

    const key = await this.generatePBKDF2Key(context, keyId, 'hmac');
    this.hmacKeyCache.set(cacheKey, key);
    
    return key;
  }

  /**
   * Obtém ID da chave atual para um contexto
   */
  private getCurrentKeyId(context: string): string {
    const info = this.keyRotationInfo.get(context);
    if (!info || this.shouldRotateKey(info)) {
      return this.generateNewKeyId(context);
    }
    return info.keyId;
  }

  /**
   * Gera novo ID de chave
   */
  private generateNewKeyId(context: string): string {
    const timestamp = Date.now();
    const random = crypto.getRandomValues(new Uint8Array(8));
    const keyId = `${context}-${timestamp}-${Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('')}`;
    
    this.keyRotationInfo.set(context, {
      keyId,
      createdAt: timestamp,
      lastUsed: timestamp,
      rotationCount: (this.keyRotationInfo.get(context)?.rotationCount || 0) + 1
    });
    
    this.saveKeyRotationInfo();
    return keyId;
  }

  /**
   * Verifica se a chave deve ser rotacionada
   */
  private shouldRotateKey(info: KeyRotationInfo): boolean {
    const now = Date.now();
    const age = now - info.createdAt;
    const timeSinceLastUse = now - info.lastUsed;
    
    return age > SECURITY_CONFIG.KEY_ROTATION_INTERVAL || 
           age > SECURITY_CONFIG.MAX_KEY_AGE ||
           timeSinceLastUse > SECURITY_CONFIG.KEY_ROTATION_INTERVAL;
  }

  /**
   * Atualiza informações de uso da chave
   */
  private updateKeyUsage(context: string, keyId: string): void {
    const info = this.keyRotationInfo.get(context);
    if (info && info.keyId === keyId) {
      info.lastUsed = Date.now();
      this.saveKeyRotationInfo();
    }
  }

  /**
   * Salva informações de rotação de chaves
   */
  private saveKeyRotationInfo(): void {
    try {
      const data = Object.fromEntries(this.keyRotationInfo);
      localStorage.setItem('onedrip_key_rotation', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar informações de rotação:', error);
    }
  }

  /**
   * Criptografa dados com AES-256-GCM
   */
  private async encryptData(
    data: string,
    key: CryptoKey,
    keyId: string
  ): Promise<{ encrypted: string; iv: string; metadata: StorageMetadata }> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IV_LENGTH));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );

    const metadata: StorageMetadata = {
      version: '2.0',
      algorithm: 'AES-256-GCM',
      keyId,
      timestamp: Date.now(),
      context: 'enhanced-storage'
    };

    return {
      encrypted: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv),
      metadata
    };
  }

  /**
   * Descriptografa dados
   */
  private async decryptData(
    encryptedData: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> {
    try {
      const encrypted = this.base64ToArrayBuffer(encryptedData);
      const ivArray = this.base64ToArrayBuffer(iv);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: ivArray },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Erro na descriptografia:', error);
      throw new Error('Falha na descriptografia dos dados');
    }
  }

  /**
   * Gera HMAC para validação de integridade
   */
  private async generateHMAC(data: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    return this.arrayBufferToBase64(signature);
  }

  /**
   * Verifica HMAC
   */
  private async verifyHMAC(data: string, hmac: string, key: CryptoKey): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const signature = this.base64ToArrayBuffer(hmac);
      
      return await crypto.subtle.verify(
        'HMAC',
        key,
        signature,
        encoder.encode(data)
      );
    } catch (error) {
      console.error('Erro na verificação HMAC:', error);
      return false;
    }
  }

  /**
   * Proteção contra ataques de timing
   */
  private async timingProtection(): Promise<void> {
    const delay = Math.random() * SECURITY_CONFIG.TIMING_ATTACK_DELAY;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Armazena dados de forma segura (método público)
   */
  async setItem(
    key: string,
    value: any,
    options: EnhancedSecureStorageOptions = {}
  ): Promise<void> {
    await this.initializeKeyRotation();

    const {
      encrypt = this.isSensitiveData(key, value),
      storage = 'localStorage',
      ttl,
      context = 'default',
      enableIntegrityCheck = true,
      enableTimingProtection = true
    } = options;

    try {
      if (enableTimingProtection) {
        await this.timingProtection();
      }

      const dataToStore = {
        value,
        encrypted: encrypt,
        timestamp: Date.now(),
        ttl
      };

      let serializedData = JSON.stringify(dataToStore);

      if (encrypt) {
        const { key: cryptoKey, keyId } = await this.getEncryptionKey(context);
        const { encrypted, iv, metadata } = await this.encryptData(serializedData, cryptoKey, keyId);
        
        metadata.ttl = ttl;
        metadata.context = context;

        let hmac = '';
        if (enableIntegrityCheck) {
          const hmacKey = await this.getHMACKey(context, keyId);
          const dataForHMAC = `${encrypted}${iv}${JSON.stringify(metadata)}`;
          hmac = await this.generateHMAC(dataForHMAC, hmacKey);
        }

        const encryptedPackage: EncryptedData = {
          data: `${encrypted}:${iv}`,
          metadata,
          hmac
        };

        serializedData = JSON.stringify(encryptedPackage);
      }

      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      storageObj.setItem(`enhanced_secure_${key}`, serializedData);

    } catch (error) {
      console.error('Erro ao armazenar dados:', error);
      throw new Error('Falha no armazenamento seguro aprimorado');
    }
  }

  /**
   * Recupera dados armazenados de forma segura (método público)
   */
  async getItem(
    key: string,
    storage: 'localStorage' | 'sessionStorage' = 'localStorage',
    options: { enableTimingProtection?: boolean } = {}
  ): Promise<any> {
    await this.initializeKeyRotation();

    const { enableTimingProtection = true } = options;

    try {
      if (enableTimingProtection) {
        await this.timingProtection();
      }

      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      const storedData = storageObj.getItem(`enhanced_secure_${key}`);

      if (!storedData) {
        return null;
      }

      let parsedData = JSON.parse(storedData);

      // Verifica se é dados criptografados
      if (parsedData.data && parsedData.metadata && parsedData.metadata.algorithm) {
        const encryptedPackage: EncryptedData = parsedData;
        const { data, metadata, hmac } = encryptedPackage;

        // Verifica integridade se HMAC estiver presente
        if (hmac) {
          const hmacKey = await this.getHMACKey(metadata.context, metadata.keyId);
          const dataForHMAC = `${data}${JSON.stringify(metadata)}`;
          const isValid = await this.verifyHMAC(dataForHMAC, hmac, hmacKey);
          
          if (!isValid) {
            console.error('Falha na verificação de integridade dos dados');
            this.removeItem(key, storage);
            return null;
          }
        }

        // Descriptografa dados
        const [encryptedData, iv] = data.split(':');
        const { key: cryptoKey } = await this.getEncryptionKey(metadata.context);
        const decryptedData = await this.decryptData(encryptedData, iv, cryptoKey);
        parsedData = JSON.parse(decryptedData);

        // Atualiza uso da chave
        this.updateKeyUsage(metadata.context, metadata.keyId);
      }

      // Verifica TTL
      if (parsedData.ttl && parsedData.timestamp) {
        const now = Date.now();
        if (now - parsedData.timestamp > parsedData.ttl) {
          this.removeItem(key, storage);
          return null;
        }
      }

      return parsedData.value;

    } catch (error) {
      console.error('Erro ao recuperar dados:', error);
      // Remove dados corrompidos
      this.removeItem(key, storage);
      return null;
    }
  }

  /**
   * Remove item do armazenamento
   */
  removeItem(
    key: string,
    storage: 'localStorage' | 'sessionStorage' = 'localStorage'
  ): void {
    const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
    storageObj.removeItem(`enhanced_secure_${key}`);
  }

  /**
   * Limpa todos os dados seguros aprimorados
   */
  clear(storage: 'localStorage' | 'sessionStorage' = 'localStorage'): void {
    const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
    const keysToRemove: string[] = [];

    for (let i = 0; i < storageObj.length; i++) {
      const key = storageObj.key(i);
      if (key && key.startsWith('enhanced_secure_')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => storageObj.removeItem(key));
  }

  /**
   * Força rotação de chaves
   */
  async rotateKeys(context?: string): Promise<void> {
    if (context) {
      this.generateNewKeyId(context);
      this.keyCache.delete(`${context}-${this.getCurrentKeyId(context)}`);
      this.hmacKeyCache.delete(`${context}-${this.getCurrentKeyId(context)}-hmac`);
    } else {
      // Rotaciona todas as chaves
      for (const [ctx] of this.keyRotationInfo) {
        await this.rotateKeys(ctx);
      }
    }
  }

  /**
   * Verifica e rotaciona chaves automaticamente
   */
  private async checkAndRotateKeys(): Promise<void> {
    for (const [context, info] of this.keyRotationInfo) {
      if (this.shouldRotateKey(info)) {
        await this.rotateKeys(context);
      }
    }
  }

  /**
   * Agenda próxima rotação de chaves
   */
  private scheduleKeyRotation(): void {
    setInterval(async () => {
      await this.checkAndRotateKeys();
    }, SECURITY_CONFIG.KEY_ROTATION_INTERVAL);
  }

  /**
   * Verifica se dados são sensíveis
   */
  private isSensitiveData(key: string, value: any): boolean {
    const sensitiveKeys = [
      'auth', 'token', 'session', 'user', 'password', 'email', 'phone',
      'cpf', 'cnpj', 'credit', 'payment', 'license', 'api_key', 'secret',
      'private', 'secure', 'confidential', 'sensitive'
    ];

    const keyLower = key.toLowerCase();
    return sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
  }

  /**
   * Utilitários de conversão
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...bytes));
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Verifica se as chaves precisam ser rotacionadas
   */
  shouldRotateKeys(): boolean {
    const rotations = Array.from(this.keyRotationInfo.values());
    return rotations.some(info => this.shouldRotateKey(info));
  }

  /**
   * Limpa dados expirados do armazenamento
   */
  async cleanup(): Promise<void> {
    try {
      const storages = [localStorage, sessionStorage];
      let totalCleaned = 0;

      for (const storage of storages) {
        const keysToRemove: string[] = [];

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith('enhanced_secure_')) {
            try {
              const data = storage.getItem(key);
              if (data) {
                const parsed = JSON.parse(data);
                
                // Verifica se é um dado criptografado com TTL
                if (parsed.metadata && parsed.metadata.ttl) {
                  const expirationTime = parsed.metadata.timestamp + parsed.metadata.ttl;
                  if (Date.now() > expirationTime) {
                    keysToRemove.push(key);
                  }
                }
                // Verifica se é um dado simples com TTL
                else if (parsed.timestamp && parsed.ttl) {
                  const expirationTime = parsed.timestamp + parsed.ttl;
                  if (Date.now() > expirationTime) {
                    keysToRemove.push(key);
                  }
                }
              }
            } catch (error) {
              // Se não conseguir parsear, remove o item corrompido
              keysToRemove.push(key);
            }
          }
        }

        // Remove itens expirados
        keysToRemove.forEach(key => storage.removeItem(key));
        totalCleaned += keysToRemove.length;
      }

      console.log(`🧹 Enhanced Secure Storage cleanup: ${totalCleaned} itens expirados removidos`);
    } catch (error) {
      console.error('Erro durante limpeza do Enhanced Secure Storage:', error);
    }
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats(): {
    totalKeys: number;
    keyRotations: number;
    oldestKey: number;
    newestKey: number;
  } {
    const rotations = Array.from(this.keyRotationInfo.values());
    return {
      totalKeys: rotations.length,
      keyRotations: rotations.reduce((sum, info) => sum + info.rotationCount, 0),
      oldestKey: Math.min(...rotations.map(info => info.createdAt)),
      newestKey: Math.max(...rotations.map(info => info.createdAt))
    };
  }
}

// Instância singleton
export const enhancedSecureStorage = EnhancedSecureStorage.getInstance();

// Funções de conveniência
export const setEnhancedSecureItem = (
  key: string,
  value: any,
  options?: EnhancedSecureStorageOptions
) => enhancedSecureStorage.setItem(key, value, options);

export const getEnhancedSecureItem = (
  key: string,
  storage?: 'localStorage' | 'sessionStorage'
) => enhancedSecureStorage.getItem(key, storage);

export const removeEnhancedSecureItem = (
  key: string,
  storage?: 'localStorage' | 'sessionStorage'
) => enhancedSecureStorage.removeItem(key, storage);

export const clearEnhancedSecureStorage = (
  storage?: 'localStorage' | 'sessionStorage'
) => enhancedSecureStorage.clear(storage);

export const rotateStorageKeys = (context?: string) => 
  enhancedSecureStorage.rotateKeys(context);

export default EnhancedSecureStorage;