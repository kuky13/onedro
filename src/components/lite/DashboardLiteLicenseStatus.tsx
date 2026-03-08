import { useState } from 'react';
import { HeartCrack, AlertTriangle, Key, Calendar, Clock, Shield, Copy, Eye, EyeOff, LifeBuoy, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import { useToast } from '@/hooks/useToast';

export const DashboardLiteLicenseStatus = () => {
  const [showLicenseCode, setShowLicenseCode] = useState(false);
  const navigate = useNavigate();
  const { licenseStatus, isLoading, daysUntilExpiry, isTrial } = useLicense();
  const { showSuccess, showError } = useToast();

  if (!licenseStatus && !isLoading) return null;

  const remainingDays = daysUntilExpiry || 0;
  const expirationDate = licenseStatus?.expires_at ? new Date(licenseStatus.expires_at) : null;
  const needsActivation = licenseStatus && !licenseStatus.activated_at;
  const isExpired = remainingDays <= 0;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess({ title: 'Código copiado!', description: 'Copiado para a área de transferência.' });
    } catch {
      showError({ title: 'Erro ao copiar', description: 'Tente novamente.' });
    }
  };

  const getStatus = () => {
    if (isTrial) return {
      title: 'Teste Grátis Ativo',
      description: `Período de teste gratuito. ${remainingDays > 0 ? `Restam ${remainingDays} dias.` : 'Período expirado.'}`,
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      accentClass: 'border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      showPlans: true, showActivate: false, showSubscribe: true,
    };
    if (needsActivation) return {
      title: 'Licença Precisa ser Ativada',
      description: 'Ative sua licença para ter acesso completo.',
      icon: <Key className="h-5 w-5 text-yellow-500" />,
      accentClass: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/10',
      showPlans: false, showActivate: true, showSubscribe: false,
    };
    if (isExpired) return {
      title: 'Licença Expirada',
      description: 'Renove agora para continuar usando o sistema.',
      icon: <HeartCrack className="h-5 w-5 text-destructive" />,
      accentClass: 'border-destructive/30',
      iconBg: 'bg-destructive/10',
      showPlans: true, showActivate: false, showSubscribe: false,
    };
    if (remainingDays <= 1) return {
      title: `Urgente: expira ${remainingDays === 1 ? 'amanhã' : 'hoje'}!`,
      description: 'Renove agora para não perder o acesso.',
      icon: <HeartCrack className="h-5 w-5 text-destructive" />,
      accentClass: 'border-destructive/50',
      iconBg: 'bg-destructive/10',
      showPlans: true, showActivate: false, showSubscribe: false,
    };
    if (remainingDays <= 10) return {
      title: 'Licença Expirando',
      description: `Expira em ${remainingDays} dias. Renove a qualquer momento.`,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
      accentClass: 'border-yellow-500/30',
      iconBg: 'bg-yellow-500/10',
      showPlans: true, showActivate: false, showSubscribe: false,
    };
    return {
      title: 'Licença Ativa',
      description: `Expira em ${remainingDays} dias.`,
      icon: <Shield className="h-5 w-5 text-primary" />,
      accentClass: 'border-primary/20',
      iconBg: 'bg-primary/10',
      showPlans: true, showActivate: false, showSubscribe: false,
    };
  };

  const status = getStatus();

  return (
    <div className={`rounded-2xl border ${status.accentClass} bg-card p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${status.iconBg} flex items-center justify-center flex-shrink-0`}>
            {status.icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{status.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{status.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/suporte')}
            className="h-9 px-3 rounded-xl border border-border/60 bg-background/70 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            title="Suporte"
          >
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Suporte</span>
          </button>
          <button
            onClick={() => navigate('/central-de-ajuda')}
            className="h-9 px-3 rounded-xl border border-border/60 bg-background/70 flex items-center gap-2 hover:bg-muted/50 transition-colors"
            title="Central de ajuda"
          >
            <LifeBuoy className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Ajuda</span>
          </button>
        </div>
      </div>

      {/* License details */}
      <div className="space-y-2">
        {expirationDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Expira: {expirationDate.toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {licenseStatus?.license_code && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Código:</span>
            <div className="flex-1 bg-muted/20 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-foreground">
                {showLicenseCode ? licenseStatus.license_code : '••••••••••••'}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowLicenseCode(!showLicenseCode)}
                  className="w-6 h-6 rounded-lg border border-border/60 bg-background/80 flex items-center justify-center hover:bg-muted/50 transition-colors"
                >
                  {showLicenseCode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
                <button
                  onClick={() => copyToClipboard(licenseStatus.license_code)}
                  className="w-6 h-6 rounded-lg bg-primary/90 text-primary-foreground flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {licenseStatus?.activated_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Ativada: {new Date(licenseStatus.activated_at).toLocaleDateString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {status.showPlans && (
          <button
            onClick={() => navigate('/plans')}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Shield className="h-3.5 w-3.5" />
            Planos
          </button>
        )}
        <button
          onClick={() => navigate('/verify-licenca')}
          className="flex-1 border border-border/60 bg-background hover:bg-muted/50 text-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          Licença
        </button>
      </div>

      {status.showActivate && (
        <button
          onClick={() => (window.location.href = '/licenca')}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Key className="h-3.5 w-3.5" />
          Ativar Licença
        </button>
      )}

      {status.showSubscribe && (
        <button
          onClick={() => navigate('/plans/m')}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground py-2.5 px-4 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <Clock className="h-3.5 w-3.5" />
          Assinar Agora
        </button>
      )}
    </div>
  );
};
