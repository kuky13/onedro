import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard,
  Users,
  FileText,
  Calculator,
  Settings,
  Shield,
  MessageSquare,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  Brain,
  Film,
  HelpCircle,
  Store,
  Key,
  CreditCard,
  Lock,
  Bell,
  BarChart3,
  Gamepad2,
  Globe,
  Cookie,
  FileCheck,
  Trash2,
  Plus,
  Edit,
  Package,
  ClipboardList,
  UserCog,
  Cog,
  ArrowRight,
  Grid3X3,
  List,
  Ticket
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface AppRoute {
  path: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string | undefined }>;
  category: string;
  requiresAuth?: boolean;
  isAdmin?: boolean;
}

const appRoutes: AppRoute[] = [
  // Dashboard e Principal
  {
    path: '/',
    name: 'Página Inicial',
    description: 'Página principal do sistema',
    icon: LayoutDashboard,
    category: 'Principal'
  },
  {
    path: '/landing',
    name: 'Landing',
    description: 'Página de apresentação',
    icon: Globe,
    category: 'Principal'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    description: 'Painel principal do usuário',
    icon: LayoutDashboard,
    category: 'Principal',
    requiresAuth: true
  },
  {
    path: '/painel',
    name: 'Painel (redirect)',
    description: 'Redireciona para /dashboard',
    icon: ArrowRight,
    category: 'Principal'
  },
  {
    path: '/sistema',
    name: 'Sistema Operacional',
    description: 'Interface estilo desktop',
    icon: Grid3X3,
    category: 'Principal',
    requiresAuth: true
  },

  // Autenticação e Acesso ao Suporte
  {
    path: '/auth',
    name: 'Autenticação',
    description: 'Página de login',
    icon: Shield,
    category: 'Autenticação'
  },
  {
    path: '/sign',
    name: 'Entrar',
    description: 'Página de entrada',
    icon: Shield,
    category: 'Autenticação'
  },
  {
    path: '/signup',
    name: 'Cadastro',
    description: 'Criar nova conta',
    icon: UserCog,
    category: 'Autenticação'
  },
  {
    path: '/licenca',
    name: 'Acesso ao Suporte',
    description: 'Gerenciar acesso ao suporte',
    icon: Key,
    category: 'Autenticação',
    requiresAuth: true
  },
  {
    path: '/verify-licenca',
    name: 'Verificar Acesso ao Suporte',
    description: 'Verificar status do acesso ao suporte',
    icon: Key,
    category: 'Autenticação'
  },
  {
    path: '/plans',
    name: 'Planos',
    description: 'Ver planos disponíveis',
    icon: CreditCard,
    category: 'Autenticação'
  },
  {
    path: '/plans/m',
    name: 'Checkout Mensal',
    description: 'Checkout do plano mensal',
    icon: ShoppingCart,
    category: 'Autenticação'
  },
  {
    path: '/plans/a',
    name: 'Checkout Anual',
    description: 'Checkout do plano anual',
    icon: ShoppingCart,
    category: 'Autenticação'
  },
  {
    path: '/purchase-success',
    name: 'Compra Concluída',
    description: 'Confirmação de compra',
    icon: ShieldCheck,
    category: 'Autenticação'
  },
  {
    path: '/reset-password',
    name: 'Redefinir Senha',
    description: 'Recuperar senha',
    icon: Lock,
    category: 'Autenticação'
  },
  {
    path: '/verify',
    name: 'Verificar Email',
    description: 'Verificar conta',
    icon: ShieldCheck,
    category: 'Autenticação'
  },
  {
    path: '/reset-email',
    name: 'Redefinir Email',
    description: 'Alterar email da conta',
    icon: UserCog,
    category: 'Autenticação',
    requiresAuth: true
  },

  // Orçamentos (Worm)
  {
    path: '/worm',
    name: 'Orçamentos',
    description: 'Gerenciar orçamentos',
    icon: Calculator,
    category: 'Orçamentos',
    requiresAuth: true
  },
  {
    path: '/worm/edit/:id',
    name: 'Editar Orçamento (IA)',
    description: 'Edição de orçamento por IA',
    icon: Edit,
    category: 'Orçamentos',
    requiresAuth: true
  },
  {
    path: '/worm/config',
    name: 'Config. Orçamentos',
    description: 'Configurações do Worm',
    icon: Settings,
    category: 'Orçamentos',
    requiresAuth: true
  },
  {
    path: '/worm/config/whatsapp',
    name: 'Config. WhatsApp (Worm)',
    description: 'Configurar envio via WhatsApp',
    icon: MessageSquare,
    category: 'Orçamentos',
    requiresAuth: true
  },
  {
    path: '/worm/config/pdf',
    name: 'Config. PDF (Worm)',
    description: 'Configurar modelo de PDF',
    icon: FileCheck,
    category: 'Orçamentos',
    requiresAuth: true
  },
  {
    path: '/worm/lixeira',
    name: 'Lixeira de Orçamentos',
    description: 'Orçamentos excluídos',
    icon: Trash2,
    category: 'Orçamentos',
    requiresAuth: true
  },

  // Ordens de Serviço
  {
    path: '/service-orders',
    name: 'Ordens de Serviço',
    description: 'Lista de ordens de serviço',
    icon: FileText,
    category: 'Ordens de Serviço',
    requiresAuth: true
  },
  {
    path: '/service-orders/new',
    name: 'Nova Ordem',
    description: 'Criar nova ordem de serviço',
    icon: Plus,
    category: 'Ordens de Serviço',
    requiresAuth: true
  },
  {
    path: '/service-orders/:id/edit',
    name: 'Editar Ordem (ID)',
    description: 'Editar ordem de serviço existente',
    icon: Edit,
    category: 'Ordens de Serviço',
    requiresAuth: true
  },
  {
    path: '/share/service-order/:shareToken',
    name: 'Compartilhamento de OS',
    description: 'Página pública de OS por token',
    icon: Globe,
    category: 'Ordens de Serviço'
  },
  {
    path: '/service-orders/settings',
    name: 'Config. OS (redirect)',
    description: 'Redireciona para /settings',
    icon: ArrowRight,
    category: 'Ordens de Serviço',
    requiresAuth: true
  },
  {
    path: '/service-orders/trash',
    name: 'Lixeira de OS',
    description: 'Ordens de serviço excluídas',
    icon: Trash2,
    category: 'Ordens de Serviço',
    requiresAuth: true
  },

  // Configurações
  {
    path: '/settings',
    name: 'Configurações',
    description: 'Configurações do sistema',
    icon: Settings,
    category: 'Configurações',
    requiresAuth: true
  },
  {
    path: '/security',
    name: 'Segurança',
    description: 'Configurações de segurança',
    icon: ShieldCheck,
    category: 'Configurações',
    requiresAuth: true
  },
  {
    path: '/update',
    name: 'Atualizações',
    description: 'Gerenciar atualizações',
    icon: Package,
    category: 'Configurações',
    isAdmin: true
  },
  {
    path: '/detalhes',
    name: 'Detalhes de Atualização',
    description: 'Detalhes das atualizações',
    icon: FileCheck,
    category: 'Configurações',
    requiresAuth: true
  },

  // Super Admin
  {
    path: '/supadmin',
    name: 'Super Admin',
    description: 'Painel de super administrador',
    icon: Shield,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/users',
    name: 'Gerenciar Usuários',
    description: 'Gerenciar todos os usuários',
    icon: Users,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/drippy',
    name: 'Drippy IA',
    description: 'Configurar inteligência artificial',
    icon: Brain,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/p',
    name: 'Películas',
    description: 'Gerenciar películas compatíveis',
    icon: Film,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/plans',
    name: 'Planos (Super Admin)',
    description: 'Gerenciar planos e preços',
    icon: CreditCard,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/licenca',
    name: 'Acessos ao Suporte (Super Admin)',
    description: 'Gerenciar acessos ao suporte dos usuários',
    icon: Key,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/coupons',
    name: 'Cupons (Super Admin)',
    description: 'Gerenciar cupons de desconto',
    icon: Ticket,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/sms',
    name: 'SMS & Mensagens (Super Admin)',
    description: 'Comunicação global do sistema',
    icon: MessageSquare,
    category: 'Super Admin',
    isAdmin: true
  },
  {
    path: '/supadmin/whatsapp',
    name: 'WhatsApp (Evolution)',
    description: 'Configurar orçamentos via WhatsApp',
    icon: MessageSquare,
    category: 'Super Admin',
    isAdmin: true
  },

  // Películas
  {
    path: '/p',
    name: 'Películas',
    description: 'Ver películas compatíveis',
    icon: Film,
    category: 'Películas',
    requiresAuth: true
  },
  {
    path: '/p/edit',
    name: 'Editar Películas',
    description: 'Editar compatibilidade',
    icon: Edit,
    category: 'Películas',
    requiresAuth: true
  },

  // Comunicação
  {
    path: '/chat',
    name: 'Chat',
    description: 'Conversas e mensagens',
    icon: MessageSquare,
    category: 'Comunicação',
    requiresAuth: true
  },
  {
    path: '/msg',
    name: 'Mensagens',
    description: 'Central de notificações',
    icon: Bell,
    category: 'Comunicação',
    requiresAuth: true
  },
  {
    path: '/drippy',
    name: 'Drippy',
    description: 'Assistente de IA',
    icon: Brain,
    category: 'Comunicação',
    requiresAuth: true
  },
  {
    path: '/suporte',
    name: 'Suporte',
    description: 'Central de suporte',
    icon: HelpCircle,
    category: 'Comunicação'
  },
  {
    path: '/docs',
    name: 'Documentação',
    description: 'Documentação e ajuda',
    icon: HelpCircle,
    category: 'Comunicação',
    requiresAuth: true
  },

  // Loja Virtual
  {
    path: '/store',
    name: 'Minha Loja',
    description: 'Gerenciar loja virtual',
    icon: Store,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/store/nova',
    name: 'Nova Loja',
    description: 'Criar nova loja',
    icon: Plus,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/store/orcamentos',
    name: 'Orçamentos da Loja',
    description: 'Orçamentos recebidos',
    icon: ClipboardList,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/store/servicos',
    name: 'Serviços da Loja',
    description: 'Gerenciar serviços',
    icon: Package,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/store/shop',
    name: 'Loja',
    description: 'Visualizar loja',
    icon: ShoppingCart,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/store/settings',
    name: 'Configurações da Loja',
    description: 'Configurar loja',
    icon: Cog,
    category: 'Loja Virtual',
    requiresAuth: true
  },
  {
    path: '/loja/:slug',
    name: 'Loja Pública (slug)',
    description: 'Página pública da loja por slug',
    icon: Store,
    category: 'Loja Virtual'
  },

  // Reparos
  {
    path: '/reparos',
    name: 'Reparos',
    description: 'Dashboard de reparos',
    icon: Wrench,
    category: 'Reparos',
    requiresAuth: true
  },
  {
    path: '/reparos/servicos',
    name: 'Serviços de Reparo',
    description: 'Gerenciar serviços',
    icon: Wrench,
    category: 'Reparos',
    requiresAuth: true
  },
  {
    path: '/reparos/tecnicos',
    name: 'Técnicos',
    description: 'Gerenciar técnicos',
    icon: UserCog,
    category: 'Reparos',
    requiresAuth: true
  },
  {
    path: '/reparos/status',
    name: 'Status de Reparos',
    description: 'Acompanhar status',
    icon: BarChart3,
    category: 'Reparos',
    requiresAuth: true
  },
  {
    path: '/reparos/lixeira',
    name: 'Lixeira de Reparos',
    description: 'Itens removidos do módulo reparos',
    icon: Trash2,
    category: 'Reparos',
    requiresAuth: true
  },
  {
    path: '/reparos/editar/:id',
    name: 'Editar Reparo (ID)',
    description: 'Edição de serviço de reparo',
    icon: Edit,
    category: 'Reparos',
    requiresAuth: true
  },

  // Garantias
  {
    path: '/garantia',
    name: 'Garantias',
    description: 'Gerenciar garantias',
    icon: ShieldCheck,
    category: 'Garantias',
    requiresAuth: true
  },
  {
    path: '/garantia/test',
    name: 'Teste de Garantias',
    description: 'Testar sistema de garantias',
    icon: Gamepad2,
    category: 'Garantias',
    requiresAuth: true
  },

  // Legal e Informações
  {
    path: '/terms',
    name: 'Termos de Uso',
    description: 'Termos e condições',
    icon: FileCheck,
    category: 'Legal'
  },
  {
    path: '/privacy',
    name: 'Política de Privacidade',
    description: 'Privacidade e dados',
    icon: Lock,
    category: 'Legal'
  },
  {
    path: '/cookies',
    name: 'Política de Cookies',
    description: 'Uso de cookies',
    icon: Cookie,
    category: 'Legal'
  },
  {
    path: '/consentimento',
    name: 'Consentimento',
    description: 'Consentimento e termos',
    icon: FileCheck,
    category: 'Legal'
  },
  {
    path: '/concentimento',
    name: 'Consentimento (redirect)',
    description: 'Redireciona para /consentimento',
    icon: ArrowRight,
    category: 'Legal'
  },

  // Outros
  {
    path: '/apps',
    name: 'Apps',
    description: 'Central de aplicativos',
    icon: Grid3X3,
    category: 'Outros',
    requiresAuth: true
  },
  {
    path: '/admins/usuarios',
    name: 'Admin Usuários',
    description: 'Gestão administrativa de usuários',
    icon: Users,
    category: 'Outros',
    isAdmin: true
  },
  {
    path: '/houston',
    name: 'Houston',
    description: 'Status do sistema',
    icon: ShieldCheck,
    category: 'Outros'
  },
  {
    path: '/problem',
    name: 'Problem',
    description: 'Página de diagnóstico',
    icon: ShieldCheck,
    category: 'Outros'
  },
  {
    path: '/hamster',
    name: 'Hamster',
    description: 'Página de diagnóstico',
    icon: ShieldCheck,
    category: 'Outros'
  },
  {
    path: '/kukysolutions',
    name: 'Kuky Solutions',
    description: 'Sobre a empresa',
    icon: Globe,
    category: 'Outros'
  },
  {
    path: '/game',
    name: 'Jogo',
    description: 'Jogo interativo',
    icon: Gamepad2,
    category: 'Outros'
  },
  {
    path: '/unauthorized',
    name: 'Não Autorizado',
    description: 'Acesso negado',
    icon: Shield,
    category: 'Outros'
  }
];

const categories = [
  'Principal',
  'Autenticação',
  'Orçamentos',
  'Ordens de Serviço',
  'Configurações',
  'Super Admin',
  'Películas',
  'Comunicação',
  'Loja Virtual',
  'Reparos',
  'Garantias',
  'Legal',
  'Outros'
];

export function AppsHub() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  const filteredRoutes = appRoutes.filter(route => {
    const matchesSearch = 
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.path.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || route.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const groupedRoutes = categories.reduce((acc, category) => {
    const routes = filteredRoutes.filter(r => r.category === category);
    if (routes.length > 0) {
      acc[category] = routes;
    }
    return acc;
  }, {} as Record<string, AppRoute[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Hub de Aplicativos
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Acesse rapidamente todas as páginas e funcionalidades do sistema
          </p>
        </div>
      </motion.div>

      {/* Filtros e Busca */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, descrição ou caminho..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background/60 backdrop-blur-sm border-border/50"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 text-sm"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge 
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory('all')}
          >
            Todas ({appRoutes.length})
          </Badge>
          {categories.map(category => {
            const count = appRoutes.filter(r => r.category === category).length;
            return (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category} ({count})
              </Badge>
            );
          })}
        </div>
      </motion.div>

      {/* Lista de Apps */}
      <div className="space-y-8">
        {Object.keys(groupedRoutes).length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center"
          >
            <p className="text-muted-foreground">Nenhum aplicativo encontrado com os filtros aplicados.</p>
          </motion.div>
        ) : (
          Object.entries(groupedRoutes).map(([category, routes]) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
                <span className="w-1 h-8 bg-gradient-to-b from-primary to-primary/50 rounded-full" />
                {category}
              </h2>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {routes.map((route, index) => {
                    const Icon = route.icon;
                    return (
                      <motion.div
                        key={route.path}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card 
                          className="group cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:border-primary/50"
                          onClick={() => handleNavigate(route.path)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              {route.requiresAuth && (
                                <Badge variant="outline" className="text-xs">Auth</Badge>
                              )}
                              {route.isAdmin && (
                                <Badge variant="destructive" className="text-xs">Admin</Badge>
                              )}
                            </div>
                            <CardTitle className="mt-4 group-hover:text-primary transition-colors">
                              {route.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">
                              {route.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                                {route.path}
                              </code>
                              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {routes.map((route, index) => {
                    const Icon = route.icon;
                    return (
                      <motion.div
                        key={route.path}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card 
                          className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-primary/50"
                          onClick={() => handleNavigate(route.path)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                                    {route.name}
                                  </h3>
                                  {route.requiresAuth && (
                                    <Badge variant="outline" className="text-xs">Auth</Badge>
                                  )}
                                  {route.isAdmin && (
                                    <Badge variant="destructive" className="text-xs">Admin</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {route.description}
                                </p>
                                <code className="text-xs text-muted-foreground mt-1">
                                  {route.path}
                                </code>
                              </div>
                              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Estatísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{appRoutes.length}</div>
            <div className="text-sm text-muted-foreground">Total de Apps</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categorias</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {appRoutes.filter(r => r.requiresAuth).length}
            </div>
            <div className="text-sm text-muted-foreground">Requerem Auth</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {appRoutes.filter(r => r.isAdmin).length}
            </div>
            <div className="text-sm text-muted-foreground">Apenas Admin</div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

