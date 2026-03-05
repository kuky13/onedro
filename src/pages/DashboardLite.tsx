import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
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
import { UpdatePopup } from '@/components/UpdatePopup';
import { MiniChatDrippy } from '@/components/mini-chat/MiniChatDrippy';
import { UnifiedSpinner } from '@/components/ui/UnifiedSpinner';

type DashboardLiteProps = {
  initialTab?: string;
};

export const DashboardLite = ({ initialTab }: DashboardLiteProps) => {
  const [activeTab, setActiveTab] = useState(initialTab ?? 'dashboard');
  const [isRestoringState, setIsRestoringState] = useState(true);
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  
  // Hook para carregar dados da empresa automaticamente
  const companyDataLoader = useCompanyDataLoader();
  
  // Hook para gerenciar dados dos orçamentos - sempre chamar
  const { budgets, loading, error, handleRefresh, invalidate: invalidateBudgets } = useBudgetData(user?.id || '');
  
  // Memoização da verificação de iOS para evitar recálculos
  const isiOSDevice = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
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

    // Salvar estado atual (não salvar campos com undefined por causa de exactOptionalPropertyTypes)
    storageManager.setNavigationState({
      activeTab,
      ...(activeTab !== 'dashboard' ? { lastActiveTab: activeTab } : {})
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

  // Real-time: já é tratado em useBudgetData via React Query invalidation.

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
        
         // Marcar budgets como desatualizados (evita refetch redundante)
         invalidateBudgets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, invalidateBudgets]);

  // Memoização do conteúdo principal para evitar re-renders desnecessários
  // IMPORTANTE: Este hook deve ser chamado ANTES de qualquer return condicional
  const dashboardContent = useMemo(() => (
    <PageTransition type="fadeScale">
        <div className={`${isDesktop ? 'desktop-dashboard-layout' : 'p-4 space-y-6'}`}>
          <div className={`${isDesktop ? 'desktop-dashboard-main' : ''}`}>
            <DashboardLiteStatsEnhanced profile={profile} />
            <DashboardLiteQuickAccessEnhanced onTabChange={setActiveTab} hasPermission={hasPermission} />
          </div>
          {isDesktop && (
            <div className="desktop-dashboard-sidebar">
              <DashboardLiteLicenseStatus />
              <DashboardLiteHelpSupport />
            </div>
          )}
        {!isDesktop && (
          <>
            <DashboardLiteLicenseStatus />
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
              userId={user?.id ?? ''} 
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
  }, [activeTab, budgets, loading, error, handleRefresh, profile, user?.id, hasPermission, isiOSDevice, dashboardContent, handleNavigateToEdit]);

  // Otimização para iOS: não renderizar nada até dados estarem prontos
  // IMPORTANTE: Este return condicional deve vir APÓS todos os hooks
  if (!isReady) {
    const loadingMessage = isRestoringState
      ? 'Comendo cookies...'
      : companyDataLoader.isLoading
      ? 'Carregando dados da empresa...'
      : 'Carregando...';

    return (
      <div
        className="min-h-[100dvh] bg-background flex items-center justify-center px-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none'
        }}
      >
        <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto">
          <UnifiedSpinner message={loadingMessage} className="w-full" />
          {companyDataLoader.error && (
            <p className="text-xs text-destructive text-center">
              Aviso: {companyDataLoader.error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!user) return null;

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
            <MiniChatDrippy />
          </AdaptiveLayout>
        </LayoutProvider>
      </BudgetErrorBoundary>
    </AuthErrorBoundary>
  );
};
