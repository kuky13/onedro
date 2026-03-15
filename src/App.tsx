import { Toaster as Sonner } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Suspense, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Shield } from "lucide-react";
import { TermsNotificationBanner } from "@/components/TermsNotificationBanner";
import { Button } from "@/components/ui/button";
import { ReloadMonitor } from "@/components/ReloadMonitor";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { queryClient } from "@/lib/queryClient";

// ── Imports estáticos: apenas o essencial para o shell ──
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";
import { PWAProvider } from "./components/PWAProvider";
import { ChunkLoadRecoveryBanner } from "@/components/ChunkLoadRecoveryBanner";

// ── Lazy imports: landing/auth pages (não precisam estar no bundle inicial) ──
const Index = lazyWithRetry(() => import("./pages/Index"));
const AuthPage = lazyWithRetry(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const SignUpPage = lazyWithRetry(() => import("./pages/SignUpPage").then(m => ({ default: m.SignUpPage })));
const SignPage = lazyWithRetry(() => import("./pages/SignPage").then(m => ({ default: m.SignPage })));
const PlansPage = lazyWithRetry(() => import("./plans/PlansPage").then(m => ({ default: m.PlansPage })));
const SmartNavigation = lazyWithRetry(() => import("@/components/SmartNavigation").then(m => ({ default: m.SmartNavigation })));
const VpsStatusBanner = lazyWithRetry(() => import("@/components/VpsStatusBanner"));
import { useChunkLoadTelemetry } from "@/hooks/useChunkLoadTelemetry";
import { setSecureItem, getSecureItem } from "@/utils/secureStorage";
import { RootRedirect } from "./components/RootRedirect";
import { useDynamicMetaTags } from "@/hooks/useDynamicMetaTags";

// ── Lazy imports: todas as páginas internas ──
const CheckoutPage = lazyWithRetry(() => import("./plans/components/CheckoutPage").then(m => ({ default: m.CheckoutPage })));
const PurchaseSuccessPage = lazyWithRetry(() => import("./pages/PurchaseSuccessPage").then(m => ({ default: m.PurchaseSuccessPage })));
const DashboardLite = lazyWithRetry(() => import("./pages/DashboardLite").then(m => ({ default: m.DashboardLite })));
const CookiePage = lazyWithRetry(() => import("./pages/CookiePage").then(m => ({ default: m.CookiePage })));
const PrivacyPage = lazyWithRetry(() => import("./pages/PrivacyPage").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage").then(m => ({ default: m.TermsPage })));
const CookiesPage = lazyWithRetry(() => import("./pages/CookiesPage").then(m => ({ default: m.CookiesPage })));
const ConsentimentoPage = lazyWithRetry(() => import("./pages/ConsentimentoPage").then(m => ({ default: m.ConsentimentoPage })));
const UnifiedProtectionGuard = lazyWithRetry(() => import("@/components/UnifiedProtectionGuard").then(m => ({ default: m.UnifiedProtectionGuard })));
const MaintenanceGuard = lazyWithRetry(() => import("@/components/MaintenanceGuard").then(m => ({ default: m.MaintenanceGuard })));
const ResetPasswordPage = lazyWithRetry(() => import("./pages/ResetPasswordPage").then(m => ({ default: m.ResetPasswordPage })));
const ResetEmailPage = lazyWithRetry(() => import("./pages/ResetEmailPage").then(m => ({ default: m.ResetEmailPage })));
const VerifyPage = lazyWithRetry(() => import("./pages/VerifyPage").then(m => ({ default: m.VerifyPage })));
const HoustonPage = lazyWithRetry(() => import("./pages/HoustonPage").then(m => ({ default: m.HoustonPage })));

const HamsterPage = lazyWithRetry(() => import("./pages/HamsterPage"));
const ServiceOrdersPageSimple = lazyWithRetry(() => import("./pages/ServiceOrdersPageSimple"));
const ServiceOrderFormPage = lazyWithRetry(() => import("./pages/ServiceOrderFormPage").then(m => ({ default: m.ServiceOrderFormPage })));
const ServiceOrderEditForm = lazyWithRetry(() => import("./components/service-orders/ServiceOrderEditForm").then(m => ({ default: m.ServiceOrderEditForm })));
const ServiceOrderTrash = lazyWithRetry(() => import("./components/ServiceOrderTrash").then(m => ({ default: m.ServiceOrderTrash })));
const UnauthorizedPage = lazyWithRetry(() => import("./pages/UnauthorizedPage").then(m => ({ default: m.UnauthorizedPage })));
const LicensePage = lazyWithRetry(() => import("./pages/LicensePage").then(m => ({ default: m.LicensePage })));
const VerifyLicensePage = lazyWithRetry(() => import("./pages/VerifyLicensePage"));
const SessionPersistence = lazyWithRetry(() => import("./components/SessionPersistence").then(m => ({ default: m.SessionPersistence })));
const WormPage = lazyWithRetry(() => import("./pages/WormPage"));
const WormConfigPage = lazyWithRetry(() => import("./pages/WormConfigPage"));
const WormPdfConfigPage = lazyWithRetry(() => import("./pages/WormPdfConfigPage"));
const WormWhatsAppConfigPage = lazyWithRetry(() => import("./pages/WormWhatsAppConfigPage"));
const DeviceTestPage = lazyWithRetry(() => import("./pages/DeviceTestPage"));
const WormTrashPage = lazyWithRetry(() => import("./pages/WormTrashPage").then(m => ({ default: m.WormTrashPage })));
const WormAIBudgetEditPage = lazyWithRetry(() => import("./pages/WormAIBudgetEditPage"));
const Sistema = lazyWithRetry(() => import("./pages/Sistema"));
const RepairsLayout = lazyWithRetry(() => import("./pages/repairs/RepairsLayout").then(m => ({ default: m.RepairsLayout })));
const RepairsDashboard = lazyWithRetry(() => import("./pages/repairs/RepairsDashboard"));
const RepairsServices = lazyWithRetry(() => import("./pages/repairs/RepairsServices"));
const RepairsTechnicians = lazyWithRetry(() => import("./pages/repairs/RepairsTechnicians"));
const RepairsStatus = lazyWithRetry(() => import("./pages/repairs/RepairsStatus"));
const RepairsTrash = lazyWithRetry(() => import("./pages/repairs/RepairsTrash"));
const RepairsWarranties = lazyWithRetry(() => import("./pages/repairs/RepairsWarranties"));
const ServiceOrderSharePage = lazyWithRetry(() => import("./pages/ServiceOrderSharePage"));
const HelpCenterPage = lazyWithRetry(() => import("./pages/HelpCenterPage"));

const SuportePage = lazyWithRetry(() => import("./pages/SuportePage"));
const WarrantyPage = lazyWithRetry(() => import("./pages/WarrantyPage"));
const TesteRapidoPage = lazyWithRetry(() => import("./pages/TesteRapidoPage"));
const SettingsLite = lazyWithRetry(() => import("./components/lite/SettingsLite").then(m => ({ default: m.SettingsLite })));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const DrippyPage = lazyWithRetry(() => import("./pages/DrippyPage").then(m => ({ default: m.DrippyPage })));
const ChatPage = lazyWithRetry(() => import("./pages/ChatPage"));
const ChatwootWidget = lazyWithRetry(() => import("@/components/ChatwootWidget").then(m => ({ default: m.ChatwootWidget })));
const AppShell = lazyWithRetry(() => import("@/components/layout/AppShell").then(m => ({ default: m.AppShell })));

const KukySolutions = lazyWithRetry(() => import("./pages/KukySolutions"));
const AdminGuard = lazyWithRetry(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const UpdateDetailsPage = lazyWithRetry(() => import("./pages/UpdateDetailsPage"));
const SuperAdminPage = lazyWithRetry(() => import("./pages/SuperAdminPage").then(m => ({ default: m.SuperAdminPage })));
const AdminUsersPage = lazyWithRetry(() => import("./pages/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const PeliculasCompatibilityPage = lazyWithRetry(() => import("./pages/PeliculasCompatibilityPage"));
const PeliculasEditPage = lazyWithRetry(() => import("./pages/PeliculasEditPage"));
const AppsPage = lazyWithRetry(() => import("./pages/AppsPage"));
const DownloadsPage = lazyWithRetry(() => import("./pages/DownloadsPage"));

const StoreLayout = lazyWithRetry(() => import("./pages/store/StoreLayout"));
const StoreCreatePage = lazyWithRetry(() => import("./pages/store/StoreCreatePage"));
const StoreBudgets = lazyWithRetry(() => import("./pages/store/StoreBudgets"));
const StoreServices = lazyWithRetry(() => import("./pages/store/StoreServices"));
const StorePublicPage = lazyWithRetry(() => import("./pages/store/public/StorePublicPage"));
const StoreShop = lazyWithRetry(() => import("./pages/store/StoreShop"));
const StoreSettings = lazyWithRetry(() => import("./pages/store/StoreSettings"));
const IAPage = lazyWithRetry(() => import("./pages/IAPage"));
const OrderStatusPage = lazyWithRetry(() => import("./pages/public/OrderStatusPage").then(m => ({ default: m.OrderStatusPage })));
const OnboardingPage = lazyWithRetry(() => import("./pages/OnboardingPage"));

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
const AppContent = () => {
  const {
    loading: authLoading
  } = useAuth();

  // Telemetria de falhas de chunk (tela branca) + banner de recuperação.
  useChunkLoadTelemetry();

  useDynamicMetaTags();

  const location = useLocation();
  const legalPages = ['/terms', '/privacy', '/cookies', '/consentimento'];
  const isLegalPage = legalPages.includes(location.pathname);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [termsDeclined, setTermsDeclined] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const accepted = await getSecureItem('termsConsentAccepted');
      const declined = await getSecureItem('termsConsentDeclined');
      setTermsAccepted(Boolean(accepted));
      setTermsDeclined(Boolean(declined));
    })();
  }, []);
  const handleAccept = async () => {
    setTermsAccepted(true);
    setTermsDeclined(false);
    sessionStorage.removeItem('termsDeclineReloadOnce');
    await setSecureItem('termsConsentAccepted', true, {
      encrypt: false
    });
    await setSecureItem('termsConsentDeclined', false, {
      encrypt: false
    });
  };
  const handleDecline = async () => {
    setTermsDeclined(true);
    await setSecureItem('termsConsentDeclined', true, {
      encrypt: false
    });
    sessionStorage.setItem('termsDeclineReloadOnce', '1');
    window.location.reload();
  };

  useEffect(() => {
    if (termsAccepted) return;
    if (!termsDeclined) return;
    if (isLegalPage) return;
    const key = 'termsDeclineReloadOnce';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    window.location.reload();
  }, [isLegalPage, termsAccepted, termsDeclined]);

  // License verification removed - handled directly in components

  // Fluxo de aceite removido

  const publicRoutePrefixes = [
    '/landing',
    '/auth',
    '/signup',
    '/sign',
    '/verify',
    '/reset-password',
    '/privacy',
    '/terms',
    '/cookies',
    '/consentimento',
    '/concentimento',
    '/share/',
    '/testar/',
    '/loja/',
    '/status/',
    '/docs',
    '/houston',
    '/hamster',
  ];

  const isPublicRoute = publicRoutePrefixes.some((prefix) => location.pathname === prefix || location.pathname.startsWith(prefix));

  // Terms notification banner (non-blocking)

  if (authLoading && !isPublicRoute) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-primary"></div>
    </div>;
  }

  // Fluxo de aceite removido

  return <>
    <Suspense fallback={null}><VpsStatusBanner /></Suspense>
    <ChunkLoadRecoveryBanner />
    <ReloadMonitor />
    <Suspense fallback={null}><SessionPersistence /></Suspense>
    <Sonner position="top-right" expand={false} richColors closeButton duration={4000} visibleToasts={1} toastOptions={{
      style: {
        background: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        border: '1px solid hsl(var(--border))'
      }
    }} />
    {/* IOSRedirectHandler removido — código morto */}
    <Suspense fallback={null}><ChatwootWidget /></Suspense>

    {/* Modal de aceite removido */}

    <Suspense fallback={null}>
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


        {/* Rota pública para testes de dispositivos via QR Code */}
        <Route path="/testar/:shareToken" element={<DeviceTestPage />} />

        <Route path="/reset-email" element={<UnifiedProtectionGuard>
          <ResetEmailPage />
        </UnifiedProtectionGuard>} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/onboarding" element={<UnifiedProtectionGuard>
          <OnboardingPage />
        </UnifiedProtectionGuard>} />
        <Route path="/sign" element={<SignPage />} />
        <Route path="/dashboard" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><DashboardLite /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/p" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><PeliculasCompatibilityPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/p/edit" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><PeliculasEditPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        {/* Redirect /painel to /dashboard */}
        <Route path="/painel" element={<Navigate to="/dashboard" replace />} />
        <Route path="/service-orders" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><ServiceOrdersPageSimple /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/service-orders/new" element={<UnifiedProtectionGuard>
          <AppShell><ServiceOrderFormPage /></AppShell>
        </UnifiedProtectionGuard>} />
        <Route path="/service-orders/:id/edit" element={<UnifiedProtectionGuard>
          <AppShell><ServiceOrderEditWrapper /></AppShell>
        </UnifiedProtectionGuard>} />

        <Route path="/service-orders/settings" element={<UnifiedProtectionGuard>
          <Navigate to="/settings" replace />
        </UnifiedProtectionGuard>} />
        <Route path="/service-orders/trash" element={<UnifiedProtectionGuard>
          <AppShell><ServiceOrderTrash /></AppShell>
        </UnifiedProtectionGuard>} />
        <Route path="/docs" element={<HelpCenterPage />} />
        <Route path="/settings/*" element={<UnifiedProtectionGuard>
          <AppShell><SettingsLite /></AppShell>
        </UnifiedProtectionGuard>} />
        <Route path="/msg" element={<UnifiedProtectionGuard>
          <AppShell><NotificationsPage /></AppShell>
        </UnifiedProtectionGuard>} />

        <Route path="/apps" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><AppsPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/downloads" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><DownloadsPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />


        {/* Gestão administrativa de usuários */}
        <Route path="/admins/usuarios" element={<MaintenanceGuard>
          <AdminGuard>
            <AppShell><AdminUsersPage /></AppShell>
          </AdminGuard>
        </MaintenanceGuard>} />

        {/* Rota do Super Administrador */}
        <Route path="/supadmin/*" element={<MaintenanceGuard>
          <AdminGuard>
            <AppShell><SuperAdminPage /></AppShell>
          </AdminGuard>
        </MaintenanceGuard>} />

        {/* Seção exclusiva para orçamentos */}
        <Route path="/worm" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/edit/:id" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormAIBudgetEditPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/config" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormConfigPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/worm/config/whatsapp" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormWhatsAppConfigPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/worm/config/pdf" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormPdfConfigPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        {/* Gestão de Garantias */}
        <Route path="/garantia" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WarrantyPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        {/* Teste Rápido */}
        <Route path="/teste-rapido" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><TesteRapidoPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />


        {/* Sistema operacional baseado em navegador */}
        <Route path="/sistema/*" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><Sistema /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/worm/lixeira" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><WormTrashPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />

        <Route path="/game" element={<CookiePage />} />

        {/* Novas rotas para políticas e termos */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/consentimento" element={<ConsentimentoPage />} />
        <Route path="/concentimento" element={<Navigate to="/consentimento" replace />} />
        <Route path="/suporte" element={<AppShell><SuportePage /></AppShell>} />
        <Route path="/drippy" element={<DrippyPage />} />
        <Route path="/ia" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><IAPage /></AppShell>
          </UnifiedProtectionGuard>
        </MaintenanceGuard>} />
        <Route path="/chat" element={<AppShell>
          <ChatPage />
        </AppShell>} />
        <Route path="/kukysolutions" element={<KukySolutions />} />
        <Route path="/detalhes" element={<UnifiedProtectionGuard>
          <AppShell><UpdateDetailsPage /></AppShell>
        </UnifiedProtectionGuard>} />

        <Route path="/reparos/*" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><RepairsLayout /></AppShell>
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
        
        {/* Rota pública de Status da OS (QR Code) */}
        <Route path="/status/:id" element={<OrderStatusPage />} />

        <Route path="/store" element={<MaintenanceGuard>
          <UnifiedProtectionGuard>
            <AppShell><StoreLayout /></AppShell>
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
    </Suspense>
    {!termsAccepted && isLegalPage && <div className="fixed z-40 animate-fade-in max-w-sm bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4">
      <div className="rounded-xl bg-card/95 backdrop-blur-lg border border-border/50 shadow-lg p-3 md:p-4">
        <div className="flex items-start gap-2 md:gap-3">
          <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-3">
              Para usar o site, é necessário aceitar os Termos.
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3" onClick={handleAccept}>
                Aceitar
              </Button>
              <Button size="sm" variant="outline" className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3" onClick={handleDecline}>
                Recusar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>}
    <SpeedInsights />
  </>;
};
const App = () => {
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
