import React from 'react';
import { Clock, CheckCircle, XCircle, DollarSign, Truck } from 'lucide-react';
export type BudgetWorkflowStatus = 'pending' | 'approved' | 'completed';
interface BudgetLiteStatusBadgeProps {
  status: BudgetWorkflowStatus;
  isPaid?: boolean;
  isDelivered?: boolean;
  expiresAt?: string | null;
}
export const BudgetLiteStatusBadge = ({
  status,
  isPaid = false,
  isDelivered = false,
  expiresAt
}: BudgetLiteStatusBadgeProps) => {
  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  if (isExpired && status === 'pending') {
    return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
        <XCircle className="h-3 w-3" />
        Vencido
      </span>;
  }
  switch (status) {
    case 'pending':
      if (expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        // Calcula dias restantes arredondando para cima
        const diffMs = expiry.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (daysRemaining > 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300">
              <Clock className="h-3.5 w-3.5" />
              {`Restam ${daysRemaining} dias`}
            </span>
          );
        }
      }
      return <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
          <Clock className="h-3 w-3" />
          Pendente
        </span>;
    case 'approved':
      if (!isPaid) {
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            <DollarSign className="h-3 w-3" />
            Aprovado
          </span>;
      }
      if (!isDelivered) {
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            <Truck className="h-3 w-3" />
            Pago
          </span>;
      }
      return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">
          <CheckCircle className="h-3 w-3" />
          Entregue
        </span>;
    case 'completed':
      return <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded">
          <CheckCircle className="h-3 w-3" />
          Concluído
        </span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
          <Clock className="h-3 w-3" />
          Pendente
        </span>;
  }
};