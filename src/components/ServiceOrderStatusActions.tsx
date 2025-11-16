import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useContextualActions } from '@/hooks/useContextualActions';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  User, 
  Package, 
  RotateCcw, 
  XCircle,
  Loader2,
  DollarSign
} from 'lucide-react';

interface ServiceOrder {
  id: string;
  status: string;
  is_paid?: boolean;
  [key: string]: any;
}

interface ServiceOrderStatusActionsProps {
  serviceOrder: ServiceOrder;
  onStatusUpdate?: (newStatus: string) => Promise<void>;
  onPaymentUpdate?: () => Promise<void>;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'play-circle': Play,
  'check-circle': CheckCircle,
  'clock': Clock,
  'user-clock': User,
  'package': Package,
  'rotate-ccw': RotateCcw,
  'x-circle': XCircle,
};

export const ServiceOrderStatusActions: React.FC<ServiceOrderStatusActionsProps> = ({
  serviceOrder,
  onStatusUpdate,
  onPaymentUpdate
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const { showSuccess, showError } = useToast();
  
  const {
    getAvailableActions,
    executeAction,
    getStatusText
  } = useContextualActions();

  const availableActions = getAvailableActions(serviceOrder.status);

  // Função para atualizar status de pagamento
  const handlePaymentToggle = async () => {
    if (!serviceOrder.id) {
      showError({
        title: 'Erro',
        description: 'ID da ordem de serviço não encontrado'
      });
      return;
    }

    setLoadingPayment(true);
    
    try {
      const newPaidStatus = !serviceOrder.is_paid;
      
      const { error } = await supabase
        .from('service_orders')
        .update({ is_paid: newPaidStatus })
        .eq('id', serviceOrder.id);

      if (error) {
        throw error;
      }

      showSuccess({
        title: 'Status de pagamento atualizado',
        description: newPaidStatus ? 'Marcado como pago' : 'Marcado como pendente'
      });
      
      // Atualizar localmente se callback fornecido
      if (onPaymentUpdate) {
        await onPaymentUpdate();
      }
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      showError({
        title: 'Erro',
        description: 'Erro ao atualizar status de pagamento'
      });
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleActionClick = async (action: any) => {
    if (!serviceOrder.id) {
      showError({
        title: 'Erro',
        description: 'ID da ordem de serviço não encontrado'
      });
      return;
    }

    setLoadingAction(action.id);
    
    try {
      const success = await executeAction(serviceOrder.id, action);
      
      if (success) {
        showSuccess({
          title: 'Status atualizado',
          description: `Status atualizado para: ${getStatusText(action.nextStatus)}`
        });
        
        // Atualizar status localmente se callback fornecido
        if (onStatusUpdate) {
          await onStatusUpdate(action.nextStatus);
        }
      } else {
        showError({
          title: 'Erro',
          description: 'Erro ao atualizar status'
        });
      }
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      showError({
        title: 'Erro',
        description: 'Erro inesperado ao executar ação'
      });
    } finally {
      setLoadingAction(null);
    }
  };

  if (availableActions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhuma ação disponível para o status atual
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Botão de Status de Pagamento */}
      <Button
        size="sm"
        disabled={loadingPayment}
        onClick={handlePaymentToggle}
        className="flex items-center gap-2"
        variant={serviceOrder.is_paid ? 'default' : 'outline'}
        style={{
          backgroundColor: serviceOrder.is_paid ? '#10B981' : undefined,
          borderColor: serviceOrder.is_paid ? '#10B981' : '#F59E0B',
          color: serviceOrder.is_paid ? 'white' : '#F59E0B'
        }}
      >
        {loadingPayment ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <DollarSign className="h-4 w-4" />
        )}
        {serviceOrder.is_paid ? 'Pago' : 'Marcar como Pago'}
      </Button>

      {/* Ações de Status Existentes */}
      {availableActions.map((action) => {
        const Icon = iconMap[action.icon] || CheckCircle;
        const isLoading = loadingAction === action.id;
        
        return (
          <Button
            key={action.id}
            size="sm"
            disabled={isLoading}
            onClick={() => handleActionClick(action)}
            className="flex items-center gap-2"
            variant={action.color.includes('red') ? 'destructive' : 'default'}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ServiceOrderStatusActions;