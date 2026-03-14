import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { DataManagementLite } from './DataManagementLite';
import { SettingsLite } from './SettingsLite';
import { AdminLiteEnhanced } from './AdminLiteEnhanced';
import { ClientsLite } from './ClientsLite';
import { ServiceOrdersLite } from './ServiceOrdersLite';
import { ServiceOrderTrash } from '@/components/ServiceOrderTrash';
import { WhatsAppCrmLite } from '@/components/whatsapp-crm/WhatsAppCrmLite';

interface DashboardLiteContentProps {
  budgets: any[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  profile?: any;
  activeView?: string;
  selectedBudgetId?: string;
  userId?: string;
  hasPermission?: (permission: string) => boolean;
  onNavigateBack?: () => void;
  onNavigateTo?: (view: string, budgetId?: string) => void;
  isiOSDevice?: boolean;
}

export const DashboardLiteContent = ({ 
  profile,
  activeView = 'list',
  userId,
  hasPermission,
  onNavigateBack,
}: DashboardLiteContentProps) => {
  const handleWormRedirect = () => {
    window.location.href = '/worm';
  };

  // Para orçamentos, redirecionar para Worm
  if (activeView === 'budgets' || activeView === 'list' || activeView === 'budget-detail' || activeView === 'new-budget') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <h3 className="text-xl font-semibold">Orçamentos Migrados</h3>
          <p className="text-muted-foreground">
            Todas as funcionalidades de orçamentos foram movidas para a seção Orçamentos.
          </p>
          <Button onClick={handleWormRedirect} className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ir para Orçamentos
          </Button>
        </div>
      </div>
    );
  }

  // Switch para outras views
  switch (activeView) {
    case 'clients':
      return (
        <ClientsLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );

    case 'service-orders':
      return (
        <ServiceOrdersLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );

    case 'service-orders-trash':
      return (
        <div className="p-4">
          <ServiceOrderTrash />
        </div>
      );

    case 'data-management':
      return (
        <DataManagementLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );

    case 'settings':
      return (
        <SettingsLite
          mode="stack"
          userId={userId || ''}
          profile={profile}
          onBack={onNavigateBack || (() => {})}
        />
      );

    case 'whatsapp-crm':
      return <WhatsAppCrmLite />;

    case 'admin':
      if (!hasPermission?.('manage_users')) return null;
      return (
        <AdminLiteEnhanced
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );

    default:
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Seção não encontrada</p>
        </div>
      );
  }
};
