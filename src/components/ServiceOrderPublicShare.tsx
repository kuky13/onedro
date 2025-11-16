import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle, Phone, Building2, Package, Wrench, Truck, Archive, Calendar, ExternalLink, MapPin, RefreshCw, Wifi, WifiOff, FileCheck, Shield, Package2, Clock, Pause, Download, Smartphone, Hash, Settings, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useServiceOrderRealTime } from '@/hooks/useServiceOrderRealTime';
import { useDynamicMetaTags } from '@/hooks/useDynamicMetaTags';
import { PaymentStatusCard } from '@/components/service-orders/PaymentStatusCard';
import { EnhancedTimeline } from '@/components/service-orders/EnhancedTimeline';
import { DevicePasswordSection } from '@/components/service-orders/DevicePasswordSection';
import { DevicePasswordDisplay } from '@/components/service-orders/DevicePasswordDisplay';
import { TabbedDeviceChecklist } from '@/components/service-orders/TabbedDeviceChecklist';
import { SupabaseStorageService } from '@/services/supabaseStorageService';
import { ServiceOrderImage } from '@/types/imageUpload';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

// Removed problematic CSS animations that were causing buggy behavior
interface ServiceOrderData {
  id: string;
  formatted_id: string;
  device_type: string;
  device_model: string;
  imei_serial?: string | null;
  reported_issue: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  entry_date: string | null;
  exit_date: string | null;
  delivery_date?: string | null;
  sequential_number?: number;
  total_price?: number;
  payment_status?: string;
  estimated_completion?: string;
  actual_completion?: string;
  customer_notes?: string;
  last_customer_update?: string;
  warranty_months?: number;
  device_password_type?: string | null;
  device_password_value?: string | null;
  device_password_metadata?: any | null;
  device_checklist?: any | null;
}
interface CompanyData {
  name: string;
  logo_url: string | null;
  address: string | null;
  whatsapp_phone: string | null;
  description: string | null;
  email: string | null;
  website: string | null;
}
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
const statusOrder = ['opened', 'pending_approval', 'in_progress', 'waiting_parts', 'waiting_client', 'under_warranty', 'ready_for_pickup', 'completed', 'delivered'];

// Removed ProgressIndicator component that was causing buggy animations

