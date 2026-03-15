/**
 * Middleware de rotas com proteção centralizada
 * Implementa interceptação de navegação e cache inteligente
 */

import { multiTabCache } from '@/services/multiTabCache';
import { supabase } from '@/integrations/supabase/client';
import { ROUTE_CONFIG, isPublicRoute, requiresAuth, requiresLicense, requiresEmailConfirmation } from '@/config/routeConfig';
import { securityLogger } from '@/services/SecurityLogger';
import { storageManager } from '@/utils/localStorageManager';
import type { User } from '@supabase/supabase-js';

interface RouteProtection {
  requiresAuth: boolean;
  requiresEmailVerification: boolean;
  requiresLicense: boolean;
  requiredRole?: string;
  requiredPermission?: string;
  allowedRoles?: string[];
}

interface NavigationState {
  user: User | null;
  isEmailVerified: boolean;
  hasValidLicense: boolean;
  userRole: string | null;
  lastCheck: number;
  licenseStatus?: 'active' | 'inactive' | 'expired' | 'not_found';
  licenseExpiresAt?: string;
  isOffline?: boolean;
  isUsingCache?: boolean;
}

interface LicenseCheckResult {
  status: 'active' | 'inactive' | 'expired' | 'not_found';
  expiresAt?: string;
  lastCheck: number;
  isOffline?: boolean;
  isUsingCache?: boolean;
}

interface RouteConfig {
  [path: string]: RouteProtection;
}

class RouteMiddleware {
  private static instance: RouteMiddleware;
  private routeConfig: RouteConfig = {};
  private navigationState: NavigationState | null = null;
  private readonly CACHE_KEY = 'navigation-state';
  private lastStateCheck = 0;
  private pendingChecks = new Set<string>();
  // Cache curto para evitar múltiplas chamadas RPC de licença em sequência
  private readonly licenseCheckCache = new Map<
    string,
    {
      checkedAt: number;
      result: LicenseCheckResult;
      pending?: Promise<LicenseCheckResult>;
    }
  >();
  private readonly LICENSE_CACHE_TTL_MS = 5 * 60_000; // 5 min: alinhado com cache do guard, realtime cobre mudanças
  // Configurações centralizadas
  private readonly config = ROUTE_CONFIG;

  private constructor() {
    this.setupDefaultRoutes();
    this.setupCacheListener();
  }

  static getInstance(): RouteMiddleware {
    if (!RouteMiddleware.instance) {
      RouteMiddleware.instance = new RouteMiddleware();
    }
    return RouteMiddleware.instance;
  }

