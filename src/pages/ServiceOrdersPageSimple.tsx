// @ts-nocheck
import { useState, useMemo } from 'react';
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
import { AlertCircle, Shield, Wrench, Clock, CheckCircle, XCircle, RotateCcw, ArrowLeft, Package2, Menu, Settings, Trash2, Plus, Search, RefreshCw, MoreVertical, Edit, FileText, Smartphone, DollarSign, CreditCard, Copy, ExternalLink, ChevronUp, ChevronDown, User } from 'lucide-react';
import { InlineSpinner } from '@/components/ui/InlineSpinner';
import { UnifiedSpinner } from '@/components/ui/UnifiedSpinner';
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
import { PrintLabelDialog } from '@/components/printing/PrintLabelDialog';
type ServiceOrder = Tables<'service_orders'>;
export const ServiceOrdersPageSimple = () => {
  const navigate = useNavigate();
  const {
    profile
  } = useAuth();
  const queryClient = useQueryClient();
  const {
    _isMobile
  } = useDeviceDetection();
  const {
    generateShareToken,
    copyToClipboard
  } = useServiceOrderShare();

  // Carregar dados da empresa para garantir que o cache esteja disponível para PDFs
  const {
    isLoading: _companyLoading,
    error: _companyError,
    getCompanyDataForPDF
  } = useCompanyDataLoader();

  const companyDataForLabel = getCompanyDataForPDF();

  // Real-time updates para a lista de ordens de serviço
  const _realTimeStatus = useServiceOrdersRealTime({
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

  // Warranty status map for service orders
  const { data: warrantyMapData } = useQuery({
    queryKey: ['warranties-for-os', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return {};
      const { data } = await supabase
        .from('warranties')
        .select('service_order_id, status, reopen_count')
        .eq('owner_id', profile.id)
        .is('deleted_at', null)
        .not('service_order_id', 'is', null);
      const map: Record<string, { status: string; reopen_count: number }> = {};
      if (data) {
        data.forEach((w: any) => {
          if (w.service_order_id) map[w.service_order_id] = w;
        });
      }
      return map;
    },
    enabled: !!profile?.id,
    staleTime: 1000 * 60 * 2,
  });
  const warrantyMap = warrantyMapData || {};

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
    retry: (failureCount, _error) => {
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
        client_name: (order as any).clients?.name || (order as any).client_name || 'Cliente não informado',
        client_phone: (order as any).clients?.phone || (order as any).client_phone || '',
        client_address: (order as any).clients?.address || (order as any).client_address || '',
        device_model: order.device_model || 'Dispositivo não informado',
        device_type: order.device_type || '',
        imei_serial: order.imei_serial || '',
        reported_issue: order.reported_issue || '',
        labor_cost: order.labor_cost || 0,
        parts_cost: order.parts_cost || 0,
        total_price: order.total_price || 0,
        payment_status: order.is_paid ? 'paid' : ((order as any).payment_status || 'pending'),
        status: (order.status || 'pending') as any,
        priority: (order.priority || 'medium') as any,
        estimated_completion: (order as any).estimated_completion || '',
        actual_completion: (order as any).actual_completion || '',
        warranty_months: order.warranty_months || 0,
        notes: order.notes || '',
        technician_notes: (order as any).technician_notes || '',
        customer_notes: (order as any).customer_notes || '',
        is_paid: order.is_paid || false,
        delivery_date: order.delivery_date || '',
        entry_date: (order as any).entry_date || '',
        // Data de entrada do equipamento
        exit_date: (order as any).exit_date || '',
        // Data de saída/entrega do equipamento
        created_at: order.created_at ?? '',
        updated_at: order.updated_at ?? ''
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
    return <UnifiedSpinner fullScreen size="md" message="Carregando ordens de serviço..." />;
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
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Header interno estilo landing (sticky + blur) */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/50">
          <div className="flex items-center justify-between py-3 lg:py-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="rounded-xl">
                    <Menu className="h-4 w-4 mr-2" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/service-orders/pdf')} className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Configurar PDFs
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/service-orders/trash')} className="cursor-pointer">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Lixeira
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => navigate('/service-orders/new')} className="btn-premium h-10 px-4 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />
                Nova Ordem
              </Button>
            </div>
          </div>
        </header>

        <main className="py-6 lg:py-10 space-y-6 lg:space-y-10">
          {/* Hero */}
          <section className="text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
              Ordens de Serviço
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Gerencie suas ordens de serviço com busca rápida, status e compartilhamento.
            </p>
          </section>

          {/* Filtros (painel premium) */}
          <section className="bg-muted/20 border border-border/30 rounded-2xl p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente, dispositivo, código da OS (ex: 10, 0010, OS: 0010)..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-background/50" />
                </div>
                <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing} className="shrink-0 rounded-xl" title="Atualizar lista">
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-56 rounded-xl">
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
          </section>

          {/* Lista */}
          <section className="space-y-4">
            {filteredOrders.length === 0 ? <Card className="rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-14">
                  <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma ordem de serviço encontrada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchTerm || statusFilter !== 'all' ? 'Tente ajustar os filtros de busca' : 'Comece criando sua primeira ordem de serviço'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && <Button onClick={() => navigate('/service-orders/new')} className="btn-premium h-11 px-6 rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeira Ordem
                    </Button>}
                </CardContent>
              </Card> : filteredOrders.map(order => {
            const isExpanded = expandedCard === order.id;
            return <Card key={order.id} className="rounded-2xl hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-4">
                        {/* Header with Status */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <h3 className="font-semibold text-lg leading-tight truncate">
                                OS: {String(order.sequential_number || 0).padStart(4, '0')}
                              </h3>
                            </div>
                            {getStatusBadge(order.status || 'pending')}
                            {warrantyMap[order.id] && (
                              <Badge className={`flex items-center gap-1 text-[10px] ${
                                warrantyMap[order.id].status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                warrantyMap[order.id].status === 'completed' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300' :
                                'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300'
                              }`}>
                                <Shield className="h-3 w-3" />
                                {warrantyMap[order.id].status === 'in_progress' ? 'Garantia ativa' : warrantyMap[order.id].status === 'completed' ? 'Garantia OK' : 'Garantia entregue'}
                                {warrantyMap[order.id].reopen_count > 0 && ` (${warrantyMap[order.id].reopen_count + 1}ª)`}
                              </Badge>
                            )}
                          </div>

                          {/* Action Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-xl">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Ações</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(order.id)} className="cursor-pointer">
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGeneratePDF(order)} className="cursor-pointer" disabled={isGeneratingPDF === order.id}>
                                {isGeneratingPDF === order.id ? <InlineSpinner size="sm" className="mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                                Gerar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(order.id)} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Pills */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-muted/20 border border-border/30 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Modelo</span>
                            </div>
                            <div className="mt-1 font-semibold text-foreground">
                              {order.device_model || 'S23'}
                            </div>
                          </div>

                          <div className="bg-muted/20 border border-border/30 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Reparo</span>
                            </div>
                            <div className="mt-1 font-semibold text-foreground line-clamp-2">
                              {order.reported_issue && order.reported_issue.trim() !== '' ? order.reported_issue : 'Não informado'}
                            </div>
                          </div>

                          <div className="bg-muted/20 border border-border/30 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Valor</span>
                            </div>
                            <div className="mt-1 font-semibold text-foreground">
                              {order.total_price ? formatCurrency(order.total_price) : 'R$ 200,00'}
                            </div>
                          </div>

                          <div className="bg-muted/20 border border-border/30 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Pagamento</span>
                            </div>
                            <div className="mt-1">
                              {getPaymentStatusBadge(order.payment_status || 'pending', order.is_paid || false)}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button variant="outline" size="sm" onClick={() => handleCopyLink(order)} className="rounded-xl">
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar link
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => handleOpenLink(order)} className="rounded-xl">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Abrir
                          </Button>

                          <PrintLabelDialog 
                            order={order} 
                            companyData={{
                              shop_name: companyDataForLabel.shop_name,
                              phone: companyDataForLabel.contact_phone
                            }}
                          />

                          <Button variant="outline" size="sm" onClick={() => setExpandedCard(isExpanded ? null : order.id)} className="rounded-xl">
                            {isExpanded ? <>
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Recolher
                              </> : <>
                                <ChevronDown className="h-4 w-4 mr-2" />
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
          </section>
        </main>
      </div>
    </div>;
};
export default ServiceOrdersPageSimple;