import React from 'react';
import { 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  DollarSign,
  Calendar,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Payment status types
export type PaymentStatus = 
  | 'pending' 
  | 'partial' 
  | 'completed' 
  | 'refunded' 
  | 'cancelled'
  | 'overdue';

// Payment status card props
interface PaymentStatusCardProps {
  status: PaymentStatus;
  totalAmount?: number;
  paidAmount?: number;
  dueDate?: string;
  lastPaymentDate?: string;
  showProgress?: boolean;
  compact?: boolean;
  className?: string;
  hideAmount?: boolean; // For customer view where amounts are hidden
}

// Payment status configuration
const paymentStatusConfig = {
  pending: {
    icon: Clock,
    label: 'Aguardando Pagamento',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    badgeVariant: 'secondary' as const,
    description: 'Pagamento ainda não foi realizado'
  },
  partial: {
    icon: CreditCard,
    label: 'Pagamento Parcial',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeVariant: 'secondary' as const,
    description: 'Pagamento parcial recebido'
  },
  completed: {
    icon: CheckCircle,
    label: 'Pagamento Concluído',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeVariant: 'default' as const,
    description: 'Pagamento realizado com sucesso'
  },
  refunded: {
    icon: RefreshCw,
    label: 'Reembolsado',
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeVariant: 'outline' as const,
    description: 'Valor foi reembolsado'
  },
  cancelled: {
    icon: AlertCircle,
    label: 'Cancelado',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeVariant: 'destructive' as const,
    description: 'Pagamento foi cancelado'
  },
  overdue: {
    icon: AlertCircle,
    label: 'Vencido',
    color: 'bg-red-600',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    badgeVariant: 'destructive' as const,
    description: 'Pagamento está em atraso'
  }
};

// Get payment status configuration
const getStatusConfig = (status: PaymentStatus) => {
  return paymentStatusConfig[status] || paymentStatusConfig.pending;
};

// Calculate payment progress percentage
const calculateProgress = (paidAmount: number = 0, totalAmount: number = 0) => {
  if (totalAmount === 0) return 0;
  return Math.min((paidAmount / totalAmount) * 100, 100);
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

// Check if payment is overdue
const isOverdue = (dueDate: string, status: PaymentStatus) => {
  if (status === 'completed' || status === 'refunded' || status === 'cancelled') {
    return false;
  }
  return new Date(dueDate) < new Date();
};

export function PaymentStatusCard({
  status,
  totalAmount = 0,
  paidAmount = 0,
  dueDate,
  lastPaymentDate,
  showProgress = true,
  compact = false,
  className,
  hideAmount = false
}: PaymentStatusCardProps) {
  // Determine actual status (check for overdue)
  const actualStatus = dueDate && isOverdue(dueDate, status) && status === 'pending' 
    ? 'overdue' 
    : status;
  
  const config = getStatusConfig(actualStatus);
  const Icon = config.icon;
  const progress = calculateProgress(paidAmount, totalAmount);
  const remainingAmount = totalAmount - paidAmount;

  return (
    <TooltipProvider>
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        config.borderColor,
        className
      )}>
        <CardHeader className={cn(
          'pb-3',
          compact && 'pb-2'
        )}>
          <CardTitle className={cn(
            'flex items-center gap-3',
            compact ? 'text-base' : 'text-lg'
          )}>
            <div className={cn(
              'flex items-center justify-center rounded-full text-white',
              compact ? 'w-8 h-8' : 'w-10 h-10',
              config.color
            )}>
              <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={config.textColor}>
                  {config.label}
                </span>
                <Badge variant={config.badgeVariant}>
                  {config.label}
                </Badge>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{config.description}</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>

        <CardContent className={cn(
          'space-y-4',
          compact && 'space-y-3'
        )}>
          {/* Payment amounts - only show if not hidden */}
          {!hideAmount && totalAmount > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Valor Total
                  </p>
                  <p className={cn(
                    'font-bold',
                    compact ? 'text-lg' : 'text-xl',
                    config.textColor
                  )}>
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                
                {paidAmount > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Valor Pago
                    </p>
                    <p className={cn(
                      'font-bold text-green-600',
                      compact ? 'text-lg' : 'text-xl'
                    )}>
                      {formatCurrency(paidAmount)}
                    </p>
                  </div>
                )}
              </div>

              {/* Remaining amount */}
              {remainingAmount > 0 && status !== 'completed' && (
                <div className={cn(
                  'p-3 rounded-lg',
                  config.bgColor
                )}>
                  <div className="flex items-center gap-2">
                    <DollarSign className={cn(
                      'w-4 h-4',
                      config.textColor
                    )} />
                    <span className="text-sm font-medium">
                      Valor Restante: {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment progress */}
              {showProgress && totalAmount > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progresso do Pagamento</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2"
                    style={{
                      '--progress-background': config.color.replace('bg-', '')
                    } as React.CSSProperties}
                  />
                </div>
              )}
            </div>
          )}

          {/* Payment dates */}
          <div className="space-y-2">
            {dueDate && status !== 'completed' && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Vencimento:</span>
                <span className={cn(
                  'font-medium',
                  actualStatus === 'overdue' ? 'text-red-600' : 'text-foreground'
                )}>
                  {formatDate(dueDate)}
                </span>
                {actualStatus === 'overdue' && (
                  <Badge variant="destructive" className="text-xs">
                    Vencido
                  </Badge>
                )}
              </div>
            )}

            {lastPaymentDate && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-muted-foreground">Último pagamento:</span>
                <span className="font-medium text-green-600">
                  {formatDate(lastPaymentDate)}
                </span>
              </div>
            )}
          </div>

          {/* Status-specific messages */}
          {actualStatus === 'overdue' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-red-700">Pagamento em Atraso</p>
                  <p className="text-red-600 mt-1">
                    Entre em contato para regularizar a situação.
                  </p>
                </div>
              </div>
            </div>
          )}

          {actualStatus === 'partial' && remainingAmount > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-700">Pagamento Parcial</p>
                  <p className="text-orange-600 mt-1">
                    Restam {formatCurrency(remainingAmount)} para quitar o valor total.
                  </p>
                </div>
              </div>
            </div>
          )}

          {actualStatus === 'completed' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Pagamento realizado com sucesso!
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default PaymentStatusCard;