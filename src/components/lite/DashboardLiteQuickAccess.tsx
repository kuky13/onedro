import React from 'react';
import { PlusCircle, List, Settings, Shield, Database, Users } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useNavigate } from 'react-router-dom';

interface DashboardLiteQuickAccessProps {
  onTabChange: (tab: string) => void;
  hasPermission: (permission: string) => boolean;
}

interface QuickAccessButton {
  label: string;
  icon: typeof PlusCircle;
  tab: string;
  permission: string | null;
  iconColorClass: string;
}

const quickAccessButtons: QuickAccessButton[] = [
  { label: 'Novo Orçamento', icon: PlusCircle, tab: 'new-budget', permission: 'create_budgets', iconColorClass: 'text-green-500' },
  { label: 'Ver Orçamentos', icon: List, tab: 'budgets', permission: 'view_own_budgets', iconColorClass: 'text-blue-500' },
  { label: 'Clientes', icon: Users, tab: 'clients', permission: null, iconColorClass: 'text-indigo-500' },
  { label: 'Configurações', icon: Settings, tab: 'settings', permission: null, iconColorClass: 'text-gray-500' },
  { label: 'Painel Admin', icon: Shield, tab: 'admin', permission: 'manage_users', iconColorClass: 'text-red-500' },
];

export const DashboardLiteQuickAccess = ({ 
  onTabChange, 
  hasPermission 
}: DashboardLiteQuickAccessProps) => {
  const navigate = useNavigate();
  
  const handleButtonClick = (btn: QuickAccessButton) => {
    // Redirecionar para /worm para 'Novo Orçamento' e 'Ver Orçamentos'
    if (btn.tab === 'new-budget' || btn.tab === 'budgets') {
      navigate('/worm');
    } else if (btn.tab === 'settings') {
      navigate('/settings');
    } else {
      onTabChange(btn.tab);
    }
  };

  return (
    <div className="bg-card border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Acesso Rápido
        </h3>
        <PWAInstallButton />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {quickAccessButtons.map(btn => {
          if (btn.permission && !hasPermission(btn.permission)) {
            return null;
          }
          
          const Icon = btn.icon;
          
          return (
            <button
              key={btn.tab}
              onClick={() => handleButtonClick(btn)}
              className="flex flex-col items-center p-4 bg-background/50 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Icon className={`h-6 w-6 mb-2 ${btn.iconColorClass}`} />
              <span className="text-xs font-medium text-center">{btn.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};