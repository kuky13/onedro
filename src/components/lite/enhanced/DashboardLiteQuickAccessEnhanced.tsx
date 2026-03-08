import { useState } from 'react';
import { List, Settings, Shield, Users, Wrench, MoreHorizontal, Hammer, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PWAInstallModalSimple } from '@/components/ui/PWAInstallModalSimple';
import { usePWASimple } from '@/hooks/usePWASimple';

interface DashboardLiteQuickAccessEnhancedProps {
  onTabChange: (tab: string) => void;
  hasPermission: (permission: string) => boolean;
}

interface QuickAccessAction {
  id: string;
  label: string;
  icon: typeof List;
  tab: string;
  permission: string | null;
  colorClass: string;
  bgClass: string;
}

const quickAccessActions: QuickAccessAction[] = [
  { id: 'budgets', label: 'Orçamentos', icon: List, tab: 'budgets', permission: 'view_own_budgets', colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
  { id: 'service-orders', label: 'Ordens de Serviço', icon: Wrench, tab: 'service-orders', permission: null, colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
  { id: 'warranties', label: 'Garantias', icon: Shield, tab: 'warranties', permission: null, colorClass: 'text-teal-500', bgClass: 'bg-teal-500/10' },
  { id: 'clients', label: 'Clientes', icon: Users, tab: 'clients', permission: null, colorClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
  { id: 'reparos', label: 'Gestão de Reparos', icon: Hammer, tab: 'reparos', permission: null, colorClass: 'text-orange-500', bgClass: 'bg-orange-500/10' },
  { id: 'store', label: 'Minha Loja', icon: Store, tab: 'store', permission: null, colorClass: 'text-violet-500', bgClass: 'bg-violet-500/10' },
  { id: 'settings', label: 'Configurações', icon: Settings, tab: 'settings', permission: null, colorClass: 'text-muted-foreground', bgClass: 'bg-muted/30' },
  { id: 'more', label: 'Ver Mais', icon: MoreHorizontal, tab: 'more', permission: null, colorClass: 'text-muted-foreground', bgClass: 'bg-muted/30' },
];

export const DashboardLiteQuickAccessEnhanced = ({
  onTabChange,
  hasPermission,
}: DashboardLiteQuickAccessEnhancedProps) => {
  const navigate = useNavigate();
  const [showPWAModal, setShowPWAModal] = useState(false);
  const { isInstalling } = usePWASimple();

  const handleActionClick = (action: QuickAccessAction) => {
    if (action.id === 'download-app') { setShowPWAModal(true); return; }
    const routes: Record<string, string> = {
      'new-budget': '/worm', budgets: '/worm', 'service-orders': '/service-orders',
      warranties: '/garantia', reparos: '/reparos', store: '/store',
      peliculas: '/p', settings: '/settings', more: '/apps',
    };
    const route = routes[action.id];
    if (route) navigate(route);
    else onTabChange(action.tab);
  };

  const availableActions = quickAccessActions.filter(
    (a) => !a.permission || hasPermission(a.permission)
  );

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Acesso Rápido</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {availableActions.map((action, index) => {
            const Icon = action.icon;
            const isLoadingDownload = action.id === 'download-app' && isInstalling;
            const delayValue = index * 0.04;

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: delayValue }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleActionClick(action)}
                disabled={isLoadingDownload}
                className="flex flex-col items-center justify-center gap-3 h-28 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
              >
                <div className={`w-11 h-11 rounded-xl ${action.bgClass} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                  {isLoadingDownload ? (
                    <motion.div
                      className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <Icon className={`h-5 w-5 ${action.colorClass}`} />
                  )}
                </div>
                <span className="text-xs font-medium text-foreground text-center leading-tight px-1">
                  {isLoadingDownload ? 'Instalando...' : action.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <PWAInstallModalSimple open={showPWAModal} onOpenChange={setShowPWAModal} />
    </>
  );
};
