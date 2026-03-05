/**
 * Sistema Unificado de Gestão de Storage Local
 * Organiza todos os dados do usuário de forma estruturada e otimizada
 */

export interface UserStorageData {
  user?:
    | {
        id: string;
        email: string;
        name?: string;
        role?: string;
        avatar_url?: string;
      }
    | undefined;
  settings: {
    theme?: string | undefined;
    notifications?: boolean;
    budgetWarning?: boolean;
    budgetWarningDays?: number;
    painelEnabled?: boolean | undefined;
    forceNormalDashboard?: boolean;
    socialQrEnabled?: boolean;
  };
  cache: {
    lastSync?: number | undefined;
    profileData?: Record<string, unknown>;
    licenseInfo?: Record<string, unknown>;
    expiry?: number; // TTL para cache
  };
  licenseCache?:
    | {
        hasValidLicense?: boolean;
        licenseStatus?: string;
        lastVerified?: number;
        expiresAt?: string;
        cacheExpiry?: number;
        isExpired?: boolean;
        needsActivation?: boolean;
      }
    | undefined;
  sessionBackup?:
    | {
        hasValidSession?: boolean;
        lastLogin?: number;
        deviceInfo?: string;
      }
    | undefined;
  navigationState?:
    | {
        activeTab?: string | undefined;
        lastActiveTab?: string | undefined;
        editingItemId?: string | undefined;
        editingItemType?: 'budget' | 'service_order' | 'client' | undefined;
        lastActiveTimestamp?: number;
        shouldRestore?: boolean;
        navigationHistory?: string[];
      }
    | undefined;
}

class LocalStorageManager {
  private readonly APP_KEY = 'onedrip_app_data';
  private readonly CACHE_TTL = 1000 * 60 * 30; // 30 minutos
  private readonly BACKUP_KEY = 'onedrip_backup';
  private readonly NAVIGATION_RESTORE_TTL = 1000 * 60 * 60 * 2; // 2 horas

  /**
   * Obter todos os dados do app
   */
  getData(): UserStorageData {
    try {
      const data = localStorage.getItem(this.APP_KEY);
      if (!data) return this.getDefaultData();
      
      const parsed = JSON.parse(data);
      
      // Verificar se cache expirou
      if (parsed.cache?.expiry && Date.now() > parsed.cache.expiry) {
        parsed.cache = { lastSync: Date.now() };
      }
      
      return { ...this.getDefaultData(), ...parsed };
    } catch (error) {
      console.warn('Erro ao ler dados do localStorage:', error);
      return this.getDefaultData();
    }
  }

  /**
   * Salvar dados do app de forma otimizada
   */
  setData(data: Partial<UserStorageData>, merge = true): void {
    try {
      const currentData = merge ? this.getData() : this.getDefaultData();
      const newData = { ...currentData, ...data };
      
      // Definir TTL para cache
      if (newData.cache) {
        newData.cache.expiry = Date.now() + this.CACHE_TTL;
      }
      
      localStorage.setItem(this.APP_KEY, JSON.stringify(newData));
    } catch (error) {
      console.error('Erro ao salvar dados no localStorage:', error);
    }
  }

  /**
   * Atualizar dados do usuário
   */
  setUserData(userData: UserStorageData['user']): void {
    this.setData({ user: userData });
  }

  /**
   * Atualizar configurações
   */
  setSettings(settings: Partial<UserStorageData['settings']>): void {
    const currentData = this.getData();
    this.setData({
      settings: { ...currentData.settings, ...settings }
    });
  }

  /**
   * Atualizar cache
   */
  setCache(cacheData: Partial<UserStorageData['cache']>): void {
    const currentData = this.getData();
    this.setData({
      cache: { ...currentData.cache, ...cacheData, lastSync: Date.now() }
    });
  }

  /**
   * Definir cache de licença
   */
  setLicenseCache(licenseData: Partial<UserStorageData['licenseCache']>): void {
    const LICENSE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas
    this.setData({
      licenseCache: { 
        ...this.getData().licenseCache, 
        ...licenseData, 
        lastVerified: Date.now(),
        cacheExpiry: Date.now() + LICENSE_CACHE_TTL 
      }
    });
  }

  /**
   * Obter cache de licença válido
   */
  getLicenseCache(): UserStorageData['licenseCache'] | null {
    const data = this.getData();
    const licenseCache = data.licenseCache;
    
    if (!licenseCache || !licenseCache.cacheExpiry) {
      return null;
    }
    
    // Verificar se o cache ainda é válido
    if (Date.now() > licenseCache.cacheExpiry) {
      this.clearLicenseCache();
      return null;
    }
    
    return licenseCache;
  }

  /**
   * Verificar se há licença válida em cache
   */
  hasValidLicenseCache(): boolean {
    const cache = this.getLicenseCache();
    return cache?.hasValidLicense === true && !cache?.isExpired && !cache?.needsActivation;
  }

  /**
   * Limpar cache de licença
   */
  clearLicenseCache(): void {
    this.setData({ licenseCache: {} });
    // remove efetivamente do storage
    this.setData({ licenseCache: undefined }, true);
  }

  /**
   * Salvar estado de navegação
   */
  setNavigationState(navigationData: Partial<UserStorageData['navigationState']>): void {
    const currentData = this.getData();
    const currentNavState = currentData.navigationState || {};
    
    this.setData({
      navigationState: {
        ...currentNavState,
        ...navigationData,
        lastActiveTimestamp: Date.now()
      }
    });
  }

