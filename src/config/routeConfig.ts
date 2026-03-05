/**
 * Configurações centralizadas para middleware de rotas e cache
 */

export const ROUTE_CONFIG = {
  // Configurações de cache
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    maxSize: 100, // máximo de entradas no cache
    cleanupInterval: 10 * 60 * 1000, // limpeza a cada 10 minutos
    version: '2.0.0' // versão do cache para invalidação
  },

  // Configurações de rate limiting
  rateLimit: {
    maxRequests: 10, // máximo de requests por janela
    windowMs: 60 * 1000, // janela de 1 minuto
    blockDuration: 5 * 60 * 1000 // bloqueio por 5 minutos
  },

  // Rotas públicas (não precisam de autenticação)
  publicRoutes: [
    '/',
    '/auth',
    '/signup',
    '/sign',
    '/reset-password',
    '/verify',
    '/verify-licenca',
    '/plans',
    '/plans/m',
    '/plans/a',
    '/purchase-success',
    '/privacy',
    '/terms',
    '/cookies',
    '/cookie',
    '/unauthorized',
    '/share/service-order/*', // rotas de compartilhamento
    '/central-de-ajuda',
    '/downloads', // Download de vídeos (yt-dlp)
    '/k/*' // Rotas públicas das lojas
  ],

  // Rotas que requerem apenas autenticação
  authRequiredRoutes: [
    '/dashboard',
    '/painel',
    '/reset-email',
    '/service-orders',
    '/service-orders/*',
    '/reparos',
    '/reparos/*',
    '/msg',
    '/sistema',
    '/store',
    '/store/*',
    '/whatsapp',
    '/whats'
  ],

  // Rotas que requerem licença válida
  licenseRequiredRoutes: [
    '/dashboard',
    '/painel',
    '/service-orders',
    '/service-orders/*',
    '/reparos',
    '/reparos/*',
    '/settings',
    '/msg',
    '/sistema',
    '/store',
    '/store/*',
    '/whatsapp',
    '/whats'
  ],

  // Rotas que requerem email confirmado
  emailConfirmationRequiredRoutes: [
    '/dashboard',
    '/painel',
    '/service-orders',
    '/service-orders/*',
    '/reparos',
    '/reparos/*',
    '/msg',
    '/store',
    '/store/*'
  ],

  // Redirecionamentos padrão
  redirects: {
    unauthenticated: '/auth',
    invalidLicense: '/licenca',
    emailNotConfirmed: '/verify',
    unauthorized: '/unauthorized',
    default: '/dashboard'
  },

  // Configurações de logging
  logging: {
    enabled: true,
    level: 'info', // 'debug', 'info', 'warn', 'error'
    includeTimestamp: true,
    includeUserInfo: false // por segurança, não logar info do usuário em produção
  },

  // Configurações de retry
  retry: {
    maxAttempts: 3,
    baseDelay: 1000, // 1 segundo
    maxDelay: 5000, // 5 segundos
    backoffFactor: 2
  },

  // Configurações de timeout
  timeouts: {
    authCheck: 5000, // 5 segundos
    licenseCheck: 3000, // 3 segundos
    navigation: 1000 // 1 segundo para navegação
  }
};

// Função para verificar se uma rota é pública
export const isPublicRoute = (path: string): boolean => {
  return ROUTE_CONFIG.publicRoutes.some(route => {
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
};

// Função para verificar se uma rota requer autenticação
export const requiresAuth = (path: string): boolean => {
  if (isPublicRoute(path)) return false;
  
  return ROUTE_CONFIG.authRequiredRoutes.some(route => {
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
};

// Função para verificar se uma rota requer licença
export const requiresLicense = (path: string): boolean => {
  if (isPublicRoute(path)) return false;
  
  return ROUTE_CONFIG.licenseRequiredRoutes.some(route => {
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
};

// Função para verificar se uma rota requer email confirmado
export const requiresEmailConfirmation = (path: string): boolean => {
  if (isPublicRoute(path)) return false;
  
  return ROUTE_CONFIG.emailConfirmationRequiredRoutes.some(route => {
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
};

export default ROUTE_CONFIG;
