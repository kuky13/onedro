import {
  Package, FileCheck, Wrench, Package2, CheckCircle, Truck, AlertCircle,
  Archive, Shield, Phone
} from 'lucide-react';

export const statusConfig = {
  opened: { label: 'Aberto', color: '#EF4444', icon: Package, description: 'Ordem de serviço criada e aguardando início do atendimento', step: 1 },
  pending_approval: { label: 'Aguardando Aprovação', color: '#6366F1', icon: FileCheck, description: 'Aguardando aprovação do cliente para prosseguir com o reparo', step: 1 },
  in_progress: { label: 'Reparo', color: '#F59E0B', icon: Wrench, description: 'Técnico trabalhando no reparo do equipamento', step: 2 },
  waiting_parts: { label: 'Aguardando Peças', color: '#8B5CF6', icon: Package, description: 'Aguardando chegada de peças para continuar o reparo', step: 2 },
  waiting_client: { label: 'Aguardando Cliente', color: '#F97316', icon: Phone, description: 'Aguardando contato ou decisão do cliente', step: 2 },
  under_warranty: { label: 'Em Garantia', color: '#10B981', icon: Shield, description: 'Equipamento em processo de garantia', step: 2 },
  ready_for_pickup: { label: 'Pronto para Retirada', color: '#06B6D4', icon: Package2, description: 'Reparo finalizado, equipamento pronto para retirada', step: 3 },
  completed: { label: 'Concluído', color: '#10B981', icon: CheckCircle, description: 'Reparo finalizado, equipamento pronto para retirada', step: 3 },
  delivered: { label: 'Entregue', color: '#fec832', icon: Truck, description: 'Equipamento entregue ao cliente', step: 4 },
  cancelled: { label: 'Cancelado', color: '#EF4444', icon: AlertCircle, description: 'Ordem de serviço cancelada', step: 0 },
  archived: { label: 'Arquivado', color: '#6B7280', icon: Archive, description: 'Ordem de serviço arquivada', step: 5 },
};

export function getStatusInfo(status: string) {
  return statusConfig[status as keyof typeof statusConfig] || {
    label: status, color: '#6B7280', icon: AlertCircle, description: 'Status desconhecido', step: 0,
  };
}

export function getPaymentStatusInfo(isPaid: boolean) {
  return isPaid
    ? { label: 'Pago', color: '#10B981', icon: CheckCircle, description: 'Pagamento confirmado' }
    : { label: 'Pendente', color: '#F59E0B', icon: AlertCircle, description: 'Aguardando pagamento' };
}

export function isFormattedId(token: string): boolean {
  return /^OS\d+$/i.test(token);
}
