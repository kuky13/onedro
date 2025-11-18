import { Toaster as Sonner } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
// Aceite de termos desativado
import { ReloadMonitor } from "@/components/ReloadMonitor";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { SignUpPage } from "./pages/SignUpPage";
import { SignPage } from "./pages/SignPage";
import { PlansPage } from "./plans/PlansPage";
import { CheckoutPage } from "./plans/components/CheckoutPage";
import { PurchaseSuccessPage } from "./pages/PurchaseSuccessPage";

import { DashboardLite } from "./pages/DashboardLite";
import { CookiePage } from "./pages/CookiePage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { CookiesPage } from "./pages/CookiesPage";
import { IOSRedirectHandler } from "./components/IOSRedirectHandler";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import { UnifiedProtectionGuard } from "@/components/UnifiedProtectionGuard";
import { SmartNavigation } from "@/components/SmartNavigation";
import { MaintenanceGuard } from "@/components/MaintenanceGuard";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ResetEmailPage } from "./pages/ResetEmailPage";
import { VerifyPage } from "./pages/VerifyPage";
import { HoustonPage } from "./pages/HoustonPage";
import { ProblemPage } from "./pages/ProblemPage";
import ServiceOrdersPageSimple from "./pages/ServiceOrdersPageSimple";
import { ServiceOrderFormPage } from "./pages/ServiceOrderFormPage";
import { ServiceOrderEditForm } from "./components/service-orders/ServiceOrderEditForm";
import { ServiceOrderTrash } from "./components/ServiceOrderTrash";

import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { LicensePage } from "./pages/LicensePage";
import VerifyLicensePage from "./pages/VerifyLicensePage";
import { PWAProvider } from "./components/PWAProvider";
import WormPage from "./pages/WormPage";
import { WormTrashPage } from "./pages/WormTrashPage";
import Sistema from "./pages/Sistema";

import ServiceOrderSharePage from "./pages/ServiceOrderSharePage";
import HelpCenterPage from "./pages/HelpCenterPage";
import Security from "./pages/Security";
import SuportePage from "./pages/SuportePage";

import { ServiceOrdersSettingsHub } from "./components/ServiceOrdersSettingsHub";
import NotificationsPage from "./pages/NotificationsPage";
import { DrippyPage } from "./pages/DrippyPage";
import ChatPage from "./pages/ChatPage";
import { DrippyFloatingButton } from "./components/DrippyFloatingButton";
import RevolutionFloatingButton from "./components/RevolutionFloatingButton";
import KukySolutions from "./pages/KukySolutions";
import { AdminGuard } from "./components/AdminGuard";
import UpdateManagementPage from "./pages/UpdateManagementPage";
import UpdateDetailsPage from "./pages/UpdateDetailsPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { UserSettingsPage } from "./pages/UserSettingsPage";
import { setSecureItem, getSecureItem } from "@/utils/secureStorage";
import PeliculasCompatibilityPage from "./pages/PeliculasCompatibilityPage";

// Wrapper component para capturar o parâmetro id da URL e passar como serviceOrderId
const ServiceOrderEditWrapper = () => {
  const { id } = useParams<{ id: string }>();
  return <ServiceOrderEditForm serviceOrderId={id || ''} />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const legalPages = ['/terms', '/privacy', '/cookies'];
  const showInfoNote = !legalPages.includes(location.pathname);
  const [noteDismissed, setNoteDismissed] = useState(false);
  useEffect(() => {
    (async () => {
      const dismissed = await getSecureItem('legalInfoNoteDismissed');
      setNoteDismissed(Boolean(dismissed));
    })();
  }, []);
  const handleDismissNote = async () => {
    setNoteDismissed(true);
    await setSecureItem('legalInfoNoteDismissed', true, { encrypt: false });
  };
  
  // License verification removed - handled directly in components

  // Fluxo de aceite removido

  // Mostrar loading apenas enquanto carrega autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fluxo de aceite removido

  return (
    <>
      <ReloadMonitor />
      {/* <SecurityHeaders />
      <SecurityInitializer />
      <DevToolsWarning /> */}
      <Sonner
        position="top-right"
        expand={false}
        richColors
        closeButton
        duration={4000}
        visibleToasts={1}
        toastOptions={{
          style: {
            background: 'hsl(var(--background))',
            color: 'hsl(var(--foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
      <IOSRedirectHandler />
      
      {/* Modal de aceite removido */}
      
      <SmartNavigation>
        <Routes>
          {/* Rotas do sistema de status Houston - sempre acessíveis */}
          <Route path="/houston" element={<HoustonPage />} />
          <Route path="/problem" element={<ProblemPage />} />
          
          <Route path="/" element={
            <MaintenanceGuard>
              <Index />
            </MaintenanceGuard>
          } />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/licenca" element={<LicensePage />} />
        <Route path="/verify-licenca" element={<VerifyLicensePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/plans/m" element={<CheckoutPage planType="monthly" />} />
        <Route path="/plans/a" element={<CheckoutPage planType="yearly" />} />
        <Route path="/purchase-success" element={<PurchaseSuccessPage />} />

        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        
        {/* Rota pública para compartilhamento de OS */}
        <Route path="/share/service-order/:shareToken" element={<ServiceOrderSharePage />} />
        
        <Route
          path="/reset-email"
          element={
            <UnifiedProtectionGuard>
              <ResetEmailPage />
            </UnifiedProtectionGuard>
          }
        />
        <Route
          path="/signup"
          element={<SignUpPage />}
        />
        <Route
          path="/sign"
          element={<SignPage />}
        />
        <Route 
          path="/dashboard" 
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <DashboardLite />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          } 
        />
        <Route 
          path="/p" 
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <PeliculasCompatibilityPage />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          } 
        />
        {/* Redirect /painel to /dashboard */}
        <Route 
          path="/painel" 
          element={<Navigate to="/dashboard" replace />} 
        />
        <Route
          path="/service-orders"
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <ServiceOrdersPageSimple />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          }
        />
        <Route 
          path="/service-orders/new" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderFormPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/service-orders/:id/edit" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderEditWrapper />
            </UnifiedProtectionGuard>
          } 
        />

        <Route 
          path="/service-orders/settings" 
          element={
            <UnifiedProtectionGuard>
              <Navigate to="/settings" replace />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/service-orders/trash" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrderTrash />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/central-de-ajuda" 
          element={
            <UnifiedProtectionGuard>
              <HelpCenterPage />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <UnifiedProtectionGuard>
              <ServiceOrdersSettingsHub />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/security" 
          element={
            <UnifiedProtectionGuard>
              <Security />
            </UnifiedProtectionGuard>
          } 
        />
        <Route 
          path="/msg" 
          element={
            <UnifiedProtectionGuard>
              <NotificationsPage />
            </UnifiedProtectionGuard>
          } 
        />

        {/* Rota administrativa para gerenciar atualizações */}
        <Route 
          path="/update" 
          element={
            <AdminGuard>
              <UpdateManagementPage />
            </AdminGuard>
          } 
        />

        {/* Rota do Super Administrador */}
        <Route 
          path="/supadmin/*" 
          element={
            <MaintenanceGuard>
              <SuperAdminPage />
            </MaintenanceGuard>
          } 
        />

        {/* Seção exclusiva para orçamentos */}
        <Route 
          path="/worm" 
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <WormPage />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          } 
        />

        {/* Sistema operacional baseado em navegador */}
        <Route 
          path="/sistema" 
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <Sistema />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          } 
        />
        
        <Route 
          path="/worm/lixeira" 
          element={
            <MaintenanceGuard>
              <UnifiedProtectionGuard>
                <WormTrashPage />
              </UnifiedProtectionGuard>
            </MaintenanceGuard>
          } 
        />

        <Route path="/game" element={<CookiePage />} />
        
        {/* Novas rotas para políticas e termos */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/suporte" element={<SuportePage />} />
        <Route path="/drippy" element={<DrippyPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/kukysolutions" element={<KukySolutions />} />
        <Route 
          path="/detalhes" 
          element={
            <UnifiedProtectionGuard>
              <UpdateDetailsPage />
            </UnifiedProtectionGuard>
          } 
        />
        
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SmartNavigation>
      {showInfoNote && !noteDismissed && (
        <div className="fixed bottom-3 left-0 right-0 z-40">
          <div className="max-w-6xl mx-auto px-4">
            <div className="rounded-xl bg-muted/80 backdrop-blur-md border text-center shadow-sm p-2 pl-3 pr-2 text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span>Para mais detalhes, consulte </span>
              <Link to="/terms" className="underline hover:text-foreground">Termos de Uso</Link>
              <span> e </span>
              <Link to="/privacy" className="underline hover:text-foreground">Política de Privacidade</Link>
              <span>.</span>
              <button onClick={handleDismissNote} aria-label="Fechar" className="ml-3 rounded-md px-2 py-1 hover:bg-foreground/10">
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      {location.pathname !== '/sistema' && (
        <>
          <DrippyFloatingButton />
          <RevolutionFloatingButton />
        </>
      )}
    </>
  );
};

const App = () => {
  console.log('🔄 App component iniciando...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <ErrorBoundary>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <AuthProvider>
                <PWAProvider>
                  <AppContent />
                </PWAProvider>
              </AuthProvider>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
