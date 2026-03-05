import { useState } from 'react';
import { HeartCrack, AlertTriangle, Key, Calendar, Clock, Shield, Copy, Eye, EyeOff, LifeBuoy, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLicense } from '@/hooks/useLicense';
import { useToast } from '@/hooks/useToast';

export const DashboardLiteLicenseStatus = () => {
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const navigate = useNavigate();

  const {
    licenseStatus,
    isLoading,
    daysUntilExpiry,
    isTrial
  } = useLicense();

  // Use license status from the new hook
  if (!licenseStatus && !isLoading) {
    return null;
  }

  // Always show license status information

  // Calculate remaining days using the new hook data
  const remainingDays = daysUntilExpiry || 0;
  const expirationDate = licenseStatus?.expires_at ? new Date(licenseStatus.expires_at) : null;
  
  // Define helper variables
  const needsActivation = licenseStatus && !licenseStatus.activated_at;
  const isExpired = remainingDays <= 0;

  const { showSuccess, showError } = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess({
        title: 'Código copiado!',
        description: 'O código da licença foi copiado para a área de transferência.'
      });
    } catch (err) {
      console.error('Falha ao copiar:', err);
      showError({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código. Tente novamente.'
      });
    }
  };

  const handlePlansClick = () => {
    navigate('/plans');
  };

  const handleHelpClick = () => {
    navigate('/central-de-ajuda');
  };

  const getStatus = () => {
    // Prioridade para licenças TRIAL
    if (isTrial) {
      return {
        title: 'Teste Grátis Ativo',
        description: `Você está usando o período de teste gratuito. ${
          remainingDays > 0 ? `Restam ${remainingDays} dias.` : 'Período expirado.'
        } Você pode comprar uma licença agora para garantir acesso contínuo após o término do teste.`,
        icon: <Clock className="h-6 w-6 text-blue-500" />,
        cardClass: 'border-blue-500/30 bg-blue-500/10',
        showRenew: false,
        showActivate: false,
        showSubscribe: true,
        showPlans: true
      };
    }

    if (needsActivation) {
      return {
        title: 'Licença Precisa ser Ativada',
        description: 'Ative sua licença para ter acesso completo ao sistema.',
        icon: <Key className="h-6 w-6 text-yellow-500" />,
        cardClass: 'border-yellow-500/30 bg-yellow-500/10',
        showRenew: false,
        showActivate: true,
        showPlans: false
      };
    }

    if (isExpired) {
      return {
        title: 'Licença Expirada',
        description:
          'Sua licença expirou. Renove agora para continuar usando o sistema. Ao pagar, adicionaremos os dias à sua licença.',
        icon: <HeartCrack className="h-6 w-6 text-red-500" />,
        cardClass: 'border-red-500/30 bg-red-500/10',
        showRenew: false,
        showActivate: false,
        showPlans: true
      };
    }

    if (remainingDays <= 1) {
      const dayText = remainingDays === 1 ? 'amanhã' : 'hoje';
      return {
        title: `Urgente: Sua licença expira ${dayText}!`,
        description:
          'Renove agora para não perder o acesso. Ao pagar, adicionaremos os dias à sua licença atual.',
        icon: <HeartCrack className="h-6 w-6 text-red-500" />,
        cardClass: 'border-red-500/50 bg-red-500/20',
        showRenew: false,
        showActivate: false,
        showPlans: true
      };
    }

    if (remainingDays <= 5) {
      return {
        title: 'Atenção: Licença Expirando',
        description: `Sua licença expira em ${remainingDays} dias. Renove para não perder o acesso. Ao pagar, adicionaremos os dias à sua licença atual.`,
        icon: <AlertTriangle className="h-6 w-6 text-orange-500" />,
        cardClass: 'border-orange-500/30 bg-orange-500/10',
        showRenew: false,
        showActivate: false,
        showPlans: true
      };
    }

    if (remainingDays <= 10) {
      return {
        title: 'Atenção: Licença Expirando',
        description: `Sua licença expira em ${remainingDays} dias. Você pode renovar a qualquer momento. Ao pagar, adicionaremos os dias à sua licença atual.`,
        icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
        cardClass: 'border-yellow-500/30 bg-yellow-500/10',
        showRenew: false,
        showActivate: false,
        showPlans: true
      };
    }

    return {
      title: 'Licença Ativa',
      description: `Sua licença expira em ${remainingDays} dias. Você pode renovar a qualquer momento. Ao pagar, adicionaremos os dias à sua licença atual.`,
      icon: <Shield className="h-6 w-6 text-green-500" />,
      cardClass: 'border-green-500/20 bg-green-500/10',
      showRenew: false,
      showActivate: false,
      showPlans: true
    };
  };

  const status = getStatus();

  return (
    <div className={`bg-card border rounded-lg p-4 mb-4 ${status.cardClass}`}>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          {status.icon}
          <h3 className="text-lg font-semibold text-foreground">{status.title}</h3>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleHelpClick}
          className="shrink-0 rounded-full border-border/60 bg-background/70 px-4 backdrop-blur-sm"
        >
          <LifeBuoy className="h-4 w-4" />
          Central de ajuda
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{status.description}</p>

      {/* Informações detalhadas da licença */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {expirationDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Expira: {expirationDate.toLocaleDateString('pt-BR')}</span>
            </div>
          )}

          {licenseStatus?.license_code && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
              <Key className="h-4 w-4" />
              <span>Código:</span>
              <div className="bg-muted/30 rounded-lg p-2 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-mono text-card-foreground">
                      {showLicenseCode ? licenseStatus.license_code : '••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowLicenseCode(!showLicenseCode)}
                      className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-[10px] font-medium text-primary shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                      title={showLicenseCode ? 'Ocultar código' : 'Mostrar código'}
                      aria-label={showLicenseCode ? 'Ocultar código da licença' : 'Mostrar código da licença'}
                    >
                      {showLicenseCode ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(licenseStatus.license_code)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-primary/90 text-[10px] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                      title="Copiar código"
                      aria-label="Copiar código da licença para a área de transferência"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {licenseStatus?.activated_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
              <Shield className="h-4 w-4" />
              <span>
                Ativada em: {new Date(licenseStatus.activated_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Bloco de validação da licença removido conforme solicitação */}
      </div>

      <div className="space-y-2">
        <div className={`grid grid-cols-1 gap-2 ${status.showPlans ? 'sm:grid-cols-2' : ''}`}>
          {status.showPlans && (
            <button
              onClick={handlePlansClick}
              className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Planos
            </button>
          )}
          <button
            onClick={() => navigate('/verify-licenca')}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Search className="h-4 w-4" />
            Licença
          </button>
        </div>

        {status.showActivate && (
          <button
            onClick={() => (window.location.href = '/licenca')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2"
          >
            <Key className="h-4 w-4" />
            Ativar Licença
          </button>
        )}

        {status.showSubscribe && (
          <button
            onClick={() => navigate('/plans/m')}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
          >
            <Clock className="h-4 w-4" />
            Assinar Agora
          </button>
        )}
      </div>
    </div>
  );
};