  private setupDefaultRoutes() {
    // Configurações de rotas baseadas no arquivo de configuração centralizada
    this.routeConfig = {
      // Rotas que requerem apenas autenticação
      '/licenca': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: false },
      '/reset-email': { requiresAuth: true, requiresEmailVerification: false, requiresLicense: false },
      
      // Rotas protegidas (requerem licença válida)
      '/dashboard': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/painel': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders/new': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/service-orders/settings': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/settings': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      
      '/msg': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/whatsapp': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      '/whats': { requiresAuth: true, requiresEmailVerification: true, requiresLicense: true },
      // Rotas administrativas
      '/admin': { 
        requiresAuth: true, 
        requiresEmailVerification: true, 
        requiresLicense: true,
        allowedRoles: ['admin', 'super_admin']
      }
    };
  }

  private setupCacheListener() {
    multiTabCache.addListener((key, data) => {
      if (key === this.CACHE_KEY) {
        this.navigationState = data;
        console.log('🔄 Estado de navegação atualizado via cache multi-tab');
      }
    });
  }

  /**
   * Obtém o estado atual de navegação com cache inteligente
   */
  private async getNavigationState(forceRefresh = false): Promise<NavigationState> {
    const now = Date.now();
    
    // Rate limiting
    if (!forceRefresh && now - this.lastStateCheck < this.config.rateLimit.windowMs) {
      if (this.navigationState) {
        return this.navigationState;
      }
    }

    // Tentar obter do cache primeiro
    if (!forceRefresh) {
      const cachedState = multiTabCache.get<NavigationState>(this.CACHE_KEY);
      if (cachedState && now - cachedState.lastCheck < this.config.cache.defaultTTL) {
        this.navigationState = cachedState;
        return cachedState;
      }
    }

    // Evitar múltiplas verificações simultâneas
    const checkId = `check-${now}`;
    if (this.pendingChecks.has(checkId)) {
      // Aguardar um pouco e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.navigationState || this.getDefaultState();
    }

    this.pendingChecks.add(checkId);
    this.lastStateCheck = now;

    try {
      // Obter dados atuais do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user || null;
      
      let hasValidLicense = false;
      let userRole: string | null = null;
      let licenseStatus: 'active' | 'inactive' | 'expired' | 'not_found' = 'not_found';
      let licenseExpiresAt: string | undefined;
      let isOffline = false;
      let isUsingCache = false;

      if (user) {
        // Verificar licença usando método detalhado
        
        try {
          const licenseCheck = await this.checkLicenseStatus(user.id);
          licenseStatus = licenseCheck.status;
          licenseExpiresAt = licenseCheck.expiresAt;
          hasValidLicense = licenseCheck.status === 'active';
          isOffline = licenseCheck.isOffline || false;
          isUsingCache = licenseCheck.isUsingCache || false;
        } catch (error) {
          console.warn('⚠️ Erro ao verificar licença:', error);
          hasValidLicense = false;
          licenseStatus = 'not_found';
        }

        // Obter role do usuário
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          userRole = profile?.role || 'user';
        } catch (error) {
          console.warn('⚠️ Erro ao obter role do usuário:', error);
          userRole = 'user';
        }
      }

      const newState: NavigationState = {
        user,
        isEmailVerified: !!user?.email_confirmed_at,
        hasValidLicense,
        userRole,
        lastCheck: now,
        licenseStatus,
        ...(licenseExpiresAt ? { licenseExpiresAt } : {}),
        isOffline,
        isUsingCache,
      };

      // Atualizar cache e estado local
      this.navigationState = newState;
      multiTabCache.set(this.CACHE_KEY, newState, this.config.cache.defaultTTL);

      return newState;
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.error('❌ Erro ao obter estado de navegação:', error);
      }
      return this.getDefaultState();
    } finally {
      this.pendingChecks.delete(checkId);
    }
  }

  private getDefaultState(): NavigationState {
    return {
      user: null,
      isEmailVerified: false,
      hasValidLicense: false,
      userRole: null,
      lastCheck: Date.now(),
      licenseStatus: 'not_found',
      isOffline: false,
      isUsingCache: false
    };
  }

  /**
   * Verifica se o usuário pode acessar uma rota específica
   */
  async canAccessRoute(path: string, forceRefresh = false): Promise<{
    canAccess: boolean;
    redirectTo?: string;
    reason?: string;
    licenseStatus?: 'active' | 'inactive' | 'expired' | 'not_found';
  }> {
    // Normalizar path
    const normalizedPath = this.normalizePath(path);
    const protection = this.getRouteProtection(normalizedPath);
    
    // Verificar se é rota pública
    if (isPublicRoute(path)) {
      return { canAccess: true };
    }

    // Se não há proteção definida, permitir acesso
    if (!protection) {
      return { canAccess: true };
    }

    const state = await this.getNavigationState(forceRefresh);

    // Verificar autenticação
    if (!state.user && requiresAuth(path)) {
      return {
        canAccess: false,
        redirectTo: this.config.redirects.unauthenticated,
        reason: 'Usuário não autenticado'
      };
    }

    // Verificar email confirmado
    if (state.user && !state.user.email_confirmed_at && requiresEmailConfirmation(path)) {
      return {
        canAccess: false,
        redirectTo: this.config.redirects.emailNotConfirmed,
        reason: 'Email não confirmado'
      };
    }

    // Verificar licença (apenas para rotas que precisam)
    if (requiresLicense(path) && path !== '/licenca' && path !== '/verify-licenca') {
      if (state.user) {
        // Evitar checar licença duas vezes (getNavigationState já checou)
        const licenseStatus = state.licenseStatus;
        const licenseCheck =
          licenseStatus
            ? ({ status: licenseStatus, lastCheck: state.lastCheck, ...(state.licenseExpiresAt ? { expiresAt: state.licenseExpiresAt } : {}) } as LicenseCheckResult)
            : await this.checkLicenseStatus(state.user.id);
        
        if (licenseCheck.status === 'inactive') {
          // Log de tentativa de acesso não autorizado
          this.logUnauthorizedAccess(state.user.id, path, 'inactive_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              '/verify-licenca',
              'Acesso ao suporte inativo'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: '/verify-licenca',
            reason: 'Acesso ao suporte inativo - verifique seu acesso ao suporte',
            licenseStatus: 'inactive'
          };
        }
        
        if (licenseCheck.status === 'expired') {
          this.logUnauthorizedAccess(state.user.id, path, 'expired_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              '/verify-licenca',
              'Acesso ao suporte expirado'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: '/verify-licenca',
            reason: 'Acesso ao suporte expirado - redirecionando para verificação',
            licenseStatus: 'expired'
          };
        }
        
        if (licenseCheck.status === 'not_found') {
          this.logUnauthorizedAccess(state.user.id, path, 'no_license');
          
          // Registrar redirecionamento automático
          try {
            await securityLogger.logAutoRedirect(
              state.user.id,
              path,
              this.config.redirects.invalidLicense,
              'Nenhum acesso ao suporte encontrado'
            );
          } catch (error) {
            console.warn('⚠️ [RouteMiddleware] Falha ao registrar redirecionamento:', error);
          }
          
          return {
            canAccess: false,
            redirectTo: this.config.redirects.invalidLicense,
            reason: 'Nenhum acesso ao suporte encontrado',
            licenseStatus: 'not_found'
          };
        }
      } else {
        return {
          canAccess: false,
          redirectTo: this.config.redirects.invalidLicense,
          reason: 'Acesso ao suporte inválido ou expirado'
        };
      }
    }

    // Verificar roles
    if (protection.allowedRoles && state.userRole) {
      if (!protection.allowedRoles.includes(state.userRole)) {
        return {
          canAccess: false,
          redirectTo: '/unauthorized',
          reason: `Role '${state.userRole}' não autorizada`
        };
      }
    }

    return { canAccess: true };
  }

  /**
   * Normaliza o path da rota
   */
  private normalizePath(path: string): string {
    // Remover query params e hash (protegendo índices com noUncheckedIndexedAccess)
    const base = path.split('?')[0] ?? path;
    const cleanPath = (base.split('#')[0] ?? base) || path;

    // Verificar padrões dinâmicos
    for (const routePath of Object.keys(this.routeConfig)) {
      if (this.matchesPattern(cleanPath, routePath)) {
        return routePath;
      }
    }

    return cleanPath;
  }

  /**
   * Verifica se um path corresponde a um padrão de rota
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Converter padrão para regex
    const regexPattern = pattern
      .replace(/:[^/]+/g, '[^/]+') // :id -> [^/]+
      .replace(/\*/g, '.*'); // * -> .*
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Obtém a proteção de uma rota
   */
  private getRouteProtection(path: string): RouteProtection | null {
    // Busca exata primeiro
    if (this.routeConfig[path]) {
      return this.routeConfig[path];
    }

    // Busca por padrões
    for (const [routePath, protection] of Object.entries(this.routeConfig)) {
      if (this.matchesPattern(path, routePath)) {
        return protection;
      }
    }

    // Rotas não configuradas são protegidas por padrão
    return {
      requiresAuth: true,
      requiresEmailVerification: true,
      requiresLicense: true
    };
  }

  /**
   * Invalida o cache de estado de navegação
   */
  invalidateState(): void {
    this.navigationState = null;
    multiTabCache.invalidate(this.CACHE_KEY);
  }

  /**
   * Verifica o status detalhado da licença do usuário usando a função RPC
   * com fallback e tratamento robusto de erros
   */
  private async checkLicenseStatus(userId: string): Promise<LicenseCheckResult> {
    type LicenseStatusRpc = {
      has_license: boolean;
      is_valid: boolean;
      requires_activation: boolean | null;
      requires_renewal: boolean | null;
      expired_at: string | null;
      expires_at: string | null;
      days_until_expiry: number | null;
      days_remaining: number | null;
    };

    const isLicenseStatusRpc = (data: unknown): data is LicenseStatusRpc => {
      return !!data && typeof data === 'object' && !Array.isArray(data) && 'has_license' in data;
    };

    const isOffline = !navigator.onLine;

    // Online: usar cache curto para reduzir chamadas repetidas durante guards/navegação
    if (!isOffline) {
      const now = Date.now();
      const cached = this.licenseCheckCache.get(userId);

      if (cached?.pending) {
        return cached.pending;
      }

      if (cached && now - cached.checkedAt < this.LICENSE_CACHE_TTL_MS) {
        return {
          ...cached.result,
          isUsingCache: true,
        };
      }
    }

    // Se estiver offline, tentar usar cache
    if (isOffline) {
      const cachedLicense = storageManager.getLicenseCache();
      if (cachedLicense && storageManager.hasValidLicenseCache()) {
        console.log('🔄 [RouteMiddleware] Usando cache de licença offline');
        return {
          status: 'active',
          ...(cachedLicense.expiresAt ? { expiresAt: cachedLicense.expiresAt } : {}),
          lastCheck: Date.now(),
          isOffline: true,
          isUsingCache: true,
        };
      } else {
        console.warn('⚠️ [RouteMiddleware] Offline sem cache válido de licença');
        return {
          status: 'not_found',
          lastCheck: Date.now(),
          isOffline: true,
          isUsingCache: false,
        };
      }
    }

    try {
      const pendingPromise: Promise<LicenseCheckResult> = (async (): Promise<LicenseCheckResult> => {
      // Online - verificar normalmente
      // Primeira tentativa: usar a função RPC get_user_license_status
       const { data: licenseData, error } = await supabase
         .rpc('get_user_license_status', { p_user_id: userId });

       const rpcData = isLicenseStatusRpc(licenseData) ? licenseData : null;
      
      if (error) {
        console.error('❌ [RouteMiddleware] Erro na função RPC get_user_license_status:', error);
        
        // Fallback: tentar função validate_user_license se existir
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .rpc('validate_user_license', { p_user_id: userId });
          
          if (!fallbackError && fallbackData) {
            console.log('🔄 [RouteMiddleware] Usando fallback validate_user_license');
            return this.processFallbackLicenseData(fallbackData, userId);
          }
        } catch (fallbackErr) {
          console.warn('⚠️ [RouteMiddleware] Fallback também falhou:', fallbackErr);
        }
        
        // Em caso de erro online, tentar usar cache como fallback
        const cachedLicense = storageManager.getLicenseCache();
        if (cachedLicense && storageManager.hasValidLicenseCache()) {
          console.log('🔄 [RouteMiddleware] Usando cache como fallback após erro');
          return {
            status: 'active',
            ...(cachedLicense.expiresAt ? { expiresAt: cachedLicense.expiresAt } : {}),
            lastCheck: Date.now(),
            isOffline: false,
            isUsingCache: true
          };
        }
        
        const result = { status: 'not_found' as const, lastCheck: Date.now(), isOffline: false, isUsingCache: false };
        
        // Registrar erro na verificação de licença
        try {
          await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_rpc_error');
        } catch (logError) {
          console.warn('⚠️ [RouteMiddleware] Falha ao registrar erro de verificação de licença:', logError);
        }
        
        // Atualizar cache para evitar tempestade de requests em caso de erro repetido
        this.licenseCheckCache.set(userId, { checkedAt: Date.now(), result });
        return result;
      }
      
       if (!rpcData) {
         const result = { status: 'not_found' as const, lastCheck: Date.now() };
        
        // Log da verificação de licença
        console.log(`🔍 [RouteMiddleware] Nenhuma licença encontrada para usuário ${userId}`);
        
        // Registrar a verificação de licença no SecurityLogger
        try {
          await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_no_license');
        } catch (error) {
          console.warn('⚠️ [RouteMiddleware] Falha ao registrar verificação de licença:', error);
        }
        
         this.licenseCheckCache.set(userId, { checkedAt: Date.now(), result });
         return result;
      }
      
      // Determinar status baseado nos dados da função RPC
      let status: 'active' | 'inactive' | 'expired' | 'not_found';
      
      // Lógica melhorada para determinar o status
       if (!rpcData.has_license) {
         status = 'not_found';
       } else if (rpcData.requires_renewal || rpcData.expired_at) {
         status = 'expired';
       } else if (!rpcData.is_valid || rpcData.requires_activation) {
         status = 'inactive';
       } else if (rpcData.has_license && rpcData.is_valid) {
         status = 'active';
       } else {
         // Caso edge - assumir inactive por segurança
         status = 'inactive';
       }
      
       const result: LicenseCheckResult = {
         status,
         ...(rpcData.expires_at ? { expiresAt: rpcData.expires_at } : {}),
         lastCheck: Date.now(),
         isOffline: false,
         isUsingCache: false,
       };
      
      // Se a licença for válida, salvar no cache
      if (status === 'active') {
        storageManager.setLicenseCache({
          hasValidLicense: true,
          licenseStatus: 'active',
          ...(rpcData.expires_at ? { expiresAt: rpcData.expires_at } : {}),
        });
      }
      
      // Log detalhado da verificação de licença
      console.log(`🔍 [RouteMiddleware] Verificação de licença para usuário ${userId}:`, {
        status: result.status,
         has_license: rpcData.has_license,
         is_valid: rpcData.is_valid,
         requires_activation: rpcData.requires_activation,
         requires_renewal: rpcData.requires_renewal,
         expired_at: rpcData.expired_at,
         expires_at: rpcData.expires_at,
         days_remaining: rpcData.days_remaining
      });
      
      // Registrar a verificação de licença no SecurityLogger
      try {
        await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_rpc_check');
      } catch (error) {
        console.warn('⚠️ [RouteMiddleware] Falha ao registrar verificação de licença:', error);
      }
      
       this.licenseCheckCache.set(userId, { checkedAt: Date.now(), result });
       return result;
      })();

      // Guardar promessa para deduplicar chamadas concorrentes
      this.licenseCheckCache.set(userId, {
        checkedAt: Date.now(),
        result: { status: 'not_found' as const, lastCheck: Date.now() },
        pending: pendingPromise,
      });

      const resolved = await pendingPromise;
      // Após resolver, remover pending mantendo o resultado
      this.licenseCheckCache.set(userId, { checkedAt: Date.now(), result: resolved });
      return resolved;
    } catch (error) {
      console.error('❌ [RouteMiddleware] Erro crítico ao verificar status da licença:', error);
      const result = { status: 'not_found' as const, lastCheck: Date.now() };
      
      // Registrar erro na verificação de licença
      try {
        await securityLogger.logLicenseCheck(userId, result.status, 'route_middleware_critical_error');
      } catch (logError) {
        console.warn('⚠️ [RouteMiddleware] Falha ao registrar erro de verificação de licença:', logError);
      }
      
      this.licenseCheckCache.set(userId, { checkedAt: Date.now(), result });
      return result;
    }
  }

  /**
   * Processa dados de licença do fallback validate_user_license
   */
  private processFallbackLicenseData(fallbackData: any, userId: string): LicenseCheckResult {
    try {
      let status: 'active' | 'inactive' | 'expired' | 'not_found' = 'not_found';

      if (fallbackData && typeof fallbackData === 'object') {
        if (fallbackData.has_license === true && fallbackData.is_valid === true) {
          status = 'active';
        } else if (fallbackData.has_license === true) {
          status = 'inactive';
        }
      }

      console.log(`🔄 [RouteMiddleware] Fallback processado para usuário ${userId}: ${status}`);

      const result: LicenseCheckResult = {
        status,
        ...(fallbackData.expires_at ? { expiresAt: fallbackData.expires_at } : {}),
        lastCheck: Date.now(),
        isOffline: false,
        isUsingCache: false,
      };

      return result;
    } catch (error) {
      console.error('❌ [RouteMiddleware] Erro ao processar dados de fallback:', error);
      return { status: 'not_found', lastCheck: Date.now() };
    }
  }


  /**
   * Registra tentativas de acesso não autorizado
   */
  private logUnauthorizedAccess(userId: string, attemptedPath: string, reason: string): void {
    // Implementar log assíncrono para não bloquear a navegação
    setTimeout(async () => {
      try {
        await securityLogger.logUnauthorizedAccess(userId, attemptedPath, reason);
      } catch (error) {
        console.warn('⚠️ Falha ao registrar tentativa de acesso:', error);
      }
    }, 0);
  }

  /**
   * Adiciona ou atualiza proteção de rota
   */
  setRouteProtection(path: string, protection: RouteProtection): void {
    this.routeConfig[path] = protection;
  }

  /**
   * Obtém estatísticas do middleware
   */
  getStats() {
    return {
      routesConfigured: Object.keys(this.routeConfig).length,
      cacheStats: multiTabCache.getStats(),
      lastStateCheck: this.lastStateCheck,
      pendingChecks: this.pendingChecks.size
    };
  }
}

// Instância singleton
export const routeMiddleware = RouteMiddleware.getInstance();

export default RouteMiddleware;
