import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import { useTrialLicense } from '@/hooks/useTrialLicense';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Lock, Clock, Search, Wifi, WifiOff, Gift, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LicenseGuardProps {
  children: React.ReactNode;
  requiresLicense?: boolean;
  fallbackPath?: string;
  showMessage?: boolean;
}

interface LicenseBlockedMessageProps {
  title: string;
  message: string;
  icon: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  showTrialOption?: boolean;
  canCreateTrial?: boolean;
  onCreateTrial?: () => void;
}

function OfflineStatusBanner({ isUsingCache }: { isUsingCache: boolean }) {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <WifiOff className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            {isUsingCache 
              ? "Modo offline - usando licença em cache" 
              : "Sem conexão com a internet"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

function LicenseStatusBanner({ 
  licenseType, 
  daysRemaining, 
  isTrial 
}: { 
  licenseType?: string;
  daysRemaining?: number;
  isTrial?: boolean;
}) {
  if (!licenseType || daysRemaining === undefined) return null;

  const isExpiringSoon = daysRemaining <= 7;
  const bgColor = isTrial 
    ? 'bg-blue-50 border-blue-200' 
    : isExpiringSoon 
      ? 'bg-orange-50 border-orange-200' 
      : 'bg-green-50 border-green-200';
  
  const textColor = isTrial 
    ? 'text-blue-700' 
    : isExpiringSoon 
      ? 'text-orange-700' 
      : 'text-green-700';

  return (
    <div className={`${bgColor} border-l-4 p-4 mb-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isTrial ? (
              <Gift className={`h-5 w-5 ${textColor}`} />
            ) : (
              <Zap className={`h-5 w-5 ${textColor}`} />
            )}
          </div>
          <div className="ml-3">
            <p className={`text-sm ${textColor}`}>
              {isTrial ? (
                <>Licença de teste ativa - {daysRemaining} dias restantes</>
              ) : (
                <>Licença {licenseType} - {daysRemaining} dias restantes</>
              )}
            </p>
          </div>
        </div>
        <Badge variant={isTrial ? "secondary" : isExpiringSoon ? "destructive" : "default"}>
          {isTrial ? "TESTE" : licenseType}
        </Badge>
      </div>
    </div>
  );
}

function LicenseBlockedMessage({ 
  title, 
  message, 
  icon, 
  actionText, 
  onAction,
  showTrialOption = false,
  canCreateTrial = false,
  onCreateTrial
}: LicenseBlockedMessageProps) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>
        
        {/* Opção de criar licença de teste */}
        {showTrialOption && canCreateTrial && onCreateTrial && (
          <Button
            onClick={onCreateTrial}
            className="w-full mb-3 bg-blue-600 hover:bg-blue-700"
          >
            <Gift className="w-4 h-4 mr-2" />
            Criar Licença de Teste (7 dias grátis)
          </Button>
        )}
        
        {actionText && onAction && (
          <Button
            onClick={onAction}
            variant="outline"
            className="w-full mb-3"
          >
            {actionText}
          </Button>
        )}
        
        <Button
          onClick={() => navigate('/verify-licenca')}
          variant="outline"
          className="w-full mb-4"
        >
          <Search className="w-4 h-4 mr-2" />
          Verificar Licença
        </Button>
        
        <div className="mt-4">
          <button
            onClick={() => window.location.href = '/licenca'}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Gerenciar Licença
          </button>
        </div>
      </div>
    </div>
  );
}

export function LicenseGuard({ 
  children, 
  requiresLicense = true, 
  fallbackPath = '/licenca',
  showMessage = true 
}: LicenseGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { 
    licenseStatus, 
    isLoading: licenseLoading, 
    hasValidLicense, 
    isExpired, 
    needsActivation, 
    isOffline, 
    isUsingCache,
    licenseType,
    daysRemaining,
    isTrial,
    canCreateTrial
  } = useLicense();
  
  const { createTrialLicense, isLoading: trialLoading } = useTrialLicense();
  const location = useLocation();

  // Se não requer licença, renderiza o conteúdo
  if (!requiresLicense) {
    return <>{children}</>;
  }

  // Loading states
  if (authLoading || licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se tem licença válida, renderiza o conteúdo (com banners informativos se necessário)
  if (hasValidLicense) {
    return (
      <>
        {isOffline && <OfflineStatusBanner isUsingCache={isUsingCache} />}
        <LicenseStatusBanner 
          licenseType={licenseType}
          daysRemaining={daysRemaining}
          isTrial={isTrial}
        />
        {children}
      </>
    );
  }

  // Se está offline sem cache válido, mostra mensagem específica
  if (isOffline && !hasValidLicense) {
    if (!showMessage) {
      return <Navigate to={fallbackPath} replace />;
    }
    
    return (
      <LicenseBlockedMessage
        title="Sem Conexão"
        message="Você está offline e não possui uma licença válida em cache. Conecte-se à internet para verificar sua licença."
        icon={<WifiOff className="w-8 h-8 text-orange-600" />}
        actionText="Tentar Novamente"
        onAction={() => window.location.reload()}
      />
    );
  }

  // Se não deve mostrar mensagem, apenas redireciona
  if (!showMessage) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Função para criar licença de teste
  const handleCreateTrial = async () => {
    try {
      await createTrialLicense();
      window.location.reload(); // Recarrega para atualizar o status da licença
    } catch (error) {
      console.error('Erro ao criar licença de teste:', error);
    }
  };

  // Determina qual mensagem mostrar baseado no status da licença
  if (needsActivation) {
    return (
      <LicenseBlockedMessage
        title="Licença Necessária"
        message="Para acessar esta funcionalidade, você precisa ativar uma licença válida. Você pode começar com uma licença de teste gratuita de 7 dias."
        icon={<Lock className="w-8 h-8 text-red-600" />}
        actionText="Ativar Licença"
        onAction={() => window.location.href = '/licenca'}
        showTrialOption={true}
        canCreateTrial={canCreateTrial && !trialLoading}
        onCreateTrial={handleCreateTrial}
      />
    );
  }

  if (isExpired) {
    const isTrialExpired = isTrial;
    
    return (
      <LicenseBlockedMessage
        title={isTrialExpired ? "Licença de Teste Expirada" : "Licença Expirada"}
        message={
          isTrialExpired 
            ? "Sua licença de teste de 7 dias expirou. Para continuar usando o sistema, você precisa ativar uma licença completa."
            : "Sua licença expirou e precisa ser renovada para continuar acessando esta funcionalidade. Entre em contato conosco para renovar."
        }
        icon={<Clock className="w-8 h-8 text-red-600" />}
        actionText={isTrialExpired ? "Ativar Licença Completa" : "Renovar Licença"}
        onAction={() => window.location.href = '/licenca'}
        showTrialOption={!isTrialExpired && canCreateTrial}
        canCreateTrial={!isTrialExpired && canCreateTrial && !trialLoading}
        onCreateTrial={!isTrialExpired ? handleCreateTrial : undefined}
      />
    );
  }

  // Caso geral - licença inválida
  return (
    <LicenseBlockedMessage
      title="Acesso Restrito"
      message={
        licenseStatus?.message || 
        "Você não possui uma licença válida para acessar esta funcionalidade. Comece com uma licença de teste gratuita!"
      }
      icon={<AlertTriangle className="w-8 h-8 text-red-600" />}
      actionText="Verificar Licença"
      onAction={() => window.location.href = '/licenca'}
      showTrialOption={true}
      canCreateTrial={canCreateTrial && !trialLoading}
      onCreateTrial={handleCreateTrial}
    />
  );
}

export default LicenseGuard;