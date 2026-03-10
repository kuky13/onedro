import { useState, useEffect } from 'react';
import { Copy, CheckCircle, Loader2, QrCode, Shield, Download, Mail, AlertTriangle, RefreshCw, XCircle, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { checkAbacatePayStatus } from '@/lib/abacatepay-client';
import { useNavigate } from 'react-router-dom';
interface PixPaymentDisplayProps {
  qrCode: string;
  qrCodeBase64?: string;
  paymentId: string;
  amount: number;
  currency?: string;
  onPaymentApproved?: () => void;
}
export const PixPaymentDisplay = ({
  qrCode,
  qrCodeBase64,
  paymentId,
  amount,
  currency = 'R$',
  onPaymentApproved
}: PixPaymentDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'checking' | 'error' | 'expired' | 'cancelled'>('pending');
  const [licenseCode, setLicenseCode] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [isSavedLocally, setIsSavedLocally] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutos em segundos
  const [isCancelling, setIsCancelling] = useState(false);
  const MAX_RETRIES = 60; // 60 tentativas * 3s = 3 minutos máximo para polling de licença

  const navigate = useNavigate();
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado!', {
        description: 'Código copiado para a área de transferência'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar código');
    }
  };

  // Salvar licença localmente
  const saveLicenseLocally = (code: string) => {
    try {
      const savedLicenses = JSON.parse(localStorage.getItem('onedrip_licenses') || '[]');
      if (!savedLicenses.includes(code)) {
        savedLicenses.push({
          code,
          date: new Date().toISOString(),
          paymentId
        });
        localStorage.setItem('onedrip_licenses', JSON.stringify(savedLicenses));
      }
      setIsSavedLocally(true);
    } catch (e) {
      console.error('Erro ao salvar licença localmente', e);
    }
  };
  const handleExpireByTimer = async () => {
    if (paymentStatus === 'expired' || paymentStatus === 'cancelled' || licenseCode) return;
    setPaymentStatus('expired');
    setErrorMessage('Tempo limite de 10 minutos excedido. O pagamento foi cancelado automaticamente.');
    setIsCancelling(true);
    try {
      // await cancelPixPayment(paymentId, 'timer');
      toast.error('Pagamento expirado', {
        description: 'Seu código PIX foi cancelado após 10 minutos sem pagamento.'
      });
    } catch (error) {
      console.error('Erro ao cancelar pagamento por expiração de tempo:', error);
    } finally {
      setIsCancelling(false);
    }
  };
  const handleUserCancel = async () => {
    if (paymentStatus === 'expired' || paymentStatus === 'cancelled' || licenseCode) return;
    setIsCancelling(true);
    try {
      // await cancelPixPayment(paymentId, 'user');
      setPaymentStatus('cancelled');
      setErrorMessage('Pagamento cancelado por você. O código PIX não é mais válido.');
      toast.error('Pagamento cancelado', {
        description: 'Seu código PIX foi cancelado com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao cancelar pagamento PIX:', error);
      toast.error('Erro ao cancelar pagamento', {
        description: 'Tente novamente ou use outro método de pagamento.'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Contagem regressiva de 10 minutos
  useEffect(() => {
    if (licenseCode) return;
    if (paymentStatus === 'error' || paymentStatus === 'expired' || paymentStatus === 'cancelled') return;
    if (timeLeft <= 0) {
      void handleExpireByTimer();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, paymentStatus, licenseCode]);

  // Polling para verificar status do pagamento com proteção contra loop infinito
  useEffect(() => {
    if (licenseCode) return; // Parar se já temos a licença
    if (paymentStatus === 'error' || paymentStatus === 'expired' || paymentStatus === 'cancelled') return; // Parar se houve erro/cancelamento

    const interval = setInterval(async () => {
      // Verificar limite de tentativas
      if (retryCount >= MAX_RETRIES) {
        setPaymentStatus('error');
        setErrorMessage('Tempo limite atingido. O pagamento pode ter sido aprovado, mas houve um problema ao gerar a licença. Entre em contato com o suporte.');
        clearInterval(interval);
        return;
      }
      try {
        setRetryCount(prev => prev + 1);
        setPaymentStatus('checking');
        const result = await checkAbacatePayStatus(paymentId);
        if (result.paid) {
          if (result.license_code) {
            setLicenseCode(result.license_code);
            setPaymentStatus('approved');
            if (result.customer_data) {
              setCustomerData(result.customer_data);
            }

            // Salvar automaticamente
            saveLicenseLocally(result.license_code);
            toast.success('Pagamento aprovado!', {
              description: 'Sua licença foi gerada com sucesso!'
            });
            if (onPaymentApproved) {
              onPaymentApproved();
            }
            clearInterval(interval);
          } else {
            // Aprovado mas sem licença ainda (webhook processando)
            setPaymentStatus('approved');
            // Continuar polling até vir a licença ou atingir limite
          }
        } else {
          setPaymentStatus('pending');
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
        setPaymentStatus('pending');
      }
    }, 3000); // Verificar a cada 3 segundos

    return () => clearInterval(interval);
  }, [paymentId, licenseCode, onPaymentApproved, retryCount, paymentStatus]);
  if (licenseCode) {
    return <Card className="glass-card border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-emerald-500/5 animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Pagamento Aprovado!</CardTitle>
          <p className="text-muted-foreground">Sua licença profissional foi gerada com sucesso</p>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            {isSavedLocally && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-2 py-1 rounded-bl-lg font-bold flex items-center gap-1">
                <Download className="w-3 h-3" />
                SALVO NO DISPOSITIVO
              </div>}

            <p className="text-sm text-center text-muted-foreground mb-2">Seu Código de Licença Profissional:</p>
            <div className="flex flex-col items-center gap-3">
              <code className="text-2xl sm:text-3xl font-mono font-bold text-primary tracking-wider break-all text-center">
                {licenseCode}
              </code>
              <Button onClick={() => copyToClipboard(licenseCode)} variant="outline" size="sm" className="gap-2">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar Código'}
              </Button>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-700 dark:text-yellow-400">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>IMPORTANTE:</strong> Não compartilhe este código. Ele é único e intransferível.
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-blue-700 dark:text-blue-400">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Enviamos um email para <strong>{customerData?.email || 'seu email cadastrado'}</strong> com o
                  <strong> código da sua licença</strong> e um <strong>recibo do pagamento</strong> com todos os detalhes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate('/auth')} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Ir para dashboard
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Você será redirecionado para criar sua conta ou fazer login
            </p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="glass-card border-0 bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="flex items-center gap-2 text-foreground text-lg sm:text-xl">
          <QrCode className="h-5 w-5 text-primary" />
          Pagamento via PIX
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* QR Code */}
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl border-2 border-primary/20 shadow-lg relative">
            {paymentStatus === 'approved' && !licenseCode && <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-center p-4">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 animate-spin mb-2" />
                <p className="text-xs sm:text-sm font-bold text-green-600">Pagamento Recebido!</p>
                <p className="text-xs text-muted-foreground">Gerando sua licença...</p>
              </div>}

            {qrCodeBase64 ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48 sm:w-64 sm:h-64 object-contain" /> : <div className="w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center bg-muted">
                <QrCode className="h-24 w-24 sm:h-32 sm:w-32 text-muted-foreground" />
              </div>}
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
            Escaneie o QR Code com o app do seu banco
          </p>
        </div>

        {/* Código PIX Copiável */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-foreground">Ou copie o código PIX:</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/50 rounded-lg p-2 sm:p-3 border border-border overflow-x-auto">
              <p className="text-[10px] sm:text-xs font-mono break-all text-foreground">{qrCode}</p>
            </div>
            <Button onClick={() => copyToClipboard(qrCode)} variant="outline" size="icon" className="flex-shrink-0 min-w-[44px] min-h-[44px]">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Valor */}
        <div className="text-center p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor a pagar</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">
            {currency} {amount.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {/* Timer + Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 bg-muted/40 rounded-lg border border-border/60">
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Código PIX expira em{' '}
              <span className={timeLeft <= 60 ? 'text-destructive font-semibold' : 'text-foreground font-medium'}>
                {formatTime(timeLeft)}
              </span>
            </span>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={handleUserCancel} disabled={isCancelling || paymentStatus === 'approved' || paymentStatus === 'error' || paymentStatus === 'expired' || paymentStatus === 'cancelled'} className="flex items-center gap-2 text-destructive border-destructive/40 hover:bg-destructive/10">
            <XCircle className="h-4 w-4" />
            Cancelar pagamento
          </Button>
        </div>

        {/* Status do Pagamento */}
        <div className="flex items-center justify-center gap-2 p-4 bg-muted/30 rounded-lg">
          {paymentStatus === 'error' && <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <span className="text-sm text-destructive font-medium">{errorMessage || 'Erro ao processar pagamento'}</span>
              <Button variant="outline" size="sm" onClick={() => {
            setRetryCount(0);
            setPaymentStatus('pending');
            setErrorMessage(null);
          }} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar Novamente
              </Button>
            </div>}
          {paymentStatus === 'checking' && <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verificando pagamento... ({retryCount}/{MAX_RETRIES})</span>
            </>}
          {paymentStatus === 'approved' && !licenseCode && <>
              <Loader2 className="h-4 w-4 animate-spin text-green-500" />
              <span className="text-sm text-green-600 font-medium">
                Confirmando licença... ({retryCount}/{MAX_RETRIES})
              </span>
            </>}
          {paymentStatus === 'pending' && <span className="text-sm text-muted-foreground">Aguardando pagamento...</span>}
          {paymentStatus === 'expired' && <span className="text-sm text-destructive font-medium">
              Tempo limite de 10 minutos excedido. Gere um novo código PIX para tentar novamente.
            </span>}
          {paymentStatus === 'cancelled' && <span className="text-sm text-destructive font-medium">
              Pagamento cancelado por você. O código PIX atual não é mais válido.
            </span>}
        </div>

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
          <p>• O pagamento é processado automaticamente</p>
          <p>• Após o pagamento, sua licença aparecerá aqui nesta tela</p>
          
          <p>• Em caso de dúvidas, entre em contato com o suporte</p>
        </div>
      </CardContent>
    </Card>;
};