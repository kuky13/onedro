import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Info, Clock, Search, Gift, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { useLicenseActivation } from '@/hooks/useLicenseActivation';
import { useTrialLicense } from '@/hooks/useTrialLicense';

interface LicenseActivationIOSProps {
  user: any;
  onLicenseActivated: () => void;
}

export const LicenseActivationIOS = ({
  onLicenseActivated
}: LicenseActivationIOSProps) => {
  const [licenseCode, setLicenseCode] = useState('');
  const [previewDays, setPreviewDays] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  const { 
    validateLicenseFormat, 
    previewLicense, 
    activateLicense, 
    isActivating 
  } = useLicenseActivation();
  
  const { 
    createTrialLicense, 
    isCreatingTrial, 
    trialStatus 
  } = useTrialLicense();

  const handleCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (value.length <= 13) {
      setLicenseCode(value);
      
      // Show preview for valid format
      if (validateLicenseFormat(value)) {
        setIsPreviewLoading(true);
        try {
          const preview = await previewLicense(value);
          setPreviewDays(preview?.days ?? null);
        } catch (error) {
          console.warn('Erro ao obter preview da licença:', error);
          setPreviewDays(null);
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPreviewDays(null);
      }
    }
  };

  const handleActivateLicense = async () => {
    if (!validateLicenseFormat(licenseCode)) {
      showError({
        title: 'Código Inválido',
        description: 'O código deve ter exatamente 13 caracteres (letras e números)'
      });
      return;
    }

    try {
      const result = await activateLicense(licenseCode);
      if (result && result.success) {
        showSuccess({
          title: 'Acesso ao Suporte Ativado!',
          description: result.message || 'Seu acesso ao suporte foi ativado com sucesso.'
        });
        setTimeout(() => {
          onLicenseActivated();
        }, 1500);
      }
    } catch (error) {
      // O erro já foi tratado no hook
      console.error('Erro na ativação:', error);
    }
  };

  const handleCreateTrialLicense = async () => {
    try {
      const result = await createTrialLicense();
      if (result === true || (result && typeof result === 'object')) {
        const licenseCode = (result && typeof result === 'object' && 'license_code' in result) ? (result as any).license_code : 'N/A';
        showSuccess({
          title: 'Acesso de Teste Criado!',
          description: `Você recebeu 7 dias de acesso gratuito. Chave: ${licenseCode}`
        });
        setTimeout(() => {
          onLicenseActivated();
        }, 1500);
      }
    } catch (error) {
      // O erro já foi tratado no hook
      console.error('Erro ao criar licença de teste:', error);
    }
  };

  const getLicenseTypeInfo = (code: string) => {
    if (code.startsWith('TRIAL')) {
      return {
        type: 'Chave de Teste',
        description: 'Acesso gratuito por 7 dias',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else if (code.length === 13 && /^[0-9]{6}[A-Z0-9]{7}$/.test(code)) {
      return {
        type: 'Chave Nova',
        description: 'Formato de chave atualizado',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    } else {
      return {
        type: 'Chave Legada',
        description: 'Formato de chave anterior (30 dias)',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }
  };

  const licenseTypeInfo = validateLicenseFormat(licenseCode) ? getLicenseTypeInfo(licenseCode) : null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <Key className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-amber-800">Ative seu Acesso ao Suporte</CardTitle>
            <p className="text-sm text-amber-700 mt-1">
              Para acessar a plataforma, você precisa ativar uma chave de acesso ao suporte válida
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="license-code" className="text-sm font-medium text-amber-800">
            Chave de Acesso ao Suporte
          </label>
          <Input
            id="license-code"
            type="text"
            placeholder="ABC123XYZ4567"
            value={licenseCode}
            onChange={handleCodeChange}
            className="font-mono text-center tracking-wider border-amber-200 focus:border-amber-400"
            maxLength={13}
          />
          <p className="text-xs text-amber-600 text-center">
            Digite o código de 13 caracteres (letras e números)
          </p>
        </div>

        {/* Preview de dias da licença */}
        {isPreviewLoading && (
          <Alert className="border-gray-200 bg-gray-50">
            <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
            <AlertDescription className="text-gray-800">
              Verificando acesso ao suporte...
            </AlertDescription>
          </Alert>
        )}

        {previewDays && !isPreviewLoading && (
          <Alert className="border-green-200 bg-green-50">
            <Clock className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Preview:</strong> Esta chave concederá {previewDays} dias de acesso à plataforma
            </AlertDescription>
          </Alert>
        )}

        {/* Informações do tipo de licença */}
        {licenseTypeInfo && (
          <Alert className={`${licenseTypeInfo.borderColor} ${licenseTypeInfo.bgColor}`}>
            <Info className={`h-4 w-4 ${licenseTypeInfo.color}`} />
            <AlertDescription className={licenseTypeInfo.color}>
              <strong>{licenseTypeInfo.type}:</strong> {licenseTypeInfo.description}
            </AlertDescription>
          </Alert>
        )}

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            <strong>Importante:</strong> Cada código só pode ser usado uma vez. Certifique-se de digitar corretamente.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleActivateLicense}
          disabled={isActivating || !validateLicenseFormat(licenseCode)}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {isActivating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Ativando acesso ao suporte...
            </>
          ) : (
            'Ativar Acesso ao Suporte'
          )}
        </Button>

        {/* Botão para criar licença de teste */}
        {trialStatus?.can_create_trial && (
          <Button 
            onClick={handleCreateTrialLicense}
            disabled={isCreatingTrial}
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            {isCreatingTrial ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando acesso de teste...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Criar Acesso de Teste (7 dias grátis)
              </>
            )}
          </Button>
        )}
        
        <Button 
          onClick={() => navigate('/verify-licenca')}
          variant="outline"
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Search className="h-4 w-4 mr-2" />
          Verificar Acesso ao Suporte
        </Button>
      </CardContent>
    </Card>
  );
};
