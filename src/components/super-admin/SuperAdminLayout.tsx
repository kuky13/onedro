import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Users, Menu, X, Shield, Home, Film, Brain, Grid3X3, CreditCard, Ticket, MessageSquare, Key, Package, Bug, Server, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [{
  name: 'Dashboard',
  href: '/supadmin',
  icon: LayoutDashboard,
  description: 'Visão geral do sistema'
}, {
  name: 'Atualizações',
  href: '/supadmin/update',
  icon: Package,
  description: 'Gerenciar updates'
}, {
  name: 'Problem',
  href: '/supadmin/problem',
  icon: Bug,
  description: 'Diagnóstico (admin)'
}, {
  name: 'Usuários',
  href: '/supadmin/users',
  icon: Users,
  description: 'Gerenciar usuários'
}, {
  name: 'Planos',
  href: '/supadmin/plans',
  icon: CreditCard,
  description: 'Planos e preços'
}, {
  name: 'Licenças',
  href: '/supadmin/licenca',
  icon: Key,
  description: 'Licenças dos usuários'
}, {
  name: 'Cupons',
  href: '/supadmin/coupons',
  icon: Ticket,
  description: 'Cupons de desconto'
}, {
  name: 'Drippy IA',
  href: '/supadmin/drippy',
  icon: Brain,
  description: 'Inteligência artificial'
}, {
  name: 'Películas',
  href: '/supadmin/p',
  icon: Film,
  description: 'Películas compatíveis'
}, {
  name: 'Apps',
  href: '/supadmin/apps',
  icon: Grid3X3,
  description: 'Hub de aplicativos'
}, {
  name: 'SMS & Mensagens',
  href: '/supadmin/sms',
  icon: MessageSquare,
  description: 'Mensagens globais'
}, {
  name: 'WhatsApp',
  href: '/supadmin/whatsapp',
  icon: MessageSquare,
  description: 'Orçamentos via WhatsApp'
}, {
  name: 'VPS',
  href: '/supadmin/vps',
  icon: Server,
  description: 'Status da API'
}];

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/sign');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const isCurrentPath = (href: string) => {
    if (href === '/supadmin') return location.pathname === '/supadmin';
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-border/50 bg-card/80 backdrop-blur-sm">
          {/* Header */}
          <div className="flex h-14 items-center px-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">Super Admin</h1>
                <p className="text-[10px] text-muted-foreground">Painel Administrativo</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
            {navigationItems.map(item => {
              const Icon = item.icon;
              const current = isCurrentPath(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200',
                    current
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
                    current ? 'bg-primary/10' : 'bg-muted/50'
                  )}>
                    <Icon className={cn('h-3.5 w-3.5', current ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-border/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => navigate('/dashboard')}>
                <Home className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-[280px] flex-col bg-card border-r border-border/50">
            {/* Mobile Header */}
            <div className="flex h-14 items-center justify-between px-4 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h1 className="text-sm font-semibold">Super Admin</h1>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Nav */}
            <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
              {navigationItems.map(item => {
                const Icon = item.icon;
                const current = isCurrentPath(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-200',
                      current
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                      current ? 'bg-primary/10' : 'bg-muted/50'
                    )}>
                      <Icon className={cn('h-4 w-4', current ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="border-t border-border/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground truncate">{user?.email}</p>
                    <p className="text-[10px] text-muted-foreground">Administrador</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-card/80 backdrop-blur-sm px-4 lg:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">Super Admin</span>
          </div>
        </div>

        {/* Page Content */}
        <main className="py-4 lg:py-6">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