// StatusTimeline component
interface StatusTimelineProps {
  currentStatus: string;
  themeColor: string;
}
function StatusTimeline({
  currentStatus,
  themeColor
}: StatusTimelineProps) {
  const currentStatusInfo = getStatusInfo(currentStatus);
  const currentStep = currentStatusInfo.step;
  const progressPercentage = currentStep === 0 ? 0 : currentStep / 4 * 100;
  return <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-foreground">Progresso</span>
          <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2 transition-all duration-500 ease-in-out" style={{
        '--progress-background': themeColor
      } as React.CSSProperties} />
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4">
        {statusOrder.map((status) => {
        const statusInfo = getStatusInfo(status);
        const isActive = status === currentStatus;
        const isCompleted = statusInfo.step <= currentStep && currentStep > 0;
        const StatusIcon = statusInfo.icon;
        return <TooltipProvider key={status}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 cursor-pointer", isActive && "ring-2 ring-offset-2 shadow-md", isCompleted ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50")} style={{
                backgroundColor: isActive ? `${themeColor}10` : undefined
              }}>
                    <div className={cn("flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300", isCompleted || isActive ? "text-white" : "text-muted-foreground")} style={{
                  backgroundColor: isCompleted || isActive ? statusInfo.color : '#E5E7EB'
                }}>
                      <StatusIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className={cn("font-medium transition-colors duration-300", isActive ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground")}>
                        {statusInfo.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {statusInfo.description}
                      </p>
                    </div>
                    {isActive && <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{
                    backgroundColor: statusInfo.color
                  }} />
                        <span className="text-sm font-medium" style={{
                    color: statusInfo.color
                  }}>
                          {serviceOrder.total_price ? 
                            new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(serviceOrder.total_price) : 
                            'Valor não informado'
                          }
                        </span>
                      </div>}
                    {isCompleted && !isActive && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{statusInfo.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>;
      })}
      </div>


    </div>;
}
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
export function ServiceOrderPublicShare() {
  const {
    shareToken: token
  } = useParams<{
    shareToken: string;
  }>();
  
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [images, setImages] = useState<ServiceOrderImage[]>([]);

  // Hook para configurações de branding
  const {
    companyInfo: brandingInfo,
    shareSettings
  } = useCompanyBranding();

  // Real-time updates hook
  const {
    serviceOrder: realTimeData,
    events: realTimeEvents,
    status: realTimeStatus,
    refresh: refreshRealTime,
    isLoading: realTimeLoading,
    error: realTimeError
  } = useServiceOrderRealTime({
    shareToken: token,
    enablePolling: true,
    pollingInterval: 30000,
    enableNotifications: true
  });

  // Hook para meta tags dinâmicas
  useDynamicMetaTags();
  const loadData = async () => {
    if (!token || hasLoaded) {
      console.log('🚫 Carregamento bloqueado - Token:', !!token, 'HasLoaded:', hasLoaded);
      return;
    }
    console.log('🚀 Iniciando carregamento para token:', token);
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Carregando dados para token:', token);

      // Carregar dados da ordem de serviço
      const {
        data: serviceOrderData,
        error: serviceOrderError
      } = await supabase.rpc('get_service_order_by_share_token', {
        p_share_token: token
      });
      if (serviceOrderError) {
        console.error('❌ Erro ao buscar ordem de serviço:', serviceOrderError);
        throw new Error(serviceOrderError.message);
      }
      if (!serviceOrderData || serviceOrderData.length === 0) {
        console.log('❌ Nenhum dado retornado para o token');
        throw new Error('Token de compartilhamento inválido ou expirado');
      }
      console.log('📋 Ordem de serviço encontrada:', serviceOrderData[0]);
      if (serviceOrderData[0]) {
        setServiceOrder({
          ...serviceOrderData[0],
          entry_date: (serviceOrderData[0] as any).entry_date || null,
          exit_date: (serviceOrderData[0] as any).exit_date || null
        });
      }

      // Carregar informações da empresa
      const {
        data: companyData,
        error: companyError
      } = await supabase.rpc('get_company_info_by_share_token', {
        p_share_token: token
      });
      if (!companyError && companyData && companyData.length > 0) {
        console.log('🏢 Informações da empresa carregadas:', companyData[0]);
        const data = companyData[0];
        if (data) {
          setCompanyInfo({
            name: data.name,
            logo_url: data.logo_url,
            address: data.address,
            whatsapp_phone: data.whatsapp_phone,
            description: null,
            email: null,
            website: null
          });
        }
      } else {
        console.log('⚠️ Informações da empresa não encontradas');
      }

      // Carregar imagens da ordem de serviço
      if (serviceOrderData[0]?.id) {
        console.log('📸 Carregando imagens da ordem de serviço:', serviceOrderData[0].id);
        const orderImages = await SupabaseStorageService.getServiceOrderImages(serviceOrderData[0].id);
        setImages(orderImages);
        console.log('✅ Imagens carregadas:', orderImages.length);
      }

      console.log('✅ Dados carregados com sucesso');
      setLastUpdate(new Date());
    } catch (err) {
      console.error('💥 Erro ao carregar dados:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setHasLoaded(true);
      console.log('🏁 Carregamento finalizado - HasLoaded definido como true');
    }
  };

  // Update service order data when real-time data changes
  useEffect(() => {
    if (realTimeData && serviceOrder) {
      setServiceOrder(prev => ({
        ...prev!,
        ...realTimeData,
        updated_at: new Date().toISOString()
      }));
      setLastUpdate(new Date());
    }
  }, [realTimeData]);
  useEffect(() => {
    if (token && !hasLoaded) {
      loadData();
    }
  }, [token, hasLoaded]);
  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const formatDateOnly = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const handleWhatsAppContact = () => {
    if (companyInfo?.whatsapp_phone && serviceOrder) {
      const message = `Olá! Gostaria de saber sobre a ordem de serviço ${serviceOrder.formatted_id} (${serviceOrder.device_model})`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${companyInfo.whatsapp_phone.replace(/\D/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleManualRefresh = async () => {
    try {
      await refreshRealTime();
      await loadData();
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    }
  };

  const generateWarrantyPDF = async () => {
    if (!finalCompanyInfo?.name) {
      toast.error('Informações da empresa não disponíveis');
      return;
    }

    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15; // Reduzir margem para mais espaço
      const maxWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2) - 15; // Reservar espaço para rodapé
      
      // Preparar textos - usar termos personalizados se disponíveis, senão usar padrão
      const defaultCancellationTerms = `A GARANTIA É CANCELADA AUTOMATICAMENTE NOS SEGUINTES CASOS: 
Em ocasião de quedas, esmagamentos, sobrecarga elétrica; exposição do aparelho a altas temperaturas, umidade ou 
líquidos; exposição do aparelho a poeira, pó e/ou limalha de metais, ou ainda quando constatado mau uso do aparelho, 
instalações, modificações ou atualizações no seu sistema operacional; abertura do equipamento ou tentativa de conserto 
deste por terceiros que não sejam os técnicos da NOMEDALOJA, mesmo que para realização de outros serviços; bem como 
a violação do selo/lacre de garantia colocado pela NOMEDALOJA.`;

      const defaultLegalReminders = `Vale lembrar que: 
1) A GARANTIA DE 90 (NOVENTA) dias está de acordo com o artigo 26 inciso II do código de defesa do 
consumidor. 
2) Funcionamento, instalação e atualização de aplicativos, bem como o sistema operacional do aparelho NÃO FAZEM 
parte desta garantia. 
3) Limpeza e conservação do aparelho NÃO FAZEM parte desta garantia. 
4) A não apresentação de documento (nota fiscal ou este termo) que comprove o serviço INVÁLIDA a garantia. 
5) Qualquer mal funcionamento APÓS ATUALIZAÇÕES do sistema operacional ou aplicativos NÃO FAZEM PARTE 
DESSA GARANTIA. 
6) A GARANTIA é válida somente para o item ou serviço descrito na nota fiscal, ordem de serviço ou neste termo 
de garantia, NÃO ABRANGENDO OUTRAS PARTES e respeitando as condições aqui descritas.`;

      const cancellationText = (finalCompanyInfo.warranty_cancellation_terms || defaultCancellationTerms).replace(/NOMEDALOJA/g, finalCompanyInfo.name);
      const remindersText = (finalCompanyInfo.warranty_legal_reminders || defaultLegalReminders).replace(/NOMEDALOJA/g, finalCompanyInfo.name);
      
      // Calcular número de linhas necessárias para estimar espaço
      const tempDoc = new jsPDF();
      tempDoc.setFontSize(9); // Tamanho menor para cálculo
      const cancellationLines = tempDoc.splitTextToSize(cancellationText, maxWidth);
      const remindersLines = tempDoc.splitTextToSize(remindersText, maxWidth);
      
      // Estimar altura total necessária
      const headerHeight = 25; // Título
      const companyInfoHeight = 35; // Dados da empresa (máximo 4 linhas)
      const sectionTitlesHeight = 20; // 2 títulos de seção
      const contentHeight = (cancellationLines.length + remindersLines.length) * 4; // Espaçamento reduzido
      const totalEstimatedHeight = headerHeight + companyInfoHeight + sectionTitlesHeight + contentHeight;
      
      // Ajustar tamanhos de fonte dinamicamente
      let titleFontSize = 16;
      let sectionFontSize = 11;
      let textFontSize = 8;
      let lineSpacing = 4;
      
      if (totalEstimatedHeight > availableHeight) {
        // Reduzir ainda mais se necessário
        titleFontSize = 14;
        sectionFontSize = 10;
        textFontSize = 7;
        lineSpacing = 3.5;
      }
      
      let yPosition = margin;

      // Cabeçalho
      doc.setFontSize(titleFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('TERMOS DE GARANTIA', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Informações da empresa
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('DADOS DA EMPRESA', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(textFontSize + 1);
      doc.setFont('helvetica', 'normal');
      
      // Nome da empresa
      doc.text(`Empresa: ${finalCompanyInfo.name}`, margin, yPosition);
      yPosition += 6;

      // CNPJ se disponível
      if (finalCompanyInfo.cnpj) {
        doc.text(`CNPJ: ${finalCompanyInfo.cnpj}`, margin, yPosition);
        yPosition += 6;
      }

      // WhatsApp se disponível
      if (finalCompanyInfo.whatsapp_phone) {
        doc.text(`WhatsApp: ${finalCompanyInfo.whatsapp_phone}`, margin, yPosition);
        yPosition += 6;
      }

      yPosition += 8;

      // Termos de cancelamento
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDIÇÕES DE CANCELAMENTO DA GARANTIA', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(textFontSize);
      doc.setFont('helvetica', 'normal');
      
      const finalCancellationLines = doc.splitTextToSize(cancellationText, maxWidth);
      
      for (const line of finalCancellationLines) {
        doc.text(line, margin, yPosition);
        yPosition += lineSpacing;
      }

      yPosition += 6;

      // Lembretes
      doc.setFontSize(sectionFontSize);
      doc.setFont('helvetica', 'bold');
      doc.text('LEMBRETES', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(textFontSize);
      doc.setFont('helvetica', 'normal');
      
      const finalRemindersLines = doc.splitTextToSize(remindersText, maxWidth);
      
      for (const line of finalRemindersLines) {
        // Verificar se ainda há espaço, se não, reduzir ainda mais o espaçamento
        if (yPosition > pageHeight - 20) {
          lineSpacing = Math.max(2.5, lineSpacing - 0.5);
        }
        doc.text(line, margin, yPosition);
        yPosition += lineSpacing;
      }

      // Rodapé com data
      const currentDate = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Documento gerado em: ${currentDate}`, margin, pageHeight - 8);

      // Salvar o PDF
      const fileName = `termos-garantia-${finalCompanyInfo.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;
      doc.save(fileName);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Usa configurações de branding se disponíveis, senão usa dados da empresa
  const themeColor = shareSettings?.theme_color || '#fec832';
  const showLogo = shareSettings?.show_logo ?? true;
  const showCompanyName = shareSettings?.show_company_name ?? true;
  const showWhatsAppButton = shareSettings?.show_whatsapp_button ?? true;
  const customMessage = shareSettings?.custom_message;
  const finalCompanyInfo = brandingInfo || companyInfo;
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{
          borderColor: themeColor
        }}></div>
          <p className="text-muted-foreground">Carregando ordem de serviço...</p>
        </div>
      </div>;
  }
  if (error || !serviceOrder) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-foreground">Erro</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'Ordem de serviço não encontrada'}
            </p>
          </CardContent>
        </Card>
      </div>;
  }

  return <div className="min-h-screen bg-background">
      {/* Company Header */}
      {(showLogo || showCompanyName) && finalCompanyInfo && <div className="bg-card border-b border-border">
          <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center space-x-4">
              {showLogo && finalCompanyInfo.logo_url && <div className="flex-shrink-0">
                  <img src={finalCompanyInfo.logo_url} alt={finalCompanyInfo.name} className="w-16 h-16 object-contain rounded-lg" />
                </div>}
              
              <div className="flex-1">
                {showCompanyName && finalCompanyInfo.name && <h1 className="text-2xl font-bold mb-1" style={{
              color: themeColor
            }}>
                    {finalCompanyInfo.name}
                  </h1>}
                
                {customMessage ? <p className="text-muted-foreground">
                    {customMessage}
                  </p> : <p className="text-muted-foreground">
                    Acompanhe o status do seu reparo
                  </p>}
              </div>
            </div>
          </div>
        </div>}

      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl" style={{
            backgroundColor: themeColor + '20'
          }}>
              <Building2 className="w-6 h-6" style={{
              color: themeColor
            }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {serviceOrder.formatted_id || `OS: ${serviceOrder.sequential_number?.toString().padStart(4, '0') || serviceOrder.id.slice(-8)}`}
              </h1>
              <p className="text-muted-foreground">
                Ordem de Serviço
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
          </div>
        </div>

        {/* Main Content Grid - Improved Layout */}
        <div className="space-y-8">
          {/* Enhanced Timeline - Full Width */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {['opened', 'in_progress', 'completed', 'delivered'].map((status, index) => {
                    const config = getStatusInfo(status);
                    const currentStatusInfo = getStatusInfo(serviceOrder.status);
                    const currentStep = currentStatusInfo.step;
                    const isActive = serviceOrder.status === status;
                    const isCompleted = config.step <= currentStep && currentStep > 0 && !isActive;
                    const isPending = config.step > currentStep;
                    const StatusIconComponent = config.icon;
                    
                    return (
                      <React.Fragment key={status}>
                        <Badge 
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium transition-all duration-300",
                            isActive && "text-white hover:scale-105 hover:shadow-lg",
                            isCompleted && "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
                            isPending && "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                          )}
                          style={isActive ? {
                            background: `linear-gradient(135deg, ${config.color}, ${config.color}dd)`,
                            boxShadow: `${config.color}30 0px 2px 8px, ${config.color}20 0px 1px 3px`,
                            border: `1px solid ${config.color}40`
                          } : {}}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <StatusIconComponent className="w-3 h-3 mr-1" />
                          )}
                          <span className="hidden sm:inline">{config.label}</span>
                          <span className="sm:hidden">{config.label.split(' ')[0]}</span>
                        </Badge>
                        {index < 3 && (
                          <div className={cn(
                            "hidden sm:block w-2 h-0.5 transition-colors duration-300",
                            config.step <= currentStep ? "bg-green-400" : "bg-gray-300 dark:bg-gray-600"
                          )} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Quick Info Cards - Improved Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">


            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg" style={{
                  backgroundColor: `${getPaymentStatusInfo(serviceOrder.is_paid).color}20`
                }}>
                    {React.createElement(getPaymentStatusInfo(serviceOrder.is_paid).icon, {
                      className: "w-5 h-5",
                      style: { color: getPaymentStatusInfo(serviceOrder.is_paid).color }
                    })}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Status de Pagamento</p>
                    <p className="font-semibold text-foreground">{getPaymentStatusInfo(serviceOrder.is_paid).label}</p>
                  </div>
                  {serviceOrder.total_price && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-semibold text-foreground">
                        {new Intl.NumberFormat('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        }).format(serviceOrder.total_price)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {serviceOrder.estimated_completion && (
              <Card className="border-border hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg" style={{
                    backgroundColor: `${themeColor}20`
                  }}>
                      <Calendar className="w-5 h-5" style={{
                      color: themeColor
                    }} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previsão de Conclusão</p>
                      <p className="font-semibold text-foreground">
                        {formatDateTime(serviceOrder.estimated_completion)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Cards - Improved Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Device Information */}
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Smartphone className="w-5 h-5" />
                  <span>Informações do Dispositivo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Modelo do Dispositivo</p>
                  <p className="font-semibold text-foreground">{serviceOrder.device_model}</p>
                </div>
                
                {serviceOrder.imei_serial && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <Hash className="w-4 h-4 mr-1" />
                        Número de Série/IMEI
                      </p>
                      <p className="font-semibold text-foreground font-mono">{serviceOrder.imei_serial}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Device Password Section - Only show if password data exists */}
            {serviceOrder.device_password_type && (
              <Card className="border-border hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-6">
                  <DevicePasswordDisplay
                    value={{
                      type: serviceOrder.device_password_type,
                      value: serviceOrder.device_password_value || '',
                      metadata: serviceOrder.device_password_metadata
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Important Dates */}
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Calendar className="w-5 h-5" />
                  <span>Datas Importantes</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviceOrder.entry_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Entrada</p>
                    <p className="font-semibold text-foreground">{formatDateTime(serviceOrder.entry_date)}</p>
                  </div>
                )}
                
                {serviceOrder.entry_date && serviceOrder.exit_date && <Separator />}
                
                {serviceOrder.exit_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Saída</p>
                    <p className="font-semibold text-foreground">{formatDateTime(serviceOrder.exit_date)}</p>
                  </div>
                )}
                
                {(serviceOrder.exit_date || serviceOrder.entry_date) && serviceOrder.delivery_date && <Separator />}
                
                {serviceOrder.delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Entrega</p>
                    <p className="font-semibold text-foreground">{formatDateOnly(serviceOrder.delivery_date)}</p>
                  </div>
                )}
              </CardContent>
            </Card>


          </div>

          {/* Service Information - Full Width */}
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Wrench className="w-5 h-5" />
                <span>Informações do Serviço</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Problema Relatado */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Problema Relatado</p>
                <p className="text-foreground leading-relaxed font-medium">{serviceOrder.reported_issue}</p>
              </div>

              <Separator />

              {/* Grid com informações do serviço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {/* Valor Total */}
                {serviceOrder.total_price && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                    <p className="font-semibold text-foreground text-lg">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(serviceOrder.total_price)}
                    </p>
                  </div>
                )}

                {/* Status do Pagamento */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status do Pagamento</p>
                  <Badge 
                    variant={serviceOrder.is_paid ? "default" : "secondary"}
                    className={serviceOrder.is_paid ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}
                  >
                    {serviceOrder.is_paid ? "Pago" : "Pendente"}
                  </Badge>
                </div>

                {/* Garantia */}
                {serviceOrder.warranty_months && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Garantia</p>
                    <p className="font-semibold text-foreground flex items-center">
                      <Shield className="w-4 h-4 mr-1" />
                      {serviceOrder.warranty_months} {serviceOrder.warranty_months === 1 ? 'mês' : 'meses'}
                    </p>
                  </div>
                )}

                {/* Data de Entrega */}
                {serviceOrder.delivery_date && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Entrega</p>
                    <p className="font-semibold text-foreground flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDateOnly(serviceOrder.delivery_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Observações Adicionais */}
              {serviceOrder.customer_notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações Adicionais</p>
                    <p className="text-foreground leading-relaxed">{serviceOrder.customer_notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Device Checklist - Tabbed Display */}
          {serviceOrder.device_checklist && (
            <TabbedDeviceChecklist 
              data={serviceOrder.device_checklist}
            />
          )}

          {/* Images Section */}
          {images.length > 0 && (
            <Card className="border-border hover:shadow-md transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-foreground">
                  <Image className="w-5 h-5" />
                  <span>Imagens do Dispositivo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                      <img
                        src={image.uploadthing_url}
                        alt={image.file_name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Company Contact Info - Full Width */}
        {finalCompanyInfo && (
          <Card className="border-border hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Building2 className="w-5 h-5" />
                <span>Contato</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Empresa</p>
                <p className="font-semibold text-foreground">{finalCompanyInfo.name}</p>
              </div>
              
              {finalCompanyInfo.whatsapp_phone && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      WhatsApp
                    </p>
                    <Button variant="outline" size="sm" onClick={handleWhatsAppContact} className="w-full justify-start">
                      {finalCompanyInfo.whatsapp_phone}
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </>
              )}
              
              {finalCompanyInfo.address && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      Endereço
                    </p>
                    <p className="text-sm text-foreground">{finalCompanyInfo.address}</p>
                  </div>
                </>
              )}
              
              {finalCompanyInfo.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm text-foreground">{finalCompanyInfo.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warranty Terms Button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={generateWarrantyPDF}
            disabled={generatingPDF}
            className="px-6 py-3"
          >
            {generatingPDF ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {generatingPDF ? 'Gerando...' : 'Baixar Termos de Garantia'}
          </Button>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-border text-center">
          
          {finalCompanyInfo?.name && <p className="text-sm text-muted-foreground mt-1">
              © {new Date().getFullYear()} {finalCompanyInfo.name}
            </p>}
        </div>
      </div>
    </div>;
}