import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  AlertCircle, 
  ArrowLeft,
  Share2,
  Download,
  Eye,
  Building2
} from 'lucide-react';
import { useServiceOrderShare } from '@/hooks/useServiceOrderShare';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ServiceOrder {
  id: string;
  formatted_id: string;
  device_type: string;
  device_model: string;
  reported_issue: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const defaultStatusConfig = {
  pending: { label: 'Pendente', color: '#6B7280', icon: 'Clock' },
  opened: { label: 'Aberto', color: '#EF4444', icon: 'Clock' },
  in_progress: { label: 'Em Andamento', color: '#fec832', icon: 'Settings' },
  completed: { label: 'Concluído', color: '#10B981', icon: 'CheckCircle' },
  delivered: { label: 'Entregue', color: '#fec832', icon: 'CheckCircle' },
  cancelled: { label: 'Cancelado', color: '#EF4444', icon: 'X' }
};

export function EnhancedSharePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loadShareData, isLoading: shareLoading } = useServiceOrderShare();
  const { companyInfo, shareSettings, loading: brandingLoading } = useCompanyBranding();

  
  const [serviceOrder, setServiceOrder] = useState<ServiceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadServiceOrder();
    }
  }, [token]);

  const loadServiceOrder = async () => {
    if (!token) {
      console.log('🚫 [DEBUG] Token não fornecido');
      setError('Token de compartilhamento não fornecido');
      setLoading(false);
      return;
    }
    
    console.log('🚀 [DEBUG] Iniciando carregamento da ordem de serviço');
    console.log('🔑 [DEBUG] Token recebido:', token);
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📞 [DEBUG] Chamando loadShareData...');
      const { serviceOrder: order, companyInfo: companyData } = await loadShareData(token);
      console.log('📋 [DEBUG] Resultado da busca:', { order, companyData });
      
      if (order) {
        console.log('✅ [DEBUG] Ordem encontrada, atualizando estado');
        setServiceOrder(order as ServiceOrder);
      } else {
        console.log('❌ [DEBUG] Ordem não encontrada');
        setError('Ordem de serviço não encontrada ou token inválido');
      }
    } catch (err) {
      console.error('💥 [DEBUG] Erro ao carregar ordem de serviço:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar ordem de serviço';
      setError(errorMessage);
    } finally {
      console.log('🏁 [DEBUG] Finalizando carregamento');
      setLoading(false);
    }
  };



  const getStatusDisplay = (status: string) => {
    return defaultStatusConfig[status as keyof typeof defaultStatusConfig] || {
      label: status,
      color: '#6B7280',
      icon: 'AlertCircle'
    };
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const themeColor = shareSettings?.theme_color || '#fec832';
  const showCompanyHeader = shareSettings?.show_logo || shareSettings?.show_company_name;

  if (loading || shareLoading || brandingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando ordem de serviço...</p>
        </div>
      </div>
    );
  }

  if (error || !serviceOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erro</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Ordem de serviço não encontrada'}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(serviceOrder.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Company Header */}
      {showCompanyHeader && companyInfo && (
        <div className="bg-white border-b" style={{ borderColor: themeColor + '20' }}>
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center space-x-4">
              {shareSettings?.show_logo && companyInfo.logo_url && (
                <img
                  src={companyInfo.logo_url}
                  alt={companyInfo.name}
                  className="w-12 h-12 object-contain"
                />
              )}
              
              <div className="flex-1">
                {shareSettings?.show_company_name && companyInfo.name && (
                  <h1 className="text-xl font-bold" style={{ color: themeColor }}>
                    {companyInfo.name}
                  </h1>
                )}
                
                {shareSettings?.custom_message && (
                  <p className="text-gray-600 text-sm mt-1">
                    {shareSettings.custom_message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className="p-3 rounded-xl"
              style={{ backgroundColor: themeColor + '20' }}
            >
              <Eye className="w-6 h-6" style={{ color: themeColor }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {serviceOrder.formatted_id}
              </h1>
              <p className="text-gray-600">
                Ordem de Serviço Compartilhada
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">

            
            <Button
              variant="outline"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Information */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Status da Ordem</span>
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: statusDisplay.color }}
                  >
                    {statusDisplay.label}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Criado em</p>
                    <p className="font-semibold">{formatDateTime(serviceOrder.created_at)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Última atualização</p>
                    <p className="font-semibold">{formatDateTime(serviceOrder.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Equipamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Tipo de Equipamento</p>
                  <p className="font-semibold">{serviceOrder.device_type}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Modelo</p>
                  <p className="font-semibold">{serviceOrder.device_model}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Problema Relatado</p>
                  <p className="text-gray-900">{serviceOrder.reported_issue}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    const shareData = {
                      title: `Ordem de Serviço ${serviceOrder.formatted_id}`,
                      text: `${serviceOrder.device_type} ${serviceOrder.device_model} - ${serviceOrder.reported_issue}`,
                      url: window.location.href
                    };
                    
                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copiado!');
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </Button>

                {companyInfo?.whatsapp_phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      const message = `Olá! Gostaria de saber sobre o status da ordem de serviço ${serviceOrder.formatted_id} (${serviceOrder.device_type} ${serviceOrder.device_model})`;
                      const encodedMessage = encodeURIComponent(message);
                      const whatsappUrl = `https://wa.me/55${companyInfo.whatsapp_phone?.replace(/\D/g, '')}?text=${encodedMessage}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Entrar em Contato
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Company Information */}
            {companyInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5" />
                    <span>Informações da Empresa</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nome</p>
                    <p className="font-semibold">{companyInfo.name}</p>
                  </div>
                  
                  {companyInfo.address && (
                    <div>
                      <p className="text-sm text-gray-600">Endereço</p>
                      <p className="text-sm">{companyInfo.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Ordem de serviço gerada em {formatDateTime(serviceOrder.created_at)}
          </p>
          {companyInfo?.name && (
            <p className="mt-1">
              © {new Date().getFullYear()} {companyInfo.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}