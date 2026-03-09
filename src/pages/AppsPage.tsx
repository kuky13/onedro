import { List, Settings, Shield, Users, Wrench, Smartphone, Hammer, Store, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard, RippleButton } from '@/components/ui/animations/micro-interactions';
import { StaggerContainer } from '@/components/ui/animations/page-transitions';
import { useAuth } from '@/hooks/useAuth';

interface QuickAccessAction {
  id: string;
  label: string;
  icon: any;
  path: string;
  permission: string | null;
  gradient: string;
  iconColor: string;
}

const quickAccessActions: QuickAccessAction[] = [{
  id: 'budgets',
  label: 'Orçamentos',
  icon: List,
  path: '/worm',
  permission: 'view_own_budgets',
  gradient: 'from-blue-500 to-cyan-500',
  iconColor: 'text-blue-600'
}, {
  id: 'service-orders',
  label: 'Ordens de Serviço',
  icon: Wrench,
  path: '/service-orders',
  permission: null,
  gradient: 'from-amber-500 to-yellow-500',
  iconColor: 'text-amber-600'
}, {
  id: 'warranties',
  label: 'Garantias',
  icon: Shield,
  path: '/garantia',
  permission: null,
  gradient: 'from-teal-500 to-cyan-500',
  iconColor: 'text-teal-600'
}, {
  id: 'teste-rapido',
  label: 'Teste Rápido',
  icon: Smartphone,
  path: '/teste-rapido',
  permission: null,
  gradient: 'from-cyan-500 to-teal-500',
  iconColor: 'text-cyan-600'
}, {
  id: 'clients',
  label: 'Clientes',
  icon: Users,
  path: '/dashboard', // Assumindo que clientes está no dashboard
  permission: null,
  gradient: 'from-purple-500 to-indigo-500',
  iconColor: 'text-purple-600'
}, {
  id: 'peliculas',
  label: 'Peliculas',
  icon: Smartphone,
  path: '/p',
  permission: null,
  gradient: 'from-pink-500 to-fuchsia-500',
  iconColor: 'text-pink-600'
}, {
  id: 'reparos',
  label: 'Gestão de Reparos',
  icon: Hammer,
  path: '/reparos',
  permission: null,
  gradient: 'from-orange-500 to-red-500',
  iconColor: 'text-orange-600'
}, {
  id: 'store',
  label: 'Minha Loja',
  icon: Store,
  path: '/store',
  permission: null,
  gradient: 'from-violet-500 to-purple-500',
  iconColor: 'text-violet-600'
}, {
  id: 'downloads',
  label: 'Download de Vídeos',
  icon: Download,
  path: '/downloads',
  permission: null,
  gradient: 'from-emerald-500 to-green-500',
  iconColor: 'text-emerald-600'
}, {
  id: 'settings',
  label: 'Configurações',
  icon: Settings,
  path: '/settings',
  permission: null,
  gradient: 'from-gray-500 to-slate-500',
  iconColor: 'text-gray-600'
}, {
  id: 'admin',
  label: 'Painel Admin',
  icon: Shield,
  path: '/supadmin',
  permission: 'manage_users',
  gradient: 'from-red-500 to-pink-500',
  iconColor: 'text-red-600'
}];

const AppsPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const availableActions = quickAccessActions.filter(action => 
    !action.permission || hasPermission(action.permission)
  );

  return (
    <div className="p-4 pt-16 md:pt-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold">Todos os Apps</h1>
      </div>

      <GlassCard className="p-6">
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableActions.map((action) => {
            const Icon = action.icon;
            
            return (
              <motion.div
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RippleButton
                  onClick={() => navigate(action.path)}
                  className="w-full h-32 bg-gradient-to-br from-background/50 to-background/20 border border-border/50 rounded-2xl hover:border-border/80 transition-all duration-300 relative overflow-hidden group"
                  variant="ghost"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
                    <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center group-hover:bg-muted/50 transition-colors">
                      <Icon className={`h-6 w-6 ${action.iconColor} group-hover:scale-110 transition-transform duration-200`} />
                    </div>
                    
                    <span className="text-sm font-medium text-center leading-tight text-foreground group-hover:text-foreground/90">
                      {action.label}
                    </span>
                  </div>
                  
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6 }}
                  />
                </RippleButton>
              </motion.div>
            );
          })}
        </StaggerContainer>
      </GlassCard>
    </div>
  );
};

export default AppsPage;
