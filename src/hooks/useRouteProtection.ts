/**
 * Hook para verificação de proteção de rotas
 * Integra com o middleware de rotas e cache multi-tab
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { routeMiddleware } from '@/middleware/routeMiddleware';
import { multiTabCache } from '@/services/multiTabCache';

interface RouteProtectionResult {
  canAccess: boolean;
  isLoading: boolean;
  redirectTo?: string;
  reason?: string;
  checkAccess: (path?: string, forceRefresh?: boolean) => Promise<void>;
  invalidateCache: () => void;
}

export const useRouteProtection = (customPath?: string): RouteProtectionResult => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>();
  const [reason, setReason] = useState<string>();

  const currentPath = customPath || location.pathname;

  const checkAccess = useCallback(async (path?: string, forceRefresh = false) => {
    const targetPath = path || currentPath;
    
    try {
      setIsLoading(true);
      
      const result = await routeMiddleware.canAccessRoute(targetPath, forceRefresh);
      
      setCanAccess(result.canAccess);
      setRedirectTo(result.redirectTo);
      setReason(result.reason);
    } catch (error) {
      console.error('❌ Erro ao verificar proteção de rota:', error);
      setCanAccess(false);
      setReason('Erro interno de verificação');
    } finally {
      setIsLoading(false);
    }
  }, [currentPath]);

  const invalidateCache = useCallback(() => {
    routeMiddleware.invalidateState();
    checkAccess(currentPath, true);
  }, [checkAccess, currentPath]);

  // Verificar acesso quando o path muda
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Listener para mudanças no cache multi-tab
  useEffect(() => {
    const removeListener = multiTabCache.addListener((key) => {
      if (key === 'navigation-state') {
        // Revalidar quando o estado de navegação muda em outra aba
        checkAccess(currentPath, false);
      }
    });

    return removeListener;
  }, [checkAccess, currentPath]);

  return {
    canAccess,
    isLoading,
    redirectTo,
    reason,
    checkAccess,
    invalidateCache
  };
};

export default useRouteProtection;