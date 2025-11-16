// @ts-nocheck
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trash2, RotateCcw, AlertTriangle, Calendar, Clock, Timer, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrashStatsCard } from './TrashStatsCard';

interface DeletedServiceOrder {
  id: string;
  sequential_number?: number; // ADICIONADO
  owner_id: string;
  client_id: string | null;
  device_type: string;
  device_model: string;
  imei_serial: string | null;
  reported_issue: string;
  status: string;
  priority: string;
  total_price: number;
  labor_cost: number;
  parts_cost: number;
  is_paid: boolean;
  delivery_date: string | null;
  warranty_months: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  deleted_by: string;
}

const ServiceOrderTrash: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Função para extrair apenas o nome do dispositivo, removendo o UUID
  const extractDeviceName = (deviceModel: string | null | undefined): string => {
    if (!deviceModel) return 'Dispositivo não especificado';
    
    const inputStr = String(deviceModel).trim();
    
    // Abordagem simples: se contém o UUID específico, remove ele
    const specificUUID = '52257281-667b-43c8-9873-75f9f7258b08';
    if (inputStr.includes(specificUUID)) {
      const result = inputStr.replace(specificUUID, '').trim();
      return result;
    }
    
    // Abordagem 1: Split por espaço e pegar a partir do segundo elemento
    const parts = inputStr.split(' ');
    
    if (parts.length > 1) {
      // Verifica se o primeiro elemento parece ser um UUID
      const firstPart = parts[0];
      
      // UUID padrão: 8-4-4-4-12 caracteres
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(firstPart);
      
      if (isUUID) {
        const result = parts.slice(1).join(' ').trim();
        return result || 'Dispositivo não especificado';
      }
    }
    
    // Abordagem 2: Se não encontrou UUID com espaço, tenta detectar UUID grudado
    const uuidPattern = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(.+)$/;
    const match = inputStr.match(uuidPattern);
    
    if (match) {
      const result = match[2].trim();
      return result;
    }
    
    // Abordagem 3: Remove qualquer sequência de 32+ caracteres hexadecimais no início
    const hexPattern = /^[0-9a-fA-F-]{32,}\s*/;
    if (hexPattern.test(inputStr)) {
      const result = inputStr.replace(hexPattern, '').trim();
      return result;
    }
    
    return inputStr;
  };

  // Função para calcular dias restantes até exclusão automática
  const getDaysUntilAutoDelete = (deletedAt: string): number => {
    const deletedDate = new Date(deletedAt);
    const autoDeleteDate = new Date(deletedDate.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 dias
    const now = new Date();
    const diffTime = autoDeleteDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Função para obter cor do indicador baseado nos dias restantes
  const getTimeRemainingColor = (daysRemaining: number): string => {
    if (daysRemaining <= 3) return 'bg-red-100 text-red-800 border-red-200';
    if (daysRemaining <= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Componente para exibir tempo restante
  const TimeRemainingIndicator: React.FC<{ deletedAt: string }> = ({ deletedAt }) => {
    const daysRemaining = getDaysUntilAutoDelete(deletedAt);
    const colorClass = getTimeRemainingColor(daysRemaining);
    
    if (daysRemaining === 0) {
      return (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium bg-red-100 text-red-800 border-red-200`}>
          <Timer className="h-3 w-3" />
          Será excluída hoje
        </div>
      );
    }
    
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium ${colorClass}`}>
        <Clock className="h-3 w-3" />
        {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
      </div>
    );
  };

  // Fetch deleted service orders
  const { data: deletedOrders, isLoading, error, refetch } = useQuery({
    queryKey: ['deletedServiceOrders'],
    queryFn: async (): Promise<DeletedServiceOrder[]> => {
      const { data, error } = await supabase.rpc('get_deleted_service_orders');
      if (error) throw error;
      return data || [];
    },
  });

  // Estado para controlar o loading do refresh
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Função para atualizar a lista
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Lista atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar a lista');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Restore service order mutation
  const restoreOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('restore_service_order', {
        p_id: orderId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedServiceOrders'] });
      queryClient.invalidateQueries({ queryKey: ['serviceOrders'] });
      toast.success('Ordem de serviço restaurada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao restaurar ordem de serviço: ${error.message}`);
    },
  });

  // Hard delete service order mutation
  const hardDeleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc('hard_delete_service_order', {
        service_order_id: orderId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletedServiceOrders'] });
      toast.success('Ordem de serviço excluída permanentemente!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir permanentemente: ${error.message}`);
    },
  });

  // Empty trash mutation
  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('empty_service_orders_trash');
      if (error) throw error;
      return data;
    },
    onSuccess: (deletedCount: number) => {
      queryClient.invalidateQueries({ queryKey: ['deletedServiceOrders'] });
      toast.success(`${deletedCount} ordens de serviço excluídas permanentemente!`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao esvaziar lixeira: ${error.message}`);
    },
  });

  const handleRestore = (orderId: string) => {
    restoreOrderMutation.mutate(orderId);
  };

  const handleHardDelete = (orderId: string) => {
    hardDeleteOrderMutation.mutate(orderId);
  };

  const handleEmptyTrash = () => {
    emptyTrashMutation.mutate();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta':
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'média':
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'baixa':
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pendente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'aberta':
      case 'opened':
        return 'bg-blue-100 text-blue-800';
      case 'em andamento':
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'concluída':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'entregue':
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'cancelada':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // FUNÇÕES DE TRADUÇÃO ADICIONADAS
  const translateStatus = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendente',
      'opened': 'Aberta',
      'in_progress': 'Em Andamento',
      'completed': 'Concluída',
      'delivered': 'Entregue',
      'cancelled': 'Cancelada'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  const translatePriority = (priority: string): string => {
    const priorityMap: { [key: string]: string } = {
      'low': 'Baixa',
      'medium': 'Média',
      'high': 'Alta'
    };
    return priorityMap[priority?.toLowerCase()] || priority;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando lixeira...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Erro ao carregar lixeira: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/service-orders')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              title="Atualizar lista"
              className="h-10 w-10"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lixeira</h1>
            <p className="text-muted-foreground">
              Ordens de serviço excluídas ({deletedOrders?.length || 0})
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Ordens são excluídas automaticamente após 30 dias
            </p>
          </div>
        </div>
        {deletedOrders && deletedOrders.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Esvaziar Lixeira
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Esvaziar Lixeira
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá excluir permanentemente todas as {deletedOrders.length} ordens de serviço da lixeira.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEmptyTrash}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={emptyTrashMutation.isPending}
                >
                  {emptyTrashMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Estatísticas da lixeira */}
      <TrashStatsCard />

      {!deletedOrders || deletedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Lixeira vazia</h3>
            <p className="text-muted-foreground text-center">
              Não há ordens de serviço excluídas no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deletedOrders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {order.sequential_number ? `OS: ${order.sequential_number.toString().padStart(4, '0')}` : `OS: ${order.id.slice(0, 8)}`}
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Excluída {formatDistanceToNow(new Date(order.deleted_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </div>
                      <TimeRemainingIndicator deletedAt={order.deleted_at} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getPriorityColor(order.priority)}>
                      {translatePriority(order.priority)}
                    </Badge>
                    <Badge className={getStatusColor(order.status)}>
                      {translateStatus(order.status)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div>
                       <span className="font-medium">Dispositivo:</span>
                       <span className="ml-2">
                         {(() => {
                           // Priorize device_type se ele contém o UUID específico
                           const specificUUID = '52257281-667b-43c8-9873-75f9f7258b08';
                           if (order.device_type && order.device_type.includes(specificUUID)) {
                             const result = extractDeviceName(order.device_type);
                             // Se após remover o UUID não sobrou nada útil, use device_model como fallback
                             if (!result || result.trim() === '') {
                               return extractDeviceName(order.device_model);
                             }
                             return result;
                           }
                           
                           // Se device_model contém informação útil, use apenas ele
                           if (order.device_model && order.device_model.trim() !== '') {
                             return extractDeviceName(order.device_model);
                           }
                           
                           // Caso contrário, tente device_type
                           return extractDeviceName(order.device_type);
                         })()}
                       </span>
                     </div>
                    {order.imei_serial && (
                      <div>
                        <span className="font-medium">IMEI/Serial:</span>
                        <span className="ml-2">{order.imei_serial}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className="ml-2">{translateStatus(order.status)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Preço Total:</span>
                      <span className="ml-2">R$ {(order.total_price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {order.reported_issue && (
                  <div className="mb-4">
                    <span className="font-medium">Reparo Realizado:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.reported_issue}
                    </p>
                  </div>
                )}

                {order.notes && (
                  <div className="mb-4">
                    <span className="font-medium">Observações:</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.notes}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.is_paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {order.is_paid ? 'Pago' : 'Não Pago'}
                    </span>
                    {order.warranty_months && (
                      <span>
                        <span className="font-medium">Garantia:</span> {order.warranty_months} meses
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(order.id)}
                      disabled={restoreOrderMutation.isPending}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restaurar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Excluir Permanentemente
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá excluir permanentemente a ordem de serviço {order.id?.slice(0, 8) || 'N/A'}.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleHardDelete(order.id)}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={hardDeleteOrderMutation.isPending}
                          >
                            {hardDeleteOrderMutation.isPending ? 'Excluindo...' : 'Excluir'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export { ServiceOrderTrash };