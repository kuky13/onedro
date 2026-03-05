
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, Info, Clock, Gift, Loader2, Calendar, Shield } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

import { useLicenseActivation } from '@/hooks/useLicenseActivation';
import { useTrialLicense } from '@/hooks/useTrialLicense';

interface LicenseActivationSectionProps {
  user: any;
  onLicenseActivated: () => void;
}

export const LicenseActivationSection = ({ onLicenseActivated }: LicenseActivationSectionProps) => {
  const [licenseCode, setLicenseCode] = useState('');
  const [previewDays, setPreviewDays] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  
  const { showSuccess, showError } = useToast();
  
  
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
      setPreviewError(null);
      
      // Show preview for valid format
      if (validateLicenseFormat(value)) {
        setIsPreviewLoading(true);
        try {
          const preview = await previewLicense(value);
          setPreviewDays(preview?.days ?? null);
        } catch (error: any) {
          console.warn('Erro ao obter preview da licença:', error);
          setPreviewDays(null);
          setPreviewError(error?.message || 'Erro ao verificar licença');
        } finally {
          setIsPreviewLoading(false);
        }
      } else {
        setPreviewDays(null);
        setPreviewError(null);
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
          title: 'Licença Ativada!',
          description: result.message || 'Sua licença foi ativada com sucesso. Redirecionando...'
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
          title: 'Licença de Teste Criada!',
          description: `Você recebeu 7 dias de acesso gratuito. Código: ${licenseCode}`
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
        type: 'Licença de Teste',
        description: 'Acesso gratuito por 7 dias',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Gift className="h-4 w-4" />
      };
    } else if (code.length === 13 && /^[0-9]{6}[A-Z0-9]{7}$/.test(code)) {
      const daysFromCode = parseInt(code.substring(0, 6));
      return {
        type: 'Licença Premium',
        description: `Formato novo - ${daysFromCode} dias codificados`,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <Shield className="h-4 w-4" />
      };
    } else {
      return {
        type: 'Licença Legada',
        description: 'Formato anterior - 30 dias padrão',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: <Calendar className="h-4 w-4" />
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
            <CardTitle className="text-lg text-amber-800">Ative sua Licença</CardTitle>
            <p className="text-sm text-amber-700 mt-1">
              Para acessar o sistema, você precisa ativar uma licença válida
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="license-code" className="text-sm font-medium text-amber-800">
            Código da Licença
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
              Verificando licença...
            </AlertDescription>
          </Alert>
        )}

        {previewError && !isPreviewLoading && (
          <Alert className="border-red-200 bg-red-50">
            <Info className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Erro:</strong> {previewError}
            </AlertDescription>
          </Alert>
        )}

        {previewDays && !isPreviewLoading && !previewError && (
          <Alert className="border-green-200 bg-green-50">
            <Clock className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="flex items-center justify-between">
                <span>
                  <strong>Preview:</strong> Esta licença concederá <strong>{previewDays} dias</strong> de acesso
                </span>
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              {previewDays === 7 && licenseCode.startsWith('TRIAL') && (
                <p className="text-xs mt-1 text-green-700">
                  ✨ Licença de teste - perfeita para experimentar o sistema!
                </p>
              )}
              {previewDays > 30 && (
                <p className="text-xs mt-1 text-green-700">
                  🎉 Licença premium com acesso estendido!
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Informações do tipo de licença */}
        {licenseTypeInfo && (
          <Alert className={`${licenseTypeInfo.borderColor} ${licenseTypeInfo.bgColor}`}>
            <div className="flex items-center gap-2">
              {licenseTypeInfo.icon}
              <div className={licenseTypeInfo.color}>
                <strong>{licenseTypeInfo.type}</strong>
              </div>
            </div>
            <AlertDescription className={`${licenseTypeInfo.color} mt-1`}>
              {licenseTypeInfo.description}
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
              Ativando Licença...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Ativar Licença
            </>
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
                Criando Licença de Teste...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Criar Licença de Teste (7 dias grátis)
              </>
            )}
          </Button>
        )}
        
      </CardContent>
    </Card>
  );
};
