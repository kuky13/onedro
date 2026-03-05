import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Users, LogOut, Menu, X, Shield, Home, Film, Brain, Grid3X3, CreditCard, Ticket, MessageSquare, Key, ShieldCheck, Package, Bug, Server, Download } from 'lucide-react';
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
  name: 'Segurança',
  href: '/security',
  icon: ShieldCheck,
  description: 'Centro de segurança'
}, {
  name: 'Atualizações',
  href: '/update',
  icon: Package,
  description: 'Gerenciar updates'
}, {
  name: 'Problem',
  href: '/problem',
  icon: Bug,
  description: 'Diagnóstico (admin)'
}, {
  name: 'Usuários',
  href: '/supadmin/users',
  icon: Users,
  description: 'Gerenciar usuários do sistema'
}, {
  name: 'Planos',
  href: '/supadmin/plans',
  icon: CreditCard,
  description: 'Gerenciar planos e preços'
}, {
  name: 'Licenças',
  href: '/supadmin/licenca',
  icon: Key,
  description: 'Gerenciar licenças dos usuários'
}, {
  name: 'Cupons',
  href: '/supadmin/coupons',
  icon: Ticket,
  description: 'Gerenciar cupons de desconto'
}, {
  name: 'Drippy IA',
  href: '/supadmin/drippy',
  icon: Brain,
  description: 'Configurar inteligência artificial'
}, {
  name: 'Películas',
  href: '/supadmin/p',
  icon: Film,
  description: 'Gerenciar películas compatíveis'
}, {
  name: 'Apps',
  href: '/supadmin/apps',
  icon: Grid3X3,
  description: 'Hub de aplicativos do sistema'
}, {
  name: 'SMS & Mensagens',
  href: '/supadmin/sms',
  icon: MessageSquare,
  description: 'Gerenciar mensagens globais e comunicação'
}, {
  name: 'WhatsApp (Evolution)',
  href: '/supadmin/whatsapp',
  icon: MessageSquare,
  description: 'Configurar orçamentos via WhatsApp'
}, {
  name: 'VPS',
  href: '/supadmin/vps',
  icon: Server,
  description: 'Status da API externa'
}, {
  name: 'Download Vídeos',
  href: '/supadmin/dw',
  icon: Download,
  description: 'Baixar vídeos (yt-dlp)'
}];
export function SuperAdminLayout({
  children
}: SuperAdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/sign');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };
  const isCurrentPath = (href: string) => {
    if (href === '/supadmin') {
      return location.pathname === '/supadmin';
    }
    return location.pathname.startsWith(href);
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
    {/* Sidebar para desktop */}
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-card/50 backdrop-blur-sm border-r border-border/50">
        {/* Header do sidebar */}
        <div className="flex h-16 flex-shrink-0 items-center px-6 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Admin</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo</p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const current = isCurrentPath(item.href);
            return <Link key={item.name} to={item.href} className={cn('group relative overflow-hidden flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300', current ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-lg shadow-primary/10' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground hover:shadow-md')}>
              {current && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />}
              <Icon className={cn('mr-3 h-5 w-5 flex-shrink-0 relative z-10', current ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <div className="relative z-10">
                <div>{item.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
              </div>
            </Link>;
          })}
        </nav>

        {/* Footer do sidebar */}
        <div className="flex-shrink-0 border-t border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground hover:bg-background/60">
                <Home className="h-4 w-4" />
              </Button>

            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Sidebar mobile */}
    {sidebarOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-card/95 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 min-h-0 space-y-1 px-4 py-6 overflow-y-auto">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const current = isCurrentPath(item.href);
            return <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={cn('group relative overflow-hidden flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300', current ? 'bg-gradient-to-r from-primary/10 to-primary/5 text-primary border border-primary/20 shadow-lg shadow-primary/10' : 'text-muted-foreground hover:bg-background/60 hover:text-foreground hover:shadow-md')}>
              {current && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />}
              <Icon className={cn('mr-3 h-5 w-5 flex-shrink-0 relative z-10', current ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
              <div className="relative z-10">
                <div>{item.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
              </div>
            </Link>;
          })}
        </nav>

        <div className="flex-shrink-0 border-t border-border/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-muted-foreground">Administrador</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground hover:bg-background/60">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>}

    {/* Conteúdo principal */}
    <div className="lg:pl-72">
      {/* Header mobile */}
      <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 shadow-sm lg:hidden">
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Super Admin</h1>
        </div>
      </div>

      {/* Conteúdo da página */}
      <main className="py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  </div>;
}