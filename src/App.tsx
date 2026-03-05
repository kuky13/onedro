import { Toaster as Sonner } from "@/components/ui/sonner";
import { lazy, Suspense, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, Link } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ConsentimentoPage } from "./pages/ConsentimentoPage";
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
import HamsterPage from "./pages/HamsterPage";
import ServiceOrdersPageSimple from "./pages/ServiceOrdersPageSimple";
import { ServiceOrderFormPage } from "./pages/ServiceOrderFormPage";
import { ServiceOrderEditForm } from "./components/service-orders/ServiceOrderEditForm";
import { ServiceOrderTrash } from "./components/ServiceOrderTrash";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import { LicensePage } from "./pages/LicensePage";
import VerifyLicensePage from "./pages/VerifyLicensePage";
import { PWAProvider } from "./components/PWAProvider";
import { SessionPersistence } from "./components/SessionPersistence";
// Import estático (rotas críticas) para evitar falhas de fetch em import dinâmico
import WormPage from "./pages/WormPage";
import WormConfigPage from "./pages/WormConfigPage";
import WormPdfConfigPage from "./pages/WormPdfConfigPage";
import WormWhatsAppConfigPage from "./pages/WormWhatsAppConfigPage";
import DeviceTestPage from "./pages/DeviceTestPage";
const WormTrashPage = lazy(() =>
  import("./pages/WormTrashPage").then((m) => ({ default: m.WormTrashPage }))
);
const WormAIBudgetEditPage = lazyWithRetry(() => import("./pages/WormAIBudgetEditPage"));

const Sistema = lazyWithRetry(() => import("./pages/Sistema"));

// Import estático para evitar falhas de fetch em import dinâmico no preview
import { RepairsLayout } from "./pages/repairs/RepairsLayout";
// Páginas de reparos com import estático (evita falhas intermitentes de fetch em chunks dinâmicos)
import RepairsDashboard from "./pages/repairs/RepairsDashboard";
import RepairsServices from "./pages/repairs/RepairsServices";
import RepairsTechnicians from "./pages/repairs/RepairsTechnicians";
import RepairsStatus from "./pages/repairs/RepairsStatus";
import RepairsTrash from "./pages/repairs/RepairsTrash";
import RepairsWarranties from "./pages/repairs/RepairsWarranties";
import ServiceOrderSharePage from "./pages/ServiceOrderSharePage";
import HelpCenterPage from "./pages/HelpCenterPage";
import Security from "./pages/Security";
import SuportePage from "./pages/SuportePage";
import WarrantyPage from "./pages/WarrantyPage";
import { ServiceOrdersSettingsHub } from "./components/ServiceOrdersSettingsHub";
import NotificationsPage from "./pages/NotificationsPage";
import { DrippyPage } from "./pages/DrippyPage";
import ChatPage from "./pages/ChatPage";
import { ChatwootWidget } from "@/components/ChatwootWidget";
import { ChunkLoadRecoveryBanner } from "@/components/ChunkLoadRecoveryBanner";
import { useChunkLoadTelemetry } from "@/hooks/useChunkLoadTelemetry";

import { MobileMenuProvider } from "@/components/mobile/MobileMenuProvider";
import KukySolutions from "./pages/KukySolutions";
import { AdminGuard } from "./components/AdminGuard";
import UpdateManagementPage from "./pages/UpdateManagementPage";
import UpdateDetailsPage from "./pages/UpdateDetailsPage";
import { SuperAdminPage } from "./pages/SuperAdminPage";
import { AdminUsersPage } from "./pages/AdminUsersPage";
import { setSecureItem, getSecureItem } from "@/utils/secureStorage";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import PeliculasCompatibilityPage from "./pages/PeliculasCompatibilityPage";
import PeliculasEditPage from "./pages/PeliculasEditPage";
import AppsPage from "./pages/AppsPage";
import { DownloadVideoPage } from "./components/super-admin/DownloadVideoPage";
import { RootRedirect } from "./components/RootRedirect";
const StoreLayout = lazyWithRetry(() => import("./pages/store/StoreLayout"));
const StoreCreatePage = lazyWithRetry(() => import("./pages/store/StoreCreatePage"));
const StoreBudgets = lazyWithRetry(() => import("./pages/store/StoreBudgets"));
const StoreServices = lazyWithRetry(() => import("./pages/store/StoreServices"));
const StorePublicPage = lazyWithRetry(() => import("./pages/store/public/StorePublicPage"));
const StoreShop = lazyWithRetry(() => import("./pages/store/StoreShop"));
const StoreSettings = lazyWithRetry(() => import("./pages/store/StoreSettings"));
const IAPage = lazyWithRetry(() => import("./pages/IAPage"));

