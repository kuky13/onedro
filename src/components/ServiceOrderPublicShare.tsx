import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Phone, Building2, Package, Wrench, Truck, Archive, Calendar, ExternalLink, MapPin, FileCheck, Package2, Smartphone, Hash, Image, Clock, CreditCard, X, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useServiceOrderRealTime } from '@/hooks/useServiceOrderRealTime';
import { useDynamicMetaTags } from '@/hooks/useDynamicMetaTags';
import { DevicePasswordDisplay } from '@/components/service-orders/DevicePasswordDisplay';
import { TestResultsDisplay } from '@/components/service-orders/TestResultsDisplay';
import { SupabaseStorageService } from '@/services/supabaseStorageService';
import { ServiceOrderImage } from '@/types/imageUpload';
import { ServiceOrderData } from '@/types/serviceOrder';
import { CompanyInfo } from '@/types/company';
import { cn } from '@/lib/utils';
const statusConfig = {
  opened: {
    label: 'Aberto',
    color: '#EF4444',
    icon: Package,
    description: 'Ordem de serviço criada e aguardando início do atendimento',
    step: 1
  },
  pending_approval: {
    label: 'Aguardando Aprovação',
    color: '#6366F1',
    icon: FileCheck,
    description: 'Aguardando aprovação do cliente para prosseguir com o reparo',
    step: 1
  },
  in_progress: {
    label: 'Reparo',
    color: '#F59E0B',
    icon: Wrench,
    description: 'Técnico trabalhando no reparo do equipamento',
    step: 2
  },
  waiting_parts: {
    label: 'Aguardando Peças',
    color: '#8B5CF6',
    icon: Package,
    description: 'Aguardando chegada de peças para continuar o reparo',
    step: 2
  },
  waiting_client: {
    label: 'Aguardando Cliente',
    color: '#F97316',
    icon: Phone,
    description: 'Aguardando contato ou decisão do cliente',
    step: 2
  },
  under_warranty: {
    label: 'Em Garantia',
    color: '#10B981',
    icon: Shield,
    description: 'Equipamento em processo de garantia',
    step: 2
  },
  ready_for_pickup: {
    label: 'Pronto para Retirada',
    color: '#06B6D4',
    icon: Package2,
    description: 'Reparo finalizado, equipamento pronto para retirada',
    step: 3
  },
  completed: {
    label: 'Concluído',
    color: '#10B981',
    icon: CheckCircle,
    description: 'Reparo finalizado, equipamento pronto para retirada',
    step: 3
  },
  delivered: {
    label: 'Entregue',
    color: '#fec832',
    icon: Truck,
    description: 'Equipamento entregue ao cliente',
    step: 4
  },
  cancelled: {
    label: 'Cancelado',
    color: '#EF4444',
    icon: AlertCircle,
    description: 'Ordem de serviço cancelada',
    step: 0
  },
  archived: {
    label: 'Arquivado',
    color: '#6B7280',
    icon: Archive,
    description: 'Ordem de serviço arquivada',
    step: 5
  }
};
function getStatusInfo(status: string) {
  return statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    color: '#6B7280',
    icon: AlertCircle,
    description: 'Status desconhecido',
    step: 0
  };
}
function getPaymentStatusInfo(isPaid: boolean) {
  if (isPaid) {
    return {
      label: 'Pago',
      color: '#10B981',
      icon: CheckCircle,
      description: 'Pagamento confirmado'
    };
  } else {
    return {
      label: 'Pendente',
      color: '#F59E0B',
      icon: AlertCircle,
      description: 'Aguardando pagamento'
    };
  }
}
// Detect if token is a formatted_id (e.g., OS0001) or a legacy share token
function isFormattedId(token: string): boolean {
  return /^OS\d+$/i.test(token);
}

export function ServiceOrderPublicShare() {
  const params = useParams<{ shareToken: string }>();
  const [searchParams] = useSearchParams();
  const token = params.shareToken;
  const directId = searchParams.get('id'); // UUID from new links
  const tokenIsFormattedId = token ? isFormattedId(token) : false;

  const [serviceOrder, setServiceOrder] = useState<ServiceOrderData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<ServiceOrderImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [testSession, setTestSession] = useState<{
    test_results: Record<string, any>;
    overall_score: number | null;
    completed_at: string | null;
    status: string;
  } | null>(null);

  const realtimeOptions: Parameters<typeof useServiceOrderRealTime>[0] = token ? {
    ...(tokenIsFormattedId ? { formattedId: token } : { shareToken: token }),
    enablePolling: true,
    pollingInterval: 30000,
    enableNotifications: true
  } : {
    shareToken: '',
    enablePolling: false,
    pollingInterval: 0,
    enableNotifications: false
  };
  const { serviceOrder: realtimeServiceOrder } = useServiceOrderRealTime(realtimeOptions);

  useDynamicMetaTags();

  useEffect(() => {
    if (!realtimeServiceOrder) return;

    setServiceOrder(prev => ({
      ...(prev ?? {}),
      ...(realtimeServiceOrder as Partial<ServiceOrderData>),
      entry_date: (realtimeServiceOrder as any).entry_date || prev?.entry_date || null,
      exit_date: (realtimeServiceOrder as any).exit_date || prev?.exit_date || null,
      device_password_type: ((realtimeServiceOrder as any).device_password_type || prev?.device_password_type || null) as any
    } as ServiceOrderData));
  }, [realtimeServiceOrder]);

  useEffect(() => {
    if (!serviceOrder?.id) return;

    const fetchLatestTestSession = async () => {
      const { data } = await supabase
        .from('device_test_sessions')
        .select('test_results, overall_score, completed_at, status')
        .eq('service_order_id', serviceOrder.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setTestSession(data ? {
        test_results: (data.test_results as Record<string, any>) || {},
        overall_score: data.overall_score,
        completed_at: data.completed_at,
        status: data.status
      } : null);
    };

    void fetchLatestTestSession();

    const channel = supabase
      .channel(`service-order-public-test-${serviceOrder.id}`)
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'device_test_sessions',
        filter: `service_order_id=eq.${serviceOrder.id}`
      }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          void fetchLatestTestSession();
          return;
        }

        const updated = payload.new;
        if (!updated) return;

        setTestSession({
          test_results: (updated.test_results as Record<string, any>) || {},
          overall_score: updated.overall_score,
          completed_at: updated.completed_at,
          status: updated.status
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [serviceOrder?.id]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setServiceOrder(null);
    setCompanyInfo(null);
    setImages([]);
    setTestSession(null);

    try {
      let serviceOrderData: any[] | null = null;

      if (tokenIsFormattedId) {
        // Use formatted_id lookup (permanent link)
        const { data, error: soError } = await supabase.rpc('get_service_order_by_formatted_id' as any, {
          p_formatted_id: token
        });
        if (soError) throw new Error(soError.message);
        serviceOrderData = data as any[];
      } else {
        // Legacy token lookup
        const { data, error: soError } = await supabase.rpc('get_service_order_by_share_token', {
          p_share_token: token
        });
        if (soError) throw new Error(soError.message);
        serviceOrderData = data as any[];
      }

      if (!serviceOrderData || serviceOrderData.length === 0) {
        throw new Error('Ordem de serviço não encontrada');
      }
      if (serviceOrderData[0]) {
        const data = serviceOrderData[0] as any;
        setServiceOrder({
          ...data,
          entry_date: data.entry_date || null,
          exit_date: data.exit_date || null,
          device_password_type: (data.device_password_type || null) as any
        } as ServiceOrderData);
      }

      // Fetch company info
      let companyData: any[] | null = null;
      if (tokenIsFormattedId) {
        const { data, error: companyError } = await supabase.rpc('get_company_info_by_formatted_id' as any, {
          p_formatted_id: token
        });
        if (!companyError) companyData = data as any[];
      } else {
        const { data, error: companyError } = await supabase.rpc('get_company_info_by_share_token', {
          p_share_token: token
        });
        if (!companyError) companyData = data as any[];
      }

      if (companyData && companyData.length > 0) {
        const data = companyData[0] as any;
        if (data) {
          setCompanyInfo({
            id: String(data.id || data.name || ''),
            name: data.name,
            logo_url: data.logo_url,
            address: data.address,
            whatsapp_phone: data.whatsapp_phone,
            description: null,
            email: null,
            website: null
          });
        }
      }
      if (serviceOrderData[0]?.id) {
        const orderImages = await SupabaseStorageService.getServiceOrderImages(serviceOrderData[0].id);
        setImages(orderImages);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void loadData();
    }
  }, [token]);
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", {
      locale: ptBR
    });
  };
  const formatDateOnly = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", {
      locale: ptBR
    });
  };
  const handleWhatsAppContact = () => {
    if (companyInfo?.whatsapp_phone && serviceOrder) {
      const message = `Olá! Gostaria de saber sobre a ordem de serviço ${serviceOrder.formatted_id} (${serviceOrder.device_model})`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${companyInfo.whatsapp_phone.replace(/\D/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  };
  const themeColor = '#fec832';
  const showLogo = true;
  const showCompanyName = true;
  const customMessage: string | null = null;
  const finalCompanyInfo = companyInfo;
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
          borderColor: themeColor,
          borderTopColor: 'transparent'
        }} />
          <p className="text-muted-foreground text-sm">Carregando ordem de serviço...</p>
        </div>
      </div>;
  }
  if (error || !serviceOrder) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Erro</h2>
            <p className="text-muted-foreground">
              {error || 'Ordem de serviço não encontrada'}
            </p>
          </CardContent>
        </Card>
      </div>;
  }
  const paymentInfo = getPaymentStatusInfo(serviceOrder.is_paid);
  return <div className="min-h-screen bg-background">
      {/* Company Header */}
      {(showLogo || showCompanyName) && finalCompanyInfo && <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              {showLogo && finalCompanyInfo.logo_url && <img src={finalCompanyInfo.logo_url} alt={finalCompanyInfo.name} className="w-12 h-12 object-contain rounded-xl" />}
              <div className="flex-1">
                {showCompanyName && finalCompanyInfo.name && <h1 className="text-lg font-bold" style={{
              color: themeColor
            }}>
                    {finalCompanyInfo.name}
                  </h1>}
                <p className="text-sm text-muted-foreground">
                  {customMessage || 'Acompanhe o status do seu reparo'}
                </p>
              </div>
            </div>
          </div>
        </header>}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Order Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{
          backgroundColor: `${themeColor}20`
        }}>
            <Building2 className="w-7 h-7" style={{
            color: themeColor
          }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {serviceOrder.formatted_id || `OS: ${serviceOrder.sequential_number?.toString().padStart(4, '0') || serviceOrder.id.slice(-8)}`}
            </h1>
            <p className="text-muted-foreground text-sm">Ordem de Serviço</p>
          </div>
        </div>

        {/* Status Timeline - Mobile Optimized */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-4 sm:py-6">
            {/* Mobile: Vertical Timeline */}
            <div className="flex sm:hidden flex-col gap-0">
              {['opened', 'in_progress', 'completed', 'delivered'].map((status, index) => {
              const config = getStatusInfo(status);
              const currentStatusInfo = getStatusInfo(serviceOrder.status);
              const currentStep = currentStatusInfo.step;
              const isActive = serviceOrder.status === status;
              const isCompleted = config.step <= currentStep && currentStep > 0 && !isActive;
              const isPending = config.step > currentStep;
              const IconComponent = config.icon;
              return <div key={status} className="flex items-stretch">
                    {/* Left: Icon + Connector */}
                    <div className="flex flex-col items-center mr-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300", isActive && "ring-4 ring-offset-2 ring-offset-card shadow-lg", isCompleted && "bg-green-500 text-white", isPending && "bg-muted text-muted-foreground")} style={isActive ? {
                    backgroundColor: config.color,
                    boxShadow: `0 4px 20px ${config.color}50`
                  } : {}}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <IconComponent className="w-5 h-5" />}
                      </div>
                      {/* Connector line */}
                      {index < 3 && <div className={cn("w-0.5 flex-1 min-h-[20px] my-1 transition-colors", config.step <= currentStep ? "bg-green-400" : "bg-muted")} />}
                    </div>
                    
                    {/* Right: Label + Description */}
                    <div className={cn("pb-4 pt-2 flex-1", index === 3 && "pb-0")}>
                      <span className={cn("font-medium text-sm transition-colors", isActive && "text-foreground", isCompleted && "text-green-600 dark:text-green-400", isPending && "text-muted-foreground")}>
                        {config.label}
                      </span>
                      {isActive && <p className="text-xs text-muted-foreground mt-0.5">
                          Status atual
                        </p>}
                    </div>
                  </div>;
            })}
            </div>
            
            {/* Desktop: Horizontal Timeline */}
            <div className="hidden sm:flex items-center justify-between">
              {['opened', 'in_progress', 'completed', 'delivered'].map((status, index) => {
              const config = getStatusInfo(status);
              const currentStatusInfo = getStatusInfo(serviceOrder.status);
              const currentStep = currentStatusInfo.step;
              const isActive = serviceOrder.status === status;
              const isCompleted = config.step <= currentStep && currentStep > 0 && !isActive;
              const isPending = config.step > currentStep;
              const IconComponent = config.icon;
              return <React.Fragment key={status}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300", isActive && "ring-4 ring-offset-2 ring-offset-card shadow-lg", isCompleted && "bg-green-500 text-white", isPending && "bg-muted text-muted-foreground")} style={isActive ? {
                    backgroundColor: config.color,
                    boxShadow: `0 4px 20px ${config.color}50`
                  } : {}}>
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <IconComponent className="w-5 h-5" />}
                      </div>
                      <span className={cn("text-sm font-medium transition-colors", isActive && "text-foreground", isCompleted && "text-green-600 dark:text-green-400", isPending && "text-muted-foreground")}>
                        {config.label}
                      </span>
                    </div>
                    {index < 3 && <div className={cn("flex-1 h-1 rounded-full mx-2 transition-colors", config.step <= currentStep ? "bg-green-400" : "bg-muted")} />}
                  </React.Fragment>;
            })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                backgroundColor: `${paymentInfo.color}20`
              }}>
                  <CreditCard className="w-5 h-5" style={{
                  color: paymentInfo.color
                }} />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Pagamento</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={serviceOrder.is_paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {paymentInfo.label}
                    </Badge>
                    {serviceOrder.total_price && <span className="font-bold text-foreground">
                        {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(serviceOrder.total_price)}
                      </span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {serviceOrder.estimated_completion && <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                backgroundColor: `${themeColor}20`
              }}>
                    <Clock className="w-5 h-5" style={{
                  color: themeColor
                }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão</p>
                    <p className="font-semibold text-foreground">
                      {formatDateTime(serviceOrder.estimated_completion)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Device & Service Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="w-4 h-4 text-primary" />
                Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="font-semibold text-foreground">{serviceOrder.device_model}</p>
              </div>
              
              {serviceOrder.imei_serial && <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      IMEI/Série
                    </p>
                    <p className="font-mono text-sm text-foreground">{serviceOrder.imei_serial}</p>
                  </div>
                </>}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-primary" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {serviceOrder.entry_date && <div>
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="font-semibold text-foreground">{formatDateTime(serviceOrder.entry_date)}</p>
                </div>}
              
              {serviceOrder.exit_date && <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Saída</p>
                    <p className="font-semibold text-foreground">{formatDateTime(serviceOrder.exit_date)}</p>
                  </div>
                </>}
              
              {serviceOrder.delivery_date && <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    <p className="font-semibold text-foreground">{formatDateOnly(serviceOrder.delivery_date)}</p>
                  </div>
                </>}
            </CardContent>
          </Card>
        </div>

        {/* Device Password */}
        {serviceOrder.device_password_type && serviceOrder.device_password_type !== 'biometric' && <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <DevicePasswordDisplay value={{
            type: serviceOrder.device_password_type as 'pin' | 'abc' | 'pattern' | null,
            value: serviceOrder.device_password_value || '',
            metadata: serviceOrder.device_password_metadata
          }} />
            </CardContent>
          </Card>}

        {/* Service Details */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="w-4 h-4 text-primary" />
              Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Problema Relatado</p>
              <p className="text-foreground font-medium">{serviceOrder.reported_issue}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {serviceOrder.total_price && <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="font-bold text-lg text-foreground">
                    {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(serviceOrder.total_price)}
                  </p>
                </div>}

              <div>
                <p className="text-xs text-muted-foreground">Pagamento</p>
                <Badge variant="secondary" className={cn("mt-1", serviceOrder.is_paid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
                  {serviceOrder.is_paid ? "Pago" : "Pendente"}
                </Badge>
              </div>

              {serviceOrder.warranty_months && <div>
                  <p className="text-xs text-muted-foreground">Garantia</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    
                    {serviceOrder.warranty_months} {serviceOrder.warranty_months === 1 ? 'mês' : 'meses'}
                  </p>
                </div>}

              {serviceOrder.delivery_date && <div>
                  <p className="text-xs text-muted-foreground">Data Entrega</p>
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDateOnly(serviceOrder.delivery_date)}
                  </p>
                </div>}
            </div>

            {serviceOrder.customer_notes && <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm text-foreground">{serviceOrder.customer_notes}</p>
                </div>
              </>}
          </CardContent>
        </Card>

        {/* Device Test Results - Sistema Interativo */}
        {testSession && testSession.status === 'completed' && Object.keys(testSession.test_results).length > 0 && (
          <TestResultsDisplay 
            results={testSession.test_results}
            overallScore={testSession.overall_score}
            completedAt={testSession.completed_at}
          />
        )}

        {/* Images */}
        {images.length > 0 && <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Image className="w-4 h-4 text-primary" />
                Imagens do Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/40 hover:ring-primary/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-[0.97] transition-transform"
                  >
                    <img
                      src={image.uploadthing_url}
                      alt={image.file_name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>}

        {/* Image Viewer Modal */}
        <Dialog open={selectedImageIndex !== null} onOpenChange={() => setSelectedImageIndex(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none overflow-hidden">
            <DialogTitle className="sr-only">Visualização de Imagem</DialogTitle>
            <button onClick={() => setSelectedImageIndex(null)} className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            {selectedImageIndex !== null && images[selectedImageIndex] && <div className="relative w-full h-full flex items-center justify-center min-h-[50vh]">
                {/* Previous button */}
                {images.length > 1 && <button onClick={e => {
              e.stopPropagation();
              setSelectedImageIndex(prev => prev !== null ? prev === 0 ? images.length - 1 : prev - 1 : null);
            }} className="absolute left-2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                  </button>}

                <img src={images[selectedImageIndex].uploadthing_url} alt={images[selectedImageIndex].file_name} className="max-w-full max-h-[85vh] object-contain" />

                {/* Next button */}
                {images.length > 1 && <button onClick={e => {
              e.stopPropagation();
              setSelectedImageIndex(prev => prev !== null ? prev === images.length - 1 ? 0 : prev + 1 : null);
            }} className="absolute right-2 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                    <ChevronRight className="w-6 h-6" />
                  </button>}

                {/* Image counter */}
                {images.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                    {selectedImageIndex + 1} / {images.length}
                  </div>}
              </div>}
          </DialogContent>
        </Dialog>

        {/* Company Contact */}
        {finalCompanyInfo && <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="font-semibold text-foreground">{finalCompanyInfo.name}</p>
              </div>
              
              {finalCompanyInfo.whatsapp_phone && <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      WhatsApp
                    </p>
                    <Button variant="outline" size="sm" onClick={handleWhatsAppContact} className="w-full justify-between rounded-xl">
                      {finalCompanyInfo.whatsapp_phone}
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </>}
              
              {finalCompanyInfo.address && <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Endereço
                    </p>
                    <p className="text-sm text-foreground">{finalCompanyInfo.address}</p>
                  </div>
                </>}
            </CardContent>
          </Card>}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-border mt-8">
        <p className="text-xs text-muted-foreground">
          Criado com <span className="font-semibold" style={{ color: themeColor }}>OneDrip</span>
        </p>
      </footer>
    </div>;
}