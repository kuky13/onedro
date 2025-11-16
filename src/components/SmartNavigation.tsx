/**
 * Componente de navegação inteligente que previne loops de redirecionamento
 * Integra com o middleware de rotas e cache multi-tab
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routeMiddleware } from '@/middleware/routeMiddleware';
import { multiTabCache } from '@/services/multiTabCache';

interface SmartNavigationProps {
  children: React.ReactNode;
}

export const SmartNavigation = ({ children }: SmartNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Função para navegação segura que verifica proteção antes de navegar
  const safeNavigate = useCallback(async (to: string, options?: { replace?: boolean }) => {
    try {
      // Verificar se pode acessar a rota de destino
      const result = await routeMiddleware.canAccessRoute(to);
      
      if (result.canAccess) {
        // Pode navegar normalmente
        navigate(to, options);
      } else if (result.redirectTo) {
        // Precisa redirecionar para outra rota
        console.log(`🔄 Redirecionamento inteligente: ${to} → ${result.redirectTo}`);
        navigate(result.redirectTo, { replace: true });
      } else {
        // Não pode acessar e não há redirecionamento
        console.warn(`❌ Acesso negado para ${to}: ${result.reason}`);
        navigate('/unauthorized', { replace: true });
      }
    } catch (error) {
      console.error('❌ Erro na navegação inteligente:', error);
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Interceptar navegação do browser (back/forward)
  useEffect(() => {
    const handlePopState = async (event: PopStateEvent) => {
      const targetPath = window.location.pathname;
      
      try {
        const result = await routeMiddleware.canAccessRoute(targetPath);
        
        if (!result.canAccess && result.redirectTo) {
          // Prevenir a navegação e redirecionar
          event.preventDefault();
          window.history.pushState(null, '', result.redirectTo);
          navigate(result.redirectTo, { replace: true });
        }
      } catch (error) {
        console.error('❌ Erro ao interceptar navegação:', error);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // Listener para mudanças de estado em outras abas
  useEffect(() => {
    const removeListener = multiTabCache.addListener((key) => {
      if (key === 'auth-state' || key === 'license-state') {
        // Revalidar rota atual quando auth ou licença mudam
        routeMiddleware.canAccessRoute(location.pathname, true).then(result => {
          if (!result.canAccess && result.redirectTo) {
            console.log(`🔄 Redirecionamento por mudança de estado: ${result.redirectTo}`);
            navigate(result.redirectTo, { replace: true });
          }
        }).catch(error => {
          console.error('❌ Erro ao revalidar rota:', error);
        });
      }
    });

    return removeListener;
  }, [location.pathname, navigate]);

  // Disponibilizar função de navegação segura globalmente
  useEffect(() => {
    // Adicionar ao window para uso em outros componentes
    (window as any).safeNavigate = safeNavigate;
    
    return () => {
      delete (window as any).safeNavigate;
    };
  }, [safeNavigate]);

  return <>{children}</>;
};

export default SmartNavigation;

// Hook para usar navegação segura
export const useSmartNavigation = () => {
  const navigate = useNavigate();
  
  const safeNavigate = useCallback(async (to: string, options?: { replace?: boolean }) => {
    if ((window as any).safeNavigate) {
      return (window as any).safeNavigate(to, options);
    }
    
    // Fallback para navegação normal
    navigate(to, options);
  }, [navigate]);
  
  return { safeNavigate };
};