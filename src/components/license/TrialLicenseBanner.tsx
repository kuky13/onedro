import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Clock, MessageCircle, Zap, AlertTriangle } from 'lucide-react';
import { useLicense } from '@/hooks/useLicense';
import { useTrialLicense } from '@/hooks/useTrialLicense';

interface TrialLicenseBannerProps {
  onSupportClick?: () => void;
  showCreateButton?: boolean;
}

export const TrialLicenseBanner = ({ 
  onSupportClick, 
  showCreateButton = true 
}: TrialLicenseBannerProps) => {
  const { 
    isTrial, 
    daysRemaining, 
    hasValidLicense, 
    canCreateTrial,
    licenseStatus 
  } = useLicense();
  
  const { createTrialLicense, isLoading: isCreatingTrial } = useTrialLicense();

  const handleWhatsAppSupport = () => {
    const message = encodeURIComponent('Olá! Gostaria de adquirir uma licença completa do OneDrip.');
    const whatsappUrl = `https://wa.me/556496028022?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCreateTrial = async () => {
    try {
      await createTrialLicense();
    } catch (error) {
      console.error('Erro ao criar licença de teste:', error);
    }
  };

  // Banner para licença de teste ativa
  if (isTrial && hasValidLicense) {
    const isExpiringSoon = (daysRemaining || 0) <= 2;
    
    return (
      <Alert className={`${
        isExpiringSoon 
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950' 
          : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'
      } mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isExpiringSoon 
                ? 'bg-orange-100 dark:bg-orange-900' 
                : 'bg-blue-100 dark:bg-blue-900'
            }`}>
              {isExpiringSoon ? (
                <AlertTriangle className={`h-5 w-5 ${
                  isExpiringSoon 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
              ) : (
                <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="secondary" 
                  className={`${
                    isExpiringSoon 
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}
                >
                  <Gift className="mr-1 h-3 w-3" />
                  Licença de Teste
                </Badge>
                
                <Badge variant="outline" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  {daysRemaining || 0} dias restantes
                </Badge>
              </div>
              
              <AlertDescription className={`text-sm ${
                isExpiringSoon 
                  ? 'text-orange-700 dark:text-orange-300' 
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {isExpiringSoon ? (
                  <strong>⚠️ Sua licença de teste expira em breve!</strong>
                ) : (
                  <strong>🎉 Você está usando uma licença de teste!</strong>
                )}
                <br />
                <span className="text-xs">
                  {isExpiringSoon 
                    ? 'Entre em contato para adquirir uma licença completa e continuar usando o sistema.'
                    : 'Aproveite para explorar todas as funcionalidades do sistema.'
                  }
                </span>
              </AlertDescription>
            </div>
          </div>
          
          <Button
            onClick={onSupportClick || handleWhatsAppSupport}
            size="sm"
            className={`${
              isExpiringSoon 
                ? 'bg-orange-600 hover:bg-orange-700' 
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            {isExpiringSoon ? 'Adquirir Licença' : 'Falar com Suporte'}
          </Button>
        </div>
      </Alert>
    );
  }

  // Banner para usuários que podem criar licença de teste
  if (!hasValidLicense && canCreateTrial && showCreateButton) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Zap className="mr-1 h-3 w-3" />
                  Teste Grátis Disponível
                </Badge>
              </div>
              
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                <strong>🚀 Experimente o OneDrip gratuitamente!</strong>
                <br />
                <span className="text-xs">
                  Crie uma licença de teste de 7 dias e explore todas as funcionalidades.
                </span>
              </AlertDescription>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCreateTrial}
              disabled={isCreatingTrial}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreatingTrial ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Gift className="mr-2 h-4 w-4" />
                  Teste Grátis
                </>
              )}
            </Button>
            
            <Button
              onClick={onSupportClick || handleWhatsAppSupport}
              size="sm"
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Comprar
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  // Não mostrar banner se não há licença de teste ativa ou disponível
  return null;
};