// Wrapper component para capturar o parâmetro id da URL e passar como serviceOrderId
const ServiceOrderEditWrapper = () => {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  // Nesta rota o parâmetro :id é obrigatório; o non-null assertion evita conflito com
  // exactOptionalPropertyTypes quando passamos a prop explicitamente.
  return <ServiceOrderEditForm serviceOrderId={id!} />;
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 30, // 30 minutos (mantém cache em memória por mais tempo)
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      retry: 1
    }
  }
});
const AppContent = () => {
  const {
    loading: authLoading
  } = useAuth();

  // Telemetria de falhas de chunk (tela branca) + banner de recuperação.
  useChunkLoadTelemetry();

  const location = useLocation();
  const legalPages = ['/terms', '/privacy', '/cookies', '/consentimento'];
  // Ocultar em rotas de loja pública (/loja/*) e testes de dispositivo (/testar/*)
  const isStorePublicPage = location.pathname.startsWith('/loja/');
  const isDeviceTestPage = location.pathname.startsWith('/testar/');
  const isDownloadsPage = location.pathname === '/downloads';
  const showInfoNote = !legalPages.includes(location.pathname) && !isStorePublicPage && !isDeviceTestPage && !isDownloadsPage;
  const [noteDismissed, setNoteDismissed] = useState(false);
  const [temporarilyHidden, setTemporarilyHidden] = useState(false);
  useEffect(() => {
    (async () => {
      const accepted = await getSecureItem('termsConsentAccepted');
      setNoteDismissed(Boolean(accepted));
    })();
  }, []);
  const handleAccept = async () => {
    setNoteDismissed(true);
    await setSecureItem('termsConsentAccepted', true, {
      encrypt: false
    });
  };
  const handleDecline = () => {
    setTemporarilyHidden(true);
  };

  // License verification removed - handled directly in components

  // Fluxo de aceite removido

  // Mostrar loading apenas enquanto carrega autenticação
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  // Fluxo de aceite removido

  return <>
    <ChunkLoadRecoveryBanner />
    <ReloadMonitor />
    <SessionPersistence />
    <Sonner position="top-right" expand={false} richColors closeButton duration={4000} visibleToasts={1} toastOptions={{
      style: {
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        border: '1px solid hsl(var(--border))'
      }
    }} />
    <IOSRedirectHandler />
    <ChatwootWidget />

    {/* Modal de aceite removido */}

    <SmartNavigation>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
          </div>
        }
      >
        <Routes>
        {/* Rotas do sistema de status Houston */}
        <Route path="/houston" element={<HoustonPage />} />
        <Route path="/problem" element={<AdminGuard>
          <ProblemPage />
        </AdminGuard>} />
        <Route path="/hamster" element={<HamsterPage />} />

        <Route
          path="/"
          element={
            <MaintenanceGuard>
              <RootRedirect />
            </MaintenanceGuard>
          }
        />
        <Route
          path="/landing"
          element={
            <MaintenanceGuard>
              <Index />
            </MaintenanceGuard>
          }
        />
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

        {/* Rota pública para download de vídeos */}
        <Route path="/downloads" element={<DownloadVideoPage />} />

        {/* Rota pública para testes de dispositivos via QR Code */}
        <Route path="/testar/:shareToken" element={<DeviceTestPage />} />

        <Route path="/reset-email" element={<UnifiedProtectionGuard>
          <ResetEmailPage />
        </UnifiedProtectionGuard>} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/sign" element={<SignPage />} />
        <Route path="/dashboard" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <DashboardLite />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/p" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <PeliculasCompatibilityPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/p/edit" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <PeliculasEditPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        {/* Redirect /painel to /dashboard */}
        <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
        <Route path="/service-orders" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <ServiceOrdersPageSimple />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/service-orders/new" element={<UnifiedProtectionGuard>
          <ServiceOrderFormPage />
        </UnifiedProtectionGuard>} />
        <Route path="/service-orders/:id/edit" element={<UnifiedProtectionGuard>
          <ServiceOrderEditWrapper />
        </UnifiedProtectionGuard>} />

        <Route path="/service-orders/settings" element={<UnifiedProtectionGuard>
          <Navigate to="/settings" replace />
        </UnifiedProtectionGuard>} />
        <Route path="/service-orders/trash" element={<UnifiedProtectionGuard>
          <ServiceOrderTrash />
        </UnifiedProtectionGuard>} />
        <Route path="/central-de-ajuda" element={<UnifiedProtectionGuard>
          <HelpCenterPage />
        </UnifiedProtectionGuard>} />
        <Route path="/settings" element={<UnifiedProtectionGuard>
          <ServiceOrdersSettingsHub />
        </UnifiedProtectionGuard>} />
        <Route path="/security" element={<AdminGuard>
          <Security />
        </AdminGuard>} />
        <Route path="/msg" element={<UnifiedProtectionGuard>
          <NotificationsPage />
        </UnifiedProtectionGuard>} />

        <Route path="/apps" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppsPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        {/* Rota administrativa para gerenciar atualizações */}
        <Route path="/update" element={<AdminGuard>
          <UpdateManagementPage />
        </AdminGuard>} />

        {/* Gestão administrativa de usuários */}
        <Route path="/admins/usuarios" element={<MaintenanceGuard>
          <AdminGuard>
            <AdminUsersPage />
          </AdminGuard>
        </MaintenanceGuard>} />

        {/* Rota do Super Administrador */}
        <Route path="/supadmin/*" element={<MaintenanceGuard>
          <AdminGuard>
            <SuperAdminPage />
          </AdminGuard>
        </MaintenanceGuard>} />

        {/* Seção exclusiva para orçamentos */}
        <Route path="/worm" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/edit/:id" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormAIBudgetEditPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/config" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormConfigPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/worm/config/whatsapp" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormWhatsAppConfigPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/worm/config/pdf" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormPdfConfigPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        {/* Gestão de Garantias */}
        <Route path="/garantia" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WarrantyPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />


        {/* Sistema operacional baseado em navegador */}
        <Route path="/sistema/*" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <Sistema />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/lixeira" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <WormTrashPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/game" element={<CookiePage />} />

        {/* Novas rotas para políticas e termos */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/consentimento" element={<ConsentimentoPage />} />
        <Route path="/concentimento" element={<Navigate to="/consentimento" replace />} />
        <Route path="/suporte" element={<SuportePage />} />
        <Route path="/drippy" element={<DrippyPage />} />
        <Route path="/ia" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <IAPage />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/chat" element={<MobileMenuProvider>
          <ChatPage />
        </MobileMenuProvider>} />
        <Route path="/kukysolutions" element={<KukySolutions />} />
        <Route path="/detalhes" element={<UnifiedProtectionGuard>
          <UpdateDetailsPage />
        </UnifiedProtectionGuard>} />

        <Route path="/reparos/*" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <RepairsLayout />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>}>
          <Route index element={<RepairsDashboard />} />
          <Route path="servicos" element={<RepairsServices />} />
          <Route path="editar/:id" element={<RepairsServices />} />
          <Route path="tecnicos" element={<RepairsTechnicians />} />
          <Route path="status" element={<RepairsStatus />} />
          <Route path="garantias" element={<RepairsWarranties />} />
          <Route path="lixeira" element={<RepairsTrash />} />
        </Route>

        {/* Sistema de Lojas Virtuais */}
        <Route path="/loja/:slug" element={<StorePublicPage />} />

        <Route path="/store" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <StoreLayout />
          </UnifiedProtectionGuard>
        </MaintenanceGuard>}>
          <Route path="nova" element={<StoreCreatePage />} />
          <Route path="shop" element={<StoreShop />} />
          <Route path="orcamentos" element={<StoreBudgets />} />
          <Route path="servicos" element={<StoreServices />} />
          <Route path="settings" element={<StoreSettings />} />
          <Route index element={<Navigate to="orcamentos" replace />} />
        </Route>

        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </SmartNavigation>
    {showInfoNote && !noteDismissed && !temporarilyHidden && <div className="fixed z-40 animate-fade-in max-w-sm bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4">
      <div className="rounded-xl bg-card/95 backdrop-blur-lg border border-border/50 shadow-lg p-3 md:p-4">
        <div className="flex items-start gap-2 md:gap-3">
          <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
              Ao usar nosso site, você concorda com nossos{' '}
              <Link to="/terms" className="text-primary hover:underline">
                Termos de Uso
              </Link>,{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>{' '}
              e{' '}
              <Link to="/cookies" className="text-primary hover:underline">
                Cookies
              </Link>
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3" onClick={handleAccept}>
                Aceitar
              </Button>
              <Button size="sm" variant="ghost" className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3" onClick={handleDecline}>
                Não, obrigado
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>}
    {location.pathname !== '/sistema'}
  </>;
};
const App = () => {
  console.log('🔄 App component iniciando...');
  return <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <ErrorBoundary>
          <BrowserRouter future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}>
            <AuthProvider>
              <PWAProvider>
                <AppContent />
              </PWAProvider>
            </AuthProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>;
};
export default App;