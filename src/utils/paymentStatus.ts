import { PaymentStatus } from '@/components/service-orders/PaymentStatusCard';

// Payment status type definitions
export type { PaymentStatus };

// Payment status validation
export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return ['pending', 'partial', 'completed', 'refunded', 'cancelled', 'overdue'].includes(status);
};

// Payment status normalization
export const normalizePaymentStatus = (status: string | null | undefined): PaymentStatus => {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().trim();
  
  // Handle common variations
  const statusMap: Record<string, PaymentStatus> = {
    'pending': 'pending',
    'aguardando': 'pending',
    'pendente': 'pending',
    'waiting': 'pending',
    
    'partial': 'partial',
    'parcial': 'partial',
    'partially_paid': 'partial',
    'part_paid': 'partial',
    
    'completed': 'completed',
    'paid': 'completed',
    'pago': 'completed',
    'complete': 'completed',
    'finalizado': 'completed',
    'quitado': 'completed',
    
    'refunded': 'refunded',
    'reembolsado': 'refunded',
    'estornado': 'refunded',
    'devolvido': 'refunded',
    
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    'cancelado': 'cancelled',
    'anulado': 'cancelled',
    
    'overdue': 'overdue',
    'vencido': 'overdue',
    'atrasado': 'overdue',
    'late': 'overdue'
  };
  
  return statusMap[normalized] || 'pending';
};

// Check if payment is overdue based on due date
export const checkPaymentOverdue = (
  dueDate: string | null | undefined,
  currentStatus: PaymentStatus
): PaymentStatus => {
  // Don't mark as overdue if already completed, refunded, or cancelled
  if (['completed', 'refunded', 'cancelled'].includes(currentStatus)) {
    return currentStatus;
  }
  
  if (!dueDate) return currentStatus;
  
  const due = new Date(dueDate);
  const now = new Date();
  
  // Set time to start of day for fair comparison
  due.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);
  
  return due < now ? 'overdue' : currentStatus;
};

// Calculate payment progress
export const calculatePaymentProgress = (
  paidAmount: number = 0,
  totalAmount: number = 0
): number => {
  if (totalAmount <= 0) return 0;
  return Math.min(Math.max((paidAmount / totalAmount) * 100, 0), 100);
};

// Determine payment status based on amounts
export const determinePaymentStatusFromAmounts = (
  paidAmount: number = 0,
  totalAmount: number = 0,
  dueDate?: string | null
): PaymentStatus => {
  if (totalAmount <= 0) return 'pending';
  
  let status: PaymentStatus;
  
  if (paidAmount <= 0) {
    status = 'pending';
  } else if (paidAmount >= totalAmount) {
    status = 'completed';
  } else {
    status = 'partial';
  }
  
  // Check for overdue
  return checkPaymentOverdue(dueDate, status);
};

// Format payment status for display
export const formatPaymentStatusLabel = (status: PaymentStatus): string => {
  const labels: Record<PaymentStatus, string> = {
    pending: 'Aguardando Pagamento',
    partial: 'Pagamento Parcial',
    completed: 'Pagamento Concluído',
    refunded: 'Reembolsado',
    cancelled: 'Cancelado',
    overdue: 'Vencido'
  };
  
  return labels[status] || 'Status Desconhecido';
};

// Get payment status color class
export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors: Record<PaymentStatus, string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    partial: 'text-orange-600 bg-orange-50 border-orange-200',
    completed: 'text-green-600 bg-green-50 border-green-200',
    refunded: 'text-blue-600 bg-blue-50 border-blue-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200',
    overdue: 'text-red-700 bg-red-100 border-red-300'
  };
  
  return colors[status] || colors.pending;
};

// Get payment status badge variant
export const getPaymentStatusBadgeVariant = (status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
  const variants: Record<PaymentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    partial: 'secondary',
    completed: 'default',
    refunded: 'outline',
    cancelled: 'destructive',
    overdue: 'destructive'
  };
  
  return variants[status] || 'secondary';
};

// Check if payment status allows modifications
export const canModifyPayment = (status: PaymentStatus): boolean => {
  return !['completed', 'refunded', 'cancelled'].includes(status);
};

// Check if payment is in a final state
export const isPaymentFinal = (status: PaymentStatus): boolean => {
  return ['completed', 'refunded', 'cancelled'].includes(status);
};

// Get next possible payment statuses
export const getNextPaymentStatuses = (currentStatus: PaymentStatus): PaymentStatus[] => {
  const transitions: Record<PaymentStatus, PaymentStatus[]> = {
    pending: ['partial', 'completed', 'cancelled'],
    partial: ['completed', 'refunded', 'cancelled'],
    completed: ['refunded'],
    refunded: [],
    cancelled: [],
    overdue: ['partial', 'completed', 'cancelled']
  };
  
  return transitions[currentStatus] || [];
};

// Validate payment amounts
export const validatePaymentAmounts = (
  paidAmount: number,
  totalAmount: number
): { isValid: boolean; error?: string } => {
  if (paidAmount < 0) {
    return { isValid: false, error: 'Valor pago não pode ser negativo' };
  }
  
  if (totalAmount <= 0) {
    return { isValid: false, error: 'Valor total deve ser maior que zero' };
  }
  
  if (paidAmount > totalAmount) {
    return { isValid: false, error: 'Valor pago não pode ser maior que o valor total' };
  }
  
  return { isValid: true };
};

// Format currency for display
export const formatPaymentCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Parse currency string to number
export const parsePaymentCurrency = (currencyString: string): number => {
  if (!currencyString) return 0;
  
  // Remove currency symbols and convert to number
  const cleaned = currencyString
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Calculate days until due date
export const getDaysUntilDue = (dueDate: string | null | undefined): number | null => {
  if (!dueDate) return null;
  
  const due = new Date(dueDate);
  const now = new Date();
  
  // Set time to start of day for fair comparison
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Get payment urgency level
export const getPaymentUrgency = (
  status: PaymentStatus,
  dueDate?: string | null
): 'low' | 'medium' | 'high' | 'critical' => {
  if (['completed', 'refunded', 'cancelled'].includes(status)) {
    return 'low';
  }
  
  if (status === 'overdue') {
    return 'critical';
  }
  
  const daysUntilDue = getDaysUntilDue(dueDate);
  
  if (daysUntilDue === null) return 'low';
  
  if (daysUntilDue <= 0) return 'critical';
  if (daysUntilDue <= 3) return 'high';
  if (daysUntilDue <= 7) return 'medium';
  
  return 'low';
};

// Generate payment status summary
export const generatePaymentSummary = (
  status: PaymentStatus,
  paidAmount: number = 0,
  totalAmount: number = 0,
  dueDate?: string | null
): string => {
  const progress = calculatePaymentProgress(paidAmount, totalAmount);
  const remainingAmount = totalAmount - paidAmount;
  const daysUntilDue = getDaysUntilDue(dueDate);
  
  switch (status) {
    case 'pending':
      if (daysUntilDue !== null && daysUntilDue <= 0) {
        return `Pagamento vencido há ${Math.abs(daysUntilDue)} dias`;
      }
      if (daysUntilDue !== null && daysUntilDue <= 7) {
        return `Vence em ${daysUntilDue} dias`;
      }
      return 'Aguardando pagamento';
      
    case 'partial':
      return `${Math.round(progress)}% pago - Restam ${formatPaymentCurrency(remainingAmount)}`;
      
    case 'completed':
      return 'Pagamento realizado com sucesso';
      
    case 'refunded':
      return 'Valor reembolsado';
      
    case 'cancelled':
      return 'Pagamento cancelado';
      
    case 'overdue':
      const overdueDays = daysUntilDue ? Math.abs(daysUntilDue) : 0;
      return `Vencido há ${overdueDays} dias`;
      
    default:
      return 'Status desconhecido';
  }
};