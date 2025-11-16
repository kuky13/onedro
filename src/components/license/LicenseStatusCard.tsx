import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Clock, CheckCircle, AlertTriangle, XCircle, MessageCircle, Gift, Zap, RefreshCw } from 'lucide-react';
import { useLicense } from '@/hooks/useLicense';
import { useTrialLicense } from '@/hooks/useTrialLicense';
import { Skeleton } from '@/components/ui/skeleton';

interface LicenseStatusCardProps {
  onSupportClick?: () => void;
}

export const LicenseStatusCard = ({ onSupportClick }: LicenseStatusCardProps) => {
  const { user } = useAuth();
  const { 
    licenseStatus, 
    isLoading, 
    hasValidLicense, 
    isExpired, 
    needsActivation, 
    isTrial, 
    isLegacy, 
    daysGranted, 
    daysRemaining, 
    canCreateTrial,
    refreshLicense 
  } = useLicense();
  
  const { createTrialLicense, isLoading: isCreatingTrial } = useTrialLicense();

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent('Olá! Preciso de ajuda com minha licença do OneDrip.');
    const whatsappUrl = `https://wa.me/556496028022?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCreateTrial = async () => {
    if (!user?.id) return;
    
    try {
      await createTrialLicense(user.id);
      await refreshLicense();
    } catch (error) {
      console.error('Erro ao criar licença de teste:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            Status da Licença
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Sem licença
  if (needsActivation || !hasValidLicense) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-300">
            <XCircle className="h-5 w-5" />
            Licença Necessária
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="destructive" className="w-fit">
            Sem Licença
          </Badge>
          <p className="text-sm text-red-600 dark:text-red-400">
            Você precisa de uma licença ativa para usar o sistema.
          </p>
          
          {/* Botão para criar licença de teste se elegível */}
          {canCreateTrial && (
            <Button
              onClick={handleCreateTrial}
              disabled={isCreatingTrial}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mb-2"
            >
              {isCreatingTrial ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Criar Licença de Teste (7 dias)
                </>
              )}
            </Button>
          )}
          
          <Button
            onClick={onSupportClick || handleWhatsAppSupport}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Obter Licença
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Licença expirada
  if (isExpired) {
    return (
      <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-5 w-5" />
            Licença Expirada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Expirada
            </Badge>
            {isTrial && (
              <Badge variant="outline" className="w-fit border-blue-300 text-blue-700">
                <Gift className="mr-1 h-3 w-3" />
                Teste
              </Badge>
            )}
            {isLegacy && (
              <Badge variant="outline" className="w-fit border-gray-300 text-gray-700">
                Legada
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-orange-600 dark:text-orange-400">
            {licenseStatus?.message || 'Sua licença expirou e precisa ser renovada.'}
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Código:</span>
              <span className="font-mono text-xs">
                {licenseStatus?.license_code ? `${licenseStatus.license_code.slice(0, 6)}***` : 'N/A'}
              </span>
            </div>
            {daysGranted && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dias concedidos:</span>
                <span className="font-medium">{daysGranted}</span>
              </div>
            )}
          </div>

          <Button
            onClick={onSupportClick || handleWhatsAppSupport}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Renovar Licença
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Licença válida
  const isExpiringSoon = (daysRemaining || 0) <= 7;
  const expiresAt = licenseStatus?.expires_at ? new Date(licenseStatus.expires_at).toLocaleDateString('pt-BR') : 'Indeterminado';

  return (
    <Card className={`border-border ${
      isTrial 
        ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
        : isExpiringSoon 
          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950' 
          : 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
    }`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-base ${
          isTrial 
            ? 'text-blue-700 dark:text-blue-300'
            : isExpiringSoon 
              ? 'text-yellow-700 dark:text-yellow-300' 
              : 'text-green-700 dark:text-green-300'
        }`}>
          {isTrial ? (
            <Gift className="h-5 w-5" />
          ) : isExpiringSoon ? (
            <Clock className="h-5 w-5" />
          ) : (
            <CheckCircle className="h-5 w-5" />
          )}
          Status da Licença
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isTrial ? "secondary" : isExpiringSoon ? "secondary" : "default"}
              className={`w-fit ${
                isTrial 
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : isExpiringSoon 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {isTrial ? 'Teste Ativo' : isExpiringSoon ? 'Expirando em Breve' : 'Ativa'}
            </Badge>
            
            {isLegacy && (
              <Badge variant="outline" className="w-fit border-gray-300 text-gray-700">
                Legada
              </Badge>
            )}
          </div>
          
          <span className="text-sm text-muted-foreground">
            {daysRemaining || 0} dias restantes
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Código:</span>
            <span className="font-mono text-xs">
              {licenseStatus?.license_code ? `${licenseStatus.license_code.slice(0, 6)}***` : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expira em:</span>
            <span className="font-medium">{expiresAt}</span>
          </div>
          {daysGranted && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dias concedidos:</span>
              <span className="font-medium">{daysGranted}</span>
            </div>
          )}
        </div>

        {/* Mostrar aviso para licenças de teste */}
        {isTrial && (
          <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Gift className="inline h-3 w-3 mr-1" />
              Esta é uma licença de teste. Entre em contato para obter uma licença completa.
            </p>
          </div>
        )}

        {/* Botão de refresh */}
        <Button
          onClick={refreshLicense}
          variant="outline"
          size="sm"
          className="w-full mt-2"
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          Atualizar Status
        </Button>
      </CardContent>
    </Card>
  );
};