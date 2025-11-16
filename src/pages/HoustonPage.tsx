import React from 'react';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { AlertTriangle, Clock, Wrench, CheckCircle, RefreshCw, Shield, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const HoustonPage: React.FC = () => {
  const { systemStatus, loading, isMaintenanceMode } = useMaintenanceMode();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Se não está em modo de manutenção e não há problemas, redirecionar
  React.useEffect(() => {
    if (!loading && !isMaintenanceMode && (!systemStatus || systemStatus.status === 'maintenance')) {
      navigate('/', { replace: true });
    }
  }, [loading, isMaintenanceMode, systemStatus, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Verificando status do sistema...</p>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (!systemStatus) return <Wrench className="h-12 w-12 text-primary" />;
    
    switch (systemStatus.status) {
      case 'maintenance':
        return <Wrench className="h-12 w-12 text-primary" />;
      case 'error':
        return <AlertTriangle className="h-12 w-12 text-destructive" />;
      default:
        return <CheckCircle className="h-12 w-12 text-success" />;
    }
  };

  const getStatusVariant = () => {
    if (!systemStatus) return 'default';
    
    switch (systemStatus.status) {
      case 'maintenance':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = () => {
    if (!systemStatus) return 'Sistema em Manutenção';
    
    switch (systemStatus.status) {
      case 'maintenance':
        return 'Sistema em Manutenção';
      case 'error':
        return 'Problema no Sistema';
      default:
        return 'Sistema Operacional';
    }
  };

  const formatEstimatedResolution = (estimatedResolution: string | null) => {
    if (!estimatedResolution) return 'Não informado';
    
    try {
      const date = new Date(estimatedResolution);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return estimatedResolution;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-fade-in-up">
        {/* Header com logo/título */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
              {getStatusIcon()}
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Houston, I have a problem</h1>
          <p className="text-muted-foreground text-lg">Sistema de Status em Tempo Real</p>
        </div>

        {/* Card principal de status */}
        <Card className="card-premium">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <Badge 
                variant={getStatusVariant()}
                className="px-4 py-2 text-lg font-semibold"
              >
                {getStatusText()}
              </Badge>
            </div>
            <CardTitle className="text-2xl text-foreground leading-relaxed">
              {systemStatus?.message || 'Estamos trabalhando para resolver os problemas técnicos.'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações de tempo */}
            {systemStatus?.estimated_resolution && (
              <div className="flex items-center justify-center space-x-3 p-4 bg-muted/30 rounded-xl">
                <Clock className="h-5 w-5 text-primary" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Previsão de Resolução</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatEstimatedResolution(systemStatus.estimated_resolution)}
                  </p>
                </div>
              </div>
            )}

            {/* Mensagem adicional */}
            <div className="text-center text-muted-foreground space-y-2 px-4">
              <p>
                Nosso time está trabalhando para resolver esta situação o mais rápido possível.
              </p>
              <p className="text-sm">
                Agradecemos sua paciência e compreensão.
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button 
                onClick={() => navigate('/dashboard')} 
                variant="outline"
                className="flex items-center gap-2 border-green-600 text-green-600 hover:bg-green-50"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar Status
              </Button>
              
              {profile?.role === 'admin' && (
                <Button 
                  onClick={() => navigate('/problem')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Painel Administrativo
                </Button>
              )}
              
              <Button 
                onClick={() => navigate('/auth')} 
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Fazer Login
              </Button>
            </div>

            {/* Informações de contato */}
            <div className="text-center text-sm text-muted-foreground border-t border-border pt-6 space-y-3">
              <p>Para emergências, entre em contato conosco:</p>
              <div className="space-y-2">
                <p className="font-semibold text-foreground">suporte@onedrip.com.br</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://wa.me/5564996028022', '_blank')}
                  className="flex items-center gap-2 mx-auto"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787"/>
                  </svg>
                  WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm space-y-1">
          <p>© 2025 OneDrip - Sistema de Gestão</p>
          {systemStatus?.updated_at && (
            <p>
              Última atualização: {new Date(systemStatus.updated_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoustonPage;