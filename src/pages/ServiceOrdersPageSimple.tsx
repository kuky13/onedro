import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Settings, AlertCircle, Wrench, Clock, CheckCircle, XCircle, Circle, RotateCcw, ExternalLink, ArrowLeft, Copy, Calendar, User, Smartphone, FileCheck, Shield, Package2, Eye, FileText, MessageCircle, ChevronDown, ChevronUp, DollarSign, Banknote, CreditCard, QrCode, Zap, Star, MapPin, Phone, Mail, Loader2, Menu, Info, Link, Play, X, RefreshCw } from 'lucide-react';
import { ServiceOrderStatusActions } from '../components/ServiceOrderStatusActions';
import { useServiceOrderShare } from '../hooks/useServiceOrderShare';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { Tables, Enums } from '@/integrations/supabase/types';
import { PaymentStatusCard } from '@/components/service-orders/PaymentStatusCard';
import { EnhancedTimeline } from '@/components/service-orders/EnhancedTimeline';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { saveServiceOrderPDF, ServiceOrderData } from '@/utils/serviceOrderPdfUtils';
import { useServiceOrdersRealTime } from '@/hooks/useServiceOrdersRealTime';
type ServiceOrder = Tables<'service_orders'>;
export const ServiceOrdersPageSimple = () => {
  const navigate = useNavigate();
  const {
    profile
  } = useAuth();
  const queryClient = useQueryClient();
  const {
    isMobile
  } = useDeviceDetection();
  const {
    generateShareToken,
    copyToClipboard
  } = useServiceOrderShare();

  // Carregar dados da empresa para garantir que o cache esteja disponível para PDFs
  const {
    isLoading: companyLoading,
    error: companyError
  } = useCompanyDataLoader();

  // Real-time updates para a lista de ordens de serviço
  const realTimeStatus = useServiceOrdersRealTime({
    enablePolling: true,
    pollingInterval: 30000,
    enableNotifications: true,
    enableToasts: false // Discreto por padrão
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch service orders
  const {
    data: serviceOrders = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['service-orders', profile?.id],
    queryFn: async () => {
      if (!profile?.id) {
        return [];
      }
      const {
        data,
        error
      } = await supabase.from('service_orders').select(`
          *,
          clients!fk_service_orders_client_id (
            name,
            phone,
            address
          )
        `).eq('owner_id', profile.id).is('deleted_at', null).order('created_at', {
        ascending: false
      });
      if (error) {
        throw new Error(`Falha ao carregar ordens de serviço: ${error.message}`);
      }
      return data || [];
    },
    enabled: !!profile?.id,
    retry: (failureCount, error) => {
      return failureCount < 2; // Tentar até 3 vezes
    }
  });

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        error
      } = await supabase.rpc('soft_delete_service_order', {
        p_id: id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['service-orders']
      });
      toast.success('Ordem de serviço enviada para a lixeira!');
    },
    onError: error => {
      toast.error('Erro ao enviar ordem de serviço para a lixeira');
    }
  });

  // Helper function to check if search term matches service order number
  const matchesServiceOrderNumber = (order: ServiceOrder, searchTerm: string): boolean => {
    if (!order.sequential_number) return false;
    const cleanSearchTerm = searchTerm.toLowerCase().trim();
    const sequentialNumber = order.sequential_number;

    // Remove common prefixes and clean the search term
    const cleanedTerm = cleanSearchTerm.replace(/^os:?\s*/i, '') // Remove "OS:" or "OS " prefix
    .replace(/^ordem\s*/i, '') // Remove "ordem " prefix
    .replace(/[^\d]/g, ''); // Keep only digits

    // If search term is empty after cleaning, don't match
    if (!cleanedTerm) return false;

    // Convert to number for comparison
    const searchNumber = parseInt(cleanedTerm, 10);

    // Check if it's a valid number
    if (isNaN(searchNumber)) return false;

    // Direct number match (e.g., searching "10" matches sequential_number 10)
    if (sequentialNumber === searchNumber) return true;

    // Padded number match (e.g., searching "0010" matches sequential_number 10)
    const paddedSequential = sequentialNumber.toString().padStart(4, '0');
    if (paddedSequential === cleanedTerm.padStart(4, '0')) return true;

    // Partial match for padded numbers (e.g., searching "10" matches "0010")
    if (paddedSequential.includes(cleanedTerm)) return true;
    return false;
  };

  // Filter service orders
  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(order => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
      // Search by client name
      order.clients?.name?.toLowerCase().includes(searchTermLower) ||
      // Search by device model
      order.device_model?.toLowerCase().includes(searchTermLower) ||
      // Search by service order number (flexible)
      matchesServiceOrderNumber(order, searchTerm) ||
      // Search by reported issue
      order.reported_issue?.toLowerCase().includes(searchTermLower) ||
      // Search by device type
      order.device_type?.toLowerCase().includes(searchTermLower);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [serviceOrders, searchTerm, statusFilter]);
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: ['service-orders']
      });
      toast.success('Lista de ordens de serviço atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar a lista');
    } finally {
      setIsRefreshing(false);
    }
  };
  const handleEdit = (id: string) => {
    navigate(`/service-orders/${id}/edit`);
  };
  const handleView = (id: string) => {
    navigate(`/service-orders/${id}`);
  };
  const handleGeneratePDF = async (order: ServiceOrder) => {
    if (isGeneratingPDF === order.id) return;
    setIsGeneratingPDF(order.id);
    try {
      // Preparar dados da ordem de serviço para o PDF
      const serviceOrderData: ServiceOrderData = {
        id: order.id,
        sequential_number: order.sequential_number || 0,
        client_name: order.clients?.name || order.client_name || 'Cliente não informado',
        client_phone: order.clients?.phone || order.client_phone || '',
        client_address: order.clients?.address || order.client_address || '',
        device_model: order.device_model || 'Dispositivo não informado',
        device_type: order.device_type || '',
        imei_serial: order.imei_serial || '',
        reported_issue: order.reported_issue || '',
        labor_cost: order.labor_cost || 0,
        parts_cost: order.parts_cost || 0,
        total_price: order.total_price || 0,
        payment_status: order.payment_status || 'pending',
        status: order.status || 'pending',
        priority: order.priority || 'medium',
        estimated_completion: order.estimated_completion || '',
        actual_completion: order.actual_completion || '',
        warranty_months: order.warranty_months || 0,
        notes: order.notes || '',
        technician_notes: order.technician_notes || '',
        customer_notes: order.customer_notes || '',
        is_paid: order.is_paid || false,
        delivery_date: order.delivery_date || '',
        entry_date: (order as any).entry_date || '',
        // Data de entrada do equipamento
        exit_date: (order as any).exit_date || '',
        // Data de saída/entrega do equipamento
        created_at: order.created_at,
        updated_at: order.updated_at
      };
      await saveServiceOrderPDF(serviceOrderData);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF da ordem de serviço');
    } finally {
      setIsGeneratingPDF(null);
    }
  };
  const handleDetails = (order: ServiceOrder) => {
    navigate(`/service-orders/${order.id}`);
  };
  const handleCopyLink = async (order: ServiceOrder) => {
    try {
      // Para iOS, garantir que a ação de cópia aconteça imediatamente no contexto da interação
      const userAgent = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);
      if (isIOS) {
        // Mostrar loading imediatamente para manter o contexto de interação
        toast.loading('Gerando link...', {
          id: 'copy-link'
        });
      }
      const shareData = await generateShareToken(order.id);
      if (isIOS) {
        // Remover loading
        toast.dismiss('copy-link');
      }
      if (shareData) {
        const success = await copyToClipboard(shareData.share_url, 'Link de compartilhamento');
        if (!success) {
          toast.error('Não foi possível copiar o link automaticamente');
        }
      }
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('Erro ao gerar link de compartilhamento');

      // Remover loading em caso de erro
      toast.dismiss('copy-link');
    }
  };
  const handleOpenLink = async (order: ServiceOrder) => {
    try {
      toast.loading('Gerando link...', {
        id: 'open-link'
      });
      const shareData = await generateShareToken(order.id);
      toast.dismiss('open-link');
      if (shareData) {
        window.open(shareData.share_url, '_blank');
        toast.success('Link aberto em nova aba!');
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
      toast.error('Erro ao gerar link de compartilhamento');

      // Remover loading em caso de erro
      toast.dismiss('open-link');
    }
  };
  const handleMarkAsPaid = async (orderId: string) => {
    try {
      const {
        error
      } = await supabase.from('service_orders').update({
        payment_status: 'paid',
        is_paid: true
      }).eq('id', orderId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ['service-orders']
      });
      toast.success('Pagamento marcado como pago!');
    } catch (error) {
      toast.error('Erro ao atualizar status do pagamento');
    }
  };
  const handleStartService = async (orderId: string) => {
    try {
      const {
        error
      } = await supabase.from('service_orders').update({
        status: 'in_progress'
      }).eq('id', orderId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ['service-orders']
      });
      toast.success('Serviço iniciado!');
    } catch (error) {
      toast.error('Erro ao atualizar status do serviço');
    }
  };
  const handleCancelOrder = async (orderId: string) => {
    try {
      const {
        error
      } = await supabase.from('service_orders').update({
        status: 'cancelled'
      }).eq('id', orderId);
      if (error) throw error;
      queryClient.invalidateQueries({
        queryKey: ['service-orders']
      });
      toast.success('Ordem de serviço cancelada!');
    } catch (error) {
      toast.error('Erro ao cancelar ordem de serviço');
    }
  };

  // Função para atualizar status localmente
  const handleStatusUpdate = async (newStatus: string) => {
    queryClient.invalidateQueries({
      queryKey: ['service-orders']
    });
  };

  // Função para atualizar pagamento localmente
  const handlePaymentUpdate = async () => {
    queryClient.invalidateQueries({
      queryKey: ['service-orders']
    });
  };
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        label: 'Pendente',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 dark:hover:bg-yellow-900/50',
        icon: Clock
      },
      in_progress: {
        label: 'Em Andamento',
        className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/50',
        icon: Wrench
      },
      completed: {
        label: 'Concluído',
        className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/50',
        icon: CheckCircle
      },
      delivered: {
        label: 'Entregue',
        className: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700 dark:hover:bg-purple-900/50',
        icon: Package2
      },
      cancelled: {
        label: 'Cancelado',
        className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/50',
        icon: XCircle
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return <Badge className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>;
  };
  const getPaymentStatusBadge = (paymentStatus: string, isPaid: boolean) => {
    if (isPaid || paymentStatus === 'paid') {
      return <Badge className="flex items-center gap-1 bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/50">
          <CheckCircle className="h-3 w-3" />
          Pago
        </Badge>;
    }
    return <Badge className="flex items-center gap-1 bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/50">
        <Clock className="h-3 w-3" />
        Pendente
      </Badge>;
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      console.warn('formatDate: dateString is null or undefined');
      return 'Data não informada';
    }
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('formatDate: Invalid date string:', dateString);
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('formatDate: Error formatting date:', error, 'dateString:', dateString);
      return 'Erro na data';
    }
  };
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  if (error) {
    return <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-2">
              Erro ao carregar ordens de serviço
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || 'Ocorreu um erro inesperado ao carregar os dados.'}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mr-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header com botão Voltar */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none">
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/service-orders/trash')} className="cursor-pointer">
                <Trash2 className="h-4 w-4 mr-2" />
                Lixeira
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={() => navigate('/service-orders/new')} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem
          </Button>
        </div>
      </div>

      {/* Título */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2">Ordens de Serviço</h1>
        <p className="text-muted-foreground">Gerencie suas ordens de serviço</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, dispositivo, código da OS (ex: 10, 0010, OS: 0010)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="shrink-0" title="Atualizar lista">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Concluído</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Service Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma ordem de serviço encontrada</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || statusFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira ordem de serviço'}
              </p>
              {!searchTerm && statusFilter === 'all' && <Button onClick={() => navigate('/service-orders/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Ordem
                </Button>}
            </CardContent>
          </Card> : filteredOrders.map(order => {
        const isExpanded = expandedCard === order.id;
        return <Card key={order.id} className="hover:shadow-md transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header with Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          OS: {String(order.sequential_number || 0).padStart(4, '0')}
                        </h3>
                        {getStatusBadge(order.status || 'pending')}
                      </div>
                      
                      {/* Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <MoreVertical className="h-4 w-4" />
                            Ações
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleEdit(order.id)} className="cursor-pointer">
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGeneratePDF(order)} className="cursor-pointer" disabled={isGeneratingPDF === order.id}>
                            {isGeneratingPDF === order.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Gerar PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(order.id)} className="cursor-pointer text-destructive focus:text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Device Model Preview */}
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Modelo:</span>
                        <span className="font-medium text-foreground">
                          {order.device_model || 'S23'}
                        </span>
                      </div>
                    </div>

                    {/* Compact Service Information */}
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Reparo Realizado:</span>
                        <span className="font-medium text-foreground">
                          {order.reported_issue && order.reported_issue.trim() !== '' ? order.reported_issue : 'Não informado'}
                        </span>
                      </div>
                    </div>

                    {/* Compact Payment Information */}
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Valor Total:</span>
                        <span className="font-semibold text-foreground">
                          {order.total_price ? formatCurrency(order.total_price) : 'R$ 200,00'}
                        </span>
                      </div>
                    </div>

                    {/* Compact Payment Status */}
                    <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Status do Pagamento:</span>
                        {getPaymentStatusBadge(order.payment_status || 'pending', order.is_paid || false)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => handleCopyLink(order)} className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Copiar Link
                      </Button>
                      
                      <Button variant="outline" size="sm" onClick={() => handleOpenLink(order)} className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir Link
                      </Button>
                      
                      <Button variant="outline" size="sm" onClick={() => setExpandedCard(isExpanded ? null : order.id)} className="flex items-center gap-2">
                        {isExpanded ? <>
                            <ChevronUp className="h-4 w-4" />
                            Recolher
                          </> : <>
                            <ChevronDown className="h-4 w-4" />
                            Detalhes
                          </>}
                      </Button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && <div className="space-y-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
                        {/* Status Actions */}
                        <div>
                          <div className="text-sm text-muted-foreground mb-3">Ações de Status:</div>
                          <ServiceOrderStatusActions serviceOrder={order} onStatusUpdate={handleStatusUpdate} onPaymentUpdate={handlePaymentUpdate} />
                        </div>

                        {/* Título da seção */}
                        <div className="text-lg font-semibold text-foreground mb-4">
                          Detalhes da OS
                        </div>

                        {/* Complete Device Information */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground fill-current" />
                            <span className="font-medium text-foreground">Dispositivo</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <span className="text-sm text-muted-foreground">Modelo:</span>
                              <div className="font-medium text-foreground">
                                {order.device_model || 'S23'}
                              </div>
                            </div>
                            {order.imei_serial && <div>
                                <span className="text-sm text-muted-foreground">IMEI/Serial:</span>
                                <div className="font-medium text-foreground font-mono">
                                  {order.imei_serial}
                                </div>
                              </div>}
                          </div>
                        </div>

                        {/* Complete Service Information */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench className="h-4 w-4 text-muted-foreground fill-current" />
                            <span className="font-medium text-foreground">Serviço</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Reparo Realizado:</div>
                              <div className="font-medium text-foreground">
                                {order.reported_issue && order.reported_issue.trim() !== '' ? order.reported_issue : 'Não informado'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Garantia:</div>
                              <div className="font-medium text-foreground">
                                {order.warranty_months ? `${order.warranty_months} ${order.warranty_months === 1 ? 'mês' : 'meses'}` : 'Não informado'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Data de Entrada:</div>
                              <div className="font-medium text-foreground">
                                {order.entry_date ? new Date(order.entry_date).toLocaleDateString('pt-BR') : 'Não informado'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Data de Saída:</div>
                              <div className="font-medium text-foreground">
                                {order.exit_date ? new Date(order.exit_date).toLocaleDateString('pt-BR') : 'Não informado'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Complete Payment Information */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="h-4 w-4 text-muted-foreground fill-current" />
                            <span className="font-medium text-foreground">Pagamento</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Valor Total:</div>
                              <div className="font-semibold text-lg text-foreground">
                                {order.total_price ? formatCurrency(order.total_price) : 'R$ 200,00'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Status do Pagamento:</div>
                              {getPaymentStatusBadge(order.payment_status || 'pending', order.is_paid || false)}
                            </div>
                          </div>
                        </div>

                        {/* Client Information */}
                        <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4 text-muted-foreground fill-current" />
                            <span className="font-medium text-foreground">Cliente</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Nome:</div>
                              <div className="font-medium text-foreground">
                                {order?.clients?.name && order.clients.name.trim() !== '' ? order.clients.name : 'Cliente não informado'}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Telefone:</div>
                              <div className="font-medium text-foreground">
                                {order?.clients?.phone && order.clients.phone.trim() !== '' ? order.clients.phone : 'Não informado'}
                              </div>
                            </div>
                          </div>
                        </div>


                      </div>}
                  </div>
                </CardContent>
              </Card>;
      })}
      </div>
    </div>;
};
export default ServiceOrdersPageSimple;