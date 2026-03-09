// Store layout
import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useStoreStore } from './useStoreStore';
import { useMobileMenuContext } from '@/components/mobile/MobileMenuProvider';
import { Button } from '@/components/ui/button';
import { Store, FileText, Wrench, Settings, LogOut, ExternalLink, ShoppingBag, Menu } from 'lucide-react';
import { UnifiedSpinner } from '@/components/ui/UnifiedSpinner';

export default function StoreLayout() {
  const { user, loading: authLoading } = useAuth();
  const { currentStore, fetchUserStore, isLoading: storeLoading } = useStoreStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user && !currentStore) {
      fetchUserStore(user.id);
    }
  }, [user, authLoading, currentStore, fetchUserStore, navigate]);

  // Redirect to create page if no store found after loading
  useEffect(() => {
    if (!storeLoading && !currentStore && user && location.pathname !== '/store/nova') {
      // Check if we really don't have a store or just failed to fetch
      // For now, assume if fetchUserStore finished and currentStore is null, we need to create one
      // But we need to be careful about the initial load state.
      // fetchUserStore sets isLoading to true immediately.
    }
  }, [storeLoading, currentStore, user, location.pathname, navigate]);

  if (authLoading || (storeLoading && !currentStore)) {
    return (
      <UnifiedSpinner fullScreen size="md" message="Carregando loja..." />
    );
  }

  // Special case for creation page
  if (location.pathname === '/store/nova') {
    return <Outlet />;
  }

  if (!currentStore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Store className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Nenhuma loja encontrada</h1>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Você ainda não possui uma loja configurada. Crie sua loja agora para começar a receber orçamentos online.
        </p>
        <Button onClick={() => navigate('/store/nova')}>
          Criar Minha Loja
        </Button>
      </div>
    );
  }

  const navItems = [
    { icon: FileText, label: 'Orçamentos', path: '/store/orcamentos' },
    { icon: ShoppingBag, label: 'Produtos', path: '/store/shop' },
    { icon: Wrench, label: 'Serviços & Técnicos', path: '/store/servicos' },
    { icon: Settings, label: 'Configurações', path: '/store/settings' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Sidebar (Desktop) - Glass effect */}
      <aside className="hidden md:flex w-64 bg-background/80 backdrop-blur-xl border-r border-border/30 flex-col h-screen sticky top-0">
        <div className="p-6 border-b border-border/30">
          <div className="flex items-center gap-2.5 font-bold text-xl text-primary">
            <div className="p-1.5 bg-primary/10 rounded-xl">
              <Store className="h-5 w-5" />
            </div>
            <span className="truncate">{currentStore.name}</span>
          </div>
          <a
            href={`/loja/${currentStore.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground flex items-center gap-1 mt-2.5 hover:text-primary transition-colors"
          >
            Ver loja online <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 rounded-xl h-11"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border/30">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-muted-foreground rounded-xl h-11"
            onClick={() => navigate('/dashboard')}
          >
            <LogOut className="h-4 w-4" />
            Voltar ao Sistema
          </Button>
        </div>
      </aside>

      {/* Mobile Header - iOS premium */}
      <header className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border/30 px-4 py-3 flex items-center justify-between">
        <div className="font-bold flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-xl">
            <Store className="h-4 w-4 text-primary" />
          </div>
          <span className="truncate max-w-[180px] text-sm">{currentStore.name}</span>
        </div>
        <a
          href={`/loja/${currentStore.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-xl font-medium"
        >
          Ver loja <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-full">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav - iOS tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-2xl border-t border-border/30 z-50 pb-[env(safe-area-inset-bottom)]">
        <nav className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Sair</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
