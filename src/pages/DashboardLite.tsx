import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { supabase } from '@/integrations/supabase/client';
import { AdaptiveLayout } from '@/components/adaptive/AdaptiveLayout';
import { DashboardLiteContent } from '@/components/lite/DashboardLiteContent';
import { DashboardLiteStatsEnhanced } from '@/components/lite/enhanced/DashboardLiteStatsEnhanced';
import { DashboardLiteQuickAccessEnhanced } from '@/components/lite/enhanced/DashboardLiteQuickAccessEnhanced';
import { DashboardLiteLicenseStatus } from '@/components/lite/DashboardLiteLicenseStatus';
import { DashboardLiteHelpSupport } from '@/components/lite/DashboardLiteHelpSupport';
import { useResponsive } from '@/hooks/useResponsive';
import { storageManager } from '@/utils/localStorageManager';

import { BudgetErrorBoundary, AuthErrorBoundary } from '@/components/ErrorBoundaries';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { useBudgetData } from '@/hooks/useBudgetData';
import { PageTransition } from '@/components/ui/animations/page-transitions';
import { IOSSpinner } from '@/components/ui/animations/loading-states';
import { UpdatePopup } from '@/components/UpdatePopup';

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    __ONESIGNAL_INIT__?: boolean;
  }
}

export const DashboardLite = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRestoringState, setIsRestoringState] = useState(true);
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  
  // Hook para carregar dados da empresa automaticamente
  const companyDataLoader = useCompanyDataLoader();
  
  // Hook para gerenciar dados dos orçamentos - sempre chamar
  const { budgets, loading, error, refreshing, handleRefresh } = useBudgetData(user?.id || '');
  
  // Memoização da verificação de iOS para evitar recálculos
  const isiOSDevice = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  }, []);

  useEffect(() => {
    const shouldInit = typeof Notification === 'undefined' || Notification.permission !== 'granted';
    if (!shouldInit) return;
    if (window.__ONESIGNAL_INIT__) return;
    window.__ONESIGNAL_INIT__ = true;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      await OneSignal.init({ appId: '0dc51c5c-74a5-4076-9b12-331c65cae23b' });
    });
  }, []);

  // Restaurar estado de navegação ao carregar
  useEffect(() => {
    if (!user?.id) return;

    const restoreNavigationState = () => {
      try {
        // Verificar se deve restaurar estado de edição
        if (storageManager.shouldRestoreEditingState()) {
          const navState = storageManager.getNavigationState();
          
          if (navState?.activeTab && navState?.editingItemId) {
            console.log('🔄 Restaurando estado de edição:', {
              tab: navState.activeTab,
              itemId: navState.editingItemId,
              itemType: navState.editingItemType
            });
            
            setActiveTab(navState.activeTab);
            
            // Limpar o estado após restaurar para evitar loops
            setTimeout(() => {
              storageManager.clearEditingState();
            }, 1000);
          }
        }
      } catch (error) {
        console.warn('Erro ao restaurar estado de navegação:', error);
      } finally {
        setIsRestoringState(false);
      }
    };

    // Aguardar um pouco para garantir que os dados estejam carregados
    const timer = setTimeout(restoreNavigationState, 500);
    
    return () => clearTimeout(timer);
  }, [user?.id]);

  // Salvar estado de navegação quando activeTab muda
  useEffect(() => {
    if (!user?.id || isRestoringState) return;

    // Salvar estado atual
    storageManager.setNavigationState({
      activeTab,
      lastActiveTab: activeTab !== 'dashboard' ? activeTab : undefined
    });
  }, [activeTab, user?.id, isRestoringState]);

  // Função para navegar e salvar estado de edição
  const handleNavigateToEdit = useCallback((view: string, itemId?: string, itemType?: 'budget' | 'service_order' | 'client') => {
    setActiveTab(view);
    
    if (itemId && itemType) {
      // Salvar estado de edição
      storageManager.setEditingState(itemId, itemType, view);
    }
  }, []);

  // Aguardar user, profile e dados da empresa estarem disponíveis
  const isReady = useMemo(() => {
    const basicReady = Boolean(user?.id && profile);
    // Não bloquear se os dados da empresa estão carregando, mas logar se há erro
    if (companyDataLoader.error) {
      console.warn('Erro ao carregar dados da empresa:', companyDataLoader.error);
    }
    return basicReady && !isRestoringState;
  }, [user?.id, profile, companyDataLoader.error, isRestoringState]);

  // Real-time subscription otimizada
  useEffect(() => {
    if (!isReady || !user?.id) return;

    // Subscription para atualizações em tempo real
    let subscription: any = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const setupSubscription = () => {
      subscription = supabase.channel('budget_changes_lite').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'budgets',
        filter: `owner_id=eq.${user.id}`
      }, payload => {
        console.log('Budget change detected:', payload);
        
        // Clear previous timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Debounce para evitar múltiplas chamadas
        debounceTimer = setTimeout(() => {
          handleRefresh();
          debounceTimer = null;
        }, 500);
      }).subscribe();
    };
    setupSubscription();
    
    return () => {
      // Clear debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Remove subscription properly
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [isReady, user?.id, handleRefresh]);

  // Detectar quando o usuário retorna ao app (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        // Usuário retornou ao app
        console.log('🔄 Usuário retornou ao app, verificando estado...');
        
        // Verificar se há estado de edição para restaurar
        if (storageManager.shouldRestoreEditingState()) {
          const navState = storageManager.getNavigationState();
          
          if (navState?.activeTab && navState?.editingItemId) {
            console.log('🔄 Restaurando estado após retorno:', navState);
            setActiveTab(navState.activeTab);
          }
        }
        
        // Atualizar dados
        handleRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, handleRefresh]);

  // Memoização do conteúdo principal para evitar re-renders desnecessários
  // IMPORTANTE: Este hook deve ser chamado ANTES de qualquer return condicional
  const dashboardContent = useMemo(() => (
    <PageTransition type="fadeScale">
      <div className={`${isDesktop ? 'desktop-dashboard-layout' : 'p-4 space-y-6'}`}>
        <div className={`${isDesktop ? 'desktop-dashboard-main' : ''}`}>
          <DashboardLiteStatsEnhanced profile={profile} userId={user?.id} />
          <DashboardLiteQuickAccessEnhanced onTabChange={setActiveTab} hasPermission={hasPermission} />
        </div>
        {isDesktop && (
          <div className="desktop-dashboard-sidebar">
            <DashboardLiteLicenseStatus profile={profile} />
            <DashboardLiteHelpSupport />
          </div>
        )}
        {!isDesktop && (
          <>
            <DashboardLiteLicenseStatus profile={profile} />
            <DashboardLiteHelpSupport />
          </>
        )}
      </div>
    </PageTransition>
  ), [profile, user?.id, hasPermission, isDesktop]);

  // Função para renderizar conteúdo - também deve ser definida antes do return condicional
  const renderContent = useCallback(() => {
    if (activeTab !== 'dashboard') {
      return (
        <PageTransition type="slideLeft" key={activeTab}>
          <DashboardLiteContent 
            budgets={budgets} 
            loading={loading} 
            error={error} 
            onRefresh={handleRefresh} 
            profile={profile} 
            activeView={activeTab} 
            userId={user.id} 
            hasPermission={hasPermission} 
            onNavigateBack={() => {
              setActiveTab('dashboard');
              storageManager.clearEditingState(); // Limpar estado ao voltar
            }} 
            onNavigateTo={handleNavigateToEdit}
            isiOSDevice={isiOSDevice} 
          />
        </PageTransition>
      );
    }
    return dashboardContent;
  }, [activeTab, budgets, loading, error, handleRefresh, profile, user.id, hasPermission, isiOSDevice, dashboardContent, handleNavigateToEdit]);

  // Otimização para iOS: não renderizar nada até dados estarem prontos
  // IMPORTANTE: Este return condicional deve vir APÓS todos os hooks
  if (!isReady) {
    return (
      <div 
        className="h-[100dvh] bg-background flex items-center justify-center" 
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none'
        }}
      >
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            {isRestoringState ? 'Comendo cookies...' : 
             companyDataLoader.isLoading ? 'Carregando dados da empresa...' : 'Carregando...'}
          </p>
          {companyDataLoader.error && (
            <p className="text-xs text-red-500 max-w-xs mx-auto">
              Aviso: {companyDataLoader.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthErrorBoundary>
      <BudgetErrorBoundary>
        <LayoutProvider>
          <AdaptiveLayout 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
          >
            {renderContent()}
            <UpdatePopup />
          </AdaptiveLayout>
        </LayoutProvider>
      </BudgetErrorBoundary>
    </AuthErrorBoundary>
  );
};