  /**
   * Obter estado de navegação
   */
  getNavigationState(): UserStorageData['navigationState'] | null {
    const data = this.getData();
    const navState = data.navigationState;
    
    if (!navState || !navState.lastActiveTimestamp) {
      return null;
    }
    
    // Verificar se o estado ainda é válido (dentro do TTL)
    const isExpired = Date.now() - navState.lastActiveTimestamp > this.NAVIGATION_RESTORE_TTL;
    
    if (isExpired) {
      // Limpar estado expirado
      this.clearNavigationState();
      return null;
    }
    
    return navState;
  }

  /**
   * Marcar que o usuário está editando um item
   */
  setEditingState(itemId: string, itemType: 'budget' | 'service_order' | 'client', activeTab?: string): void {
    this.setNavigationState({
      editingItemId: itemId,
      editingItemType: itemType,
      ...(activeTab ? { activeTab } : {}),
      shouldRestore: true
    });
  }

  /**
   * Limpar estado de edição
   */
  clearEditingState(): void {
    const currentData = this.getData();
    const navState = currentData.navigationState || {};

    const nextNavState: UserStorageData['navigationState'] = {
      ...navState,
      shouldRestore: false
    };
    delete (nextNavState as any).editingItemId;
    delete (nextNavState as any).editingItemType;

    this.setData({ navigationState: nextNavState });
  }

  /**
   * Verificar se deve restaurar estado de edição
   */
  shouldRestoreEditingState(): boolean {
    const navState = this.getNavigationState();
    return !!(navState?.shouldRestore && navState?.editingItemId);
  }

  /**
   * Limpar estado de navegação
   */
  clearNavigationState(): void {
    const currentData = this.getData();
    const next: UserStorageData = { ...currentData };
    delete (next as any).navigationState;
    localStorage.setItem(this.APP_KEY, JSON.stringify(next));
  }

  /**
   * Criar backup da sessão
   */
  createSessionBackup(): void {
    const backupData = {
      hasValidSession: true,
      lastLogin: Date.now(),
      deviceInfo: navigator.userAgent.substring(0, 50)
    };
    
    this.setData({ sessionBackup: backupData });
    
    // Backup adicional separado para emergências
    try {
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify({
        timestamp: Date.now(),
        userData: this.getData().user
      }));
    } catch (error) {
      console.warn('Erro ao criar backup:', error);
    }
  }

  /**
   * Verificar se há backup válido
   */
  hasValidBackup(): boolean {
    const data = this.getData();
    const backup = data.sessionBackup;

    if (!backup?.hasValidSession) return false;

    // Backup válido por 7 dias
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    return !!backup.lastLogin && (Date.now() - backup.lastLogin) < maxAge;
  }

  /**
   * Limpeza inteligente - preserva dados essenciais
   */
  smartClear(): void {
    const currentData = this.getData();
    const preservedSettings: UserStorageData['settings'] = {
      ...(currentData.settings.theme ? { theme: currentData.settings.theme } : {}),
      ...(currentData.settings.painelEnabled !== undefined ? { painelEnabled: currentData.settings.painelEnabled } : {})
    };

    // Manter apenas configurações essenciais
    const cleanData: UserStorageData = {
      ...this.getDefaultData(),
      settings: preservedSettings
    };

    localStorage.setItem(this.APP_KEY, JSON.stringify(cleanData));
    
    // Limpar dados específicos antigos
    this.clearLegacyData();
  }

  /**
   * Limpeza completa (para logout)
   */
  fullClear(): void {
    localStorage.removeItem(this.APP_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
    this.clearLegacyData();
  }

  /**
   * Migrar dados antigos para nova estrutura
   */
  migrateOldData(): void {
    const migrations = [
      'painel-enabled',
      'force-normal-dashboard', 
      'ext-social-qr-enabled',
      'admin-mode',
      'budgetCopyData',
      'user-feedback'
    ];

    const settings: Record<string, unknown> = {};
    const migrated: string[] = [];

    migrations.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) {
        switch (key) {
          case 'painel-enabled':
            settings.painelEnabled = value === 'true';
            break;
          case 'force-normal-dashboard':
            settings.forceNormalDashboard = value === 'true';
            break;
          case 'ext-social-qr-enabled':
            settings.socialQrEnabled = value === 'true';
            break;
        }
        migrated.push(key);
      }
    });

    if (migrated.length > 0) {
      this.setSettings(settings);
      migrated.forEach(key => localStorage.removeItem(key));
      console.log('Dados migrados:', migrated);
    }
  }

  /**
   * Limpar dados legados/antigos
   */
  private clearLegacyData(): void {
    const legacyKeys = [
      'painel-enabled',
      'force-normal-dashboard',
      'ext-social-qr-enabled',
      'admin-mode',
      'pwa-prompt-dismissed',
      'pwa-prompt-last-dismissed',
      'update-dismissed',
      'budgetCopyData'
    ];

    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Obter dados padrão
   */
  private getDefaultData(): UserStorageData {
    return {
      settings: {
        notifications: true,
        budgetWarning: true,
        budgetWarningDays: 15,
        painelEnabled: false,
        forceNormalDashboard: false,
        socialQrEnabled: false
      },
      cache: {
        lastSync: Date.now()
      }
    };
  }

  /**
   * Obter estatísticas de uso
   */
  getStorageStats(): { size: number; keys: number; lastSync?: number } {
    const data = this.getData();
    const size = new Blob([JSON.stringify(data)]).size;
    
    return {
      size,
      keys: Object.keys(localStorage).length,
      ...(data.cache.lastSync !== undefined ? { lastSync: data.cache.lastSync } : {})
    };
  }
}

export const storageManager = new LocalStorageManager();