import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Package, 
  Truck, 
  MessageSquare, 
  User, 
  Wrench, 
  CreditCard,
  Calendar,
  Eye,
  FileText,
  Settings,
  Archive,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types for service order events
export interface ServiceOrderEvent {
  id: string;
  service_order_id: string;
  event_type: string;
  payload?: any;
  customer_visible: boolean;
  customer_message?: string;
  notification_sent: boolean;
  created_at: string;
  created_by?: string;
}

// Enhanced timeline props
interface EnhancedTimelineProps {
  events: ServiceOrderEvent[];
  currentStatus: string;
  showCustomerView?: boolean;
  className?: string;
  compact?: boolean;
  maxEvents?: number;
}

// Event type configurations with icons, colors, and customer-friendly messages
const eventConfig = {
  // Status changes
  status_changed: {
    icon: RefreshCw,
    color: 'bg-blue-500',
    label: 'Status Alterado',
    customerLabel: 'Status Atualizado'
  },
  opened: {
    icon: Clock,
    color: 'bg-yellow-500',
    label: 'Ordem Aberta',
    customerLabel: 'Ordem de Serviço Criada'
  },
  in_progress: {
    icon: Play,
    color: 'bg-blue-500',
    label: 'Em Andamento',
    customerLabel: 'Serviço Iniciado'
  },
  completed: {
    icon: CheckCircle,
    color: 'bg-green-500',
    label: 'Concluído',
    customerLabel: 'Serviço Concluído'
  },
  delivered: {
    icon: Truck,
    color: 'bg-emerald-500',
    label: 'Entregue',
    customerLabel: 'Produto Entregue'
  },
  cancelled: {
    icon: AlertCircle,
    color: 'bg-red-500',
    label: 'Cancelado',
    customerLabel: 'Ordem Cancelada'
  },
  archived: {
    icon: Archive,
    color: 'bg-gray-500',
    label: 'Arquivado',
    customerLabel: 'Ordem Arquivada'
  },

  // Payment events
  payment_status_changed: {
    icon: CreditCard,
    color: 'bg-purple-500',
    label: 'Status de Pagamento Alterado',
    customerLabel: 'Pagamento Atualizado'
  },
  payment_pending: {
    icon: Clock,
    color: 'bg-yellow-500',
    label: 'Pagamento Pendente',
    customerLabel: 'Aguardando Pagamento'
  },
  payment_partial: {
    icon: CreditCard,
    color: 'bg-orange-500',
    label: 'Pagamento Parcial',
    customerLabel: 'Pagamento Parcial Recebido'
  },
  payment_completed: {
    icon: CheckCircle,
    color: 'bg-green-500',
    label: 'Pagamento Concluído',
    customerLabel: 'Pagamento Confirmado'
  },
  payment_refunded: {
    icon: RefreshCw,
    color: 'bg-blue-500',
    label: 'Pagamento Reembolsado',
    customerLabel: 'Reembolso Processado'
  },

  // Timeline events
  estimated_completion_set: {
    icon: Calendar,
    color: 'bg-indigo-500',
    label: 'Previsão de Conclusão Definida',
    customerLabel: 'Previsão de Entrega Atualizada'
  },
  actual_completion_set: {
    icon: CheckCircle,
    color: 'bg-green-500',
    label: 'Data de Conclusão Registrada',
    customerLabel: 'Serviço Finalizado'
  },
  delivery_date_changed: {
    icon: Truck,
    color: 'bg-blue-500',
    label: 'Data de Entrega Alterada',
    customerLabel: 'Nova Data de Entrega'
  },
  priority_changed: {
    icon: AlertCircle,
    color: 'bg-orange-500',
    label: 'Prioridade Alterada',
    customerLabel: 'Prioridade Atualizada'
  },

  // Notes and communication
  customer_notes_added: {
    icon: MessageSquare,
    color: 'bg-blue-500',
    label: 'Observações do Cliente Adicionadas',
    customerLabel: 'Suas Observações Foram Registradas'
  },
  technician_notes_added: {
    icon: Wrench,
    color: 'bg-gray-500',
    label: 'Observações do Técnico Adicionadas',
    customerLabel: 'Atualização do Técnico'
  },
  progress_update: {
    icon: RefreshCw,
    color: 'bg-blue-500',
    label: 'Atualização de Progresso',
    customerLabel: 'Progresso Atualizado'
  },

  // Customer interaction
  customer_viewed: {
    icon: Eye,
    color: 'bg-gray-400',
    label: 'Visualizado pelo Cliente',
    customerLabel: 'Você Visualizou Esta Ordem'
  },

  // Items and attachments
  item_added: {
    icon: Package,
    color: 'bg-green-500',
    label: 'Item Adicionado',
    customerLabel: 'Novo Item Adicionado'
  },
  item_updated: {
    icon: Settings,
    color: 'bg-blue-500',
    label: 'Item Atualizado',
    customerLabel: 'Item Modificado'
  },
  item_removed: {
    icon: AlertCircle,
    color: 'bg-red-500',
    label: 'Item Removido',
    customerLabel: 'Item Removido'
  },
  attachment_added: {
    icon: FileText,
    color: 'bg-indigo-500',
    label: 'Anexo Adicionado',
    customerLabel: 'Novo Documento Anexado'
  },

  // Default fallback
  default: {
    icon: Clock,
    color: 'bg-gray-500',
    label: 'Evento',
    customerLabel: 'Atualização'
  }
};

// Get event configuration
const getEventConfig = (eventType: string) => {
  return eventConfig[eventType as keyof typeof eventConfig] || eventConfig.default;
};

// Format event message for display
const formatEventMessage = (event: ServiceOrderEvent, showCustomerView: boolean) => {
  const config = getEventConfig(event.event_type);
  
  // Use customer message if available and in customer view
  if (showCustomerView && event.customer_message) {
    return event.customer_message;
  }
  
  // Use payload description if available
  if (event.payload?.description) {
    return event.payload.description;
  }
  
  // Use appropriate label based on view
  return showCustomerView ? config.customerLabel : config.label;
};

// Get relative time string
const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return `${diffInMinutes} min atrás`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h atrás`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  }
};

export function EnhancedTimeline({
  events,
  currentStatus,
  showCustomerView = false,
  className,
  compact = false,
  maxEvents
}: EnhancedTimelineProps) {
  // Ensure events is always an array
  const safeEvents = Array.isArray(events) ? events : [];
  
  // Filter events based on customer visibility
  const filteredEvents = showCustomerView 
    ? safeEvents.filter(event => event && event.customer_visible)
    : safeEvents;

  // Limit events if maxEvents is specified
  const displayEvents = maxEvents 
    ? filteredEvents.slice(0, maxEvents)
    : filteredEvents;

  // Sort events by creation date (newest first)
  const sortedEvents = [...displayEvents].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum evento encontrado.</p>
        <p className="text-sm">
          {showCustomerView 
            ? 'As atualizações aparecerão aqui conforme o serviço progride.'
            : 'Os eventos aparecerão aqui conforme a ordem progride.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {sortedEvents.map((event, index) => {
        const config = getEventConfig(event.event_type);
        const Icon = config.icon;
        const isLatest = index === 0;
        const message = formatEventMessage(event, showCustomerView);

        return (
          <TooltipProvider key={event.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className={cn(
                    'relative transition-all duration-200 hover:shadow-md cursor-pointer',
                    isLatest && 'ring-2 ring-primary/20 shadow-sm',
                    compact ? 'p-3' : 'p-4'
                  )}
                >
                  {/* Timeline connector line */}
                  {index < sortedEvents.length - 1 && !compact && (
                    <div className="absolute left-8 top-16 w-0.5 h-8 bg-border" />
                  )}

                  <CardContent className={cn('p-0', compact && 'space-y-2')}>
                    <div className="flex items-start gap-4">
                      {/* Event icon */}
                      <div 
                        className={cn(
                          'flex items-center justify-center rounded-full text-white flex-shrink-0 relative z-10',
                          compact ? 'w-8 h-8' : 'w-12 h-12',
                          config.color
                        )}
                      >
                        <Icon className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
                        {isLatest && (
                          <div className="absolute -inset-1 rounded-full bg-current opacity-20 animate-pulse" />
                        )}
                      </div>

                      {/* Event content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'font-medium',
                            compact ? 'text-sm' : 'text-base'
                          )}>
                            {message}
                          </span>
                          {isLatest && (
                            <Badge variant="secondary" className="text-xs">
                              Recente
                            </Badge>
                          )}
                          {event.notification_sent && showCustomerView && (
                            <Badge variant="outline" className="text-xs">
                              Notificado
                            </Badge>
                          )}
                        </div>

                        {/* Additional payload information */}
                        {event.payload && typeof event.payload === 'object' && Object.keys(event.payload).length > 0 && (
                          <div className="text-sm text-muted-foreground mb-2">
                            {event.payload.old_value && event.payload.new_value && (
                              <span>
                                De "{String(event.payload.old_value)}" para "{String(event.payload.new_value)}"
                              </span>
                            )}
                            {event.payload.amount && (
                              <span>Valor: R$ {String(event.payload.amount)}</span>
                            )}
                            {event.payload.date && (
                              <span>
                                Data: {format(new Date(event.payload.date), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {compact ? (
                              getRelativeTime(event.created_at)
                            ) : (
                              format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            )}
                          </div>
                          {event.created_by && !showCustomerView && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>por {event.created_by}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs">
                    {format(new Date(event.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                  {event.payload?.description && (
                    <p className="text-xs text-muted-foreground max-w-xs">
                      {event.payload.description}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {/* Show more indicator if events were limited */}
      {maxEvents && filteredEvents.length > maxEvents && (
        <div className="text-center py-2">
          <Badge variant="outline" className="text-xs">
            +{filteredEvents.length - maxEvents} eventos anteriores
          </Badge>
        </div>
      )}
    </div>
  );
}

export default EnhancedTimeline;