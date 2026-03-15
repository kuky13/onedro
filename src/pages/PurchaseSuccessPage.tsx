 import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, MessageCircle, ArrowLeft, Copy, Loader2, Key, AlertTriangle, ExternalLink, Shield, Save } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppInfo, useContactInfo } from '@/hooks/useAppConfig';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Chave para localStorage
const LICENSE_STORAGE_KEY = 'onedrip_purchased_license';

interface LicenseData {
  code: string;
  expires_at: string | null;
  activated_at: string | null;
}

// Funções para salvar e recuperar licença do localStorage
const saveLicenseToStorage = (license: LicenseData) => {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({
      ...license,
      savedAt: new Date().toISOString()
    }));
    console.log('PurchaseSuccess: Licença salva em localStorage');
  } catch (error) {
    console.error('PurchaseSuccess: Erro ao salvar licença em localStorage:', error);
  }
};

const getLicenseFromStorage = (): LicenseData | null => {
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('PurchaseSuccess: Licença recuperada do localStorage');
      return {
        code: parsed.code,
        expires_at: parsed.expires_at ?? null,
        activated_at: parsed.activated_at ?? null
      };
    }
  } catch (error) {
    console.error('PurchaseSuccess: Erro ao recuperar licença do localStorage:', error);
  }
  return null;
};

export const PurchaseSuccessPage = () => {
  const { name, logo } = useAppInfo();
  const { whatsapp, whatsappUrl } = useContactInfo();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [license, setLicense] = useState<LicenseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const maxPollingAttempts = 15; // 30 segundos (15 * 2s)
  const [showLoginMessage, setShowLoginMessage] = useState(false);
  
  const orderId = searchParams.get('order_id');

  // Tentar carregar do localStorage na inicialização
  useEffect(() => {
    const storedLicense = getLicenseFromStorage();
    if (storedLicense) {
      console.log('PurchaseSuccess: Licença encontrada em localStorage');
      setLicense(storedLicense);
    }
  }, []);

  // Buscar licença do usuário (com ou sem login)
  const fetchLicense = async () => {
    console.log('PurchaseSuccess: Buscando licença...', { userId: user?.id, orderId });
    
    try {
      // Se o usuário estiver logado, buscar pela user_id
      if (user?.id) {
        console.log('PurchaseSuccess: Usuário logado, buscando por user_id:', user.id);
        const { data, error } = await supabase
          .from('licenses')
          .select('code, expires_at, activated_at')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('PurchaseSuccess: Erro ao buscar licença:', error);
          return;
        }

        if (data) {
          console.log('PurchaseSuccess: Licença encontrada:', data);
          setLicense(data);
          saveLicenseToStorage(data); // Salvar em localStorage
          setIsLoading(false);
          return;
        }
      }
      
      // Tentar buscar pela última purchase_registration com código de licença
      // (para usuários não logados que acabaram de fazer compra)
      console.log('PurchaseSuccess: Buscando última purchase_registration com código de licença');
      const { data: purchaseReg, error: purchaseRegError } = await supabase
        .from('purchase_registrations')
        .select('license_code, license_id')
        .not('license_code', 'is', null)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!purchaseRegError && purchaseReg?.license_code) {
        // Buscar detalhes da licença
        if (purchaseReg.license_id) {
          const { data: licenseData, error: licenseError } = await supabase
            .from('licenses')
            .select('code, expires_at, activated_at')
            .eq('id', purchaseReg.license_id)
            .maybeSingle();

          if (!licenseError && licenseData) {
            console.log('PurchaseSuccess: Licença encontrada via purchase_registration:', licenseData);
            setLicense(licenseData);
            saveLicenseToStorage(licenseData); // Salvar em localStorage
            setIsLoading(false);
            return;
          }
        } else if (purchaseReg.license_code) {
          // Se não tem license_id, buscar pelo código
          const { data: licenseData, error: licenseError } = await supabase
            .from('licenses')
            .select('code, expires_at, activated_at')
            .eq('code', purchaseReg.license_code)
            .maybeSingle();

          if (!licenseError && licenseData) {
            console.log('PurchaseSuccess: Licença encontrada via código:', licenseData);
            setLicense(licenseData);
            saveLicenseToStorage(licenseData); // Salvar em localStorage
            setIsLoading(false);
            return;
          }
        }
      }
      
      // Se não encontrou licença e tem orderId, buscar a última licença criada (assumindo que é a mais recente)
      if (orderId) {
        console.log('PurchaseSuccess: Buscando última licença criada (order_id presente)');
        const { data, error: _error } = await supabase
          .from('licenses')
          .select('code, expires_at, activated_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          console.log('PurchaseSuccess: Última licença encontrada:', data);
          setLicense(data);
          saveLicenseToStorage(data); // Salvar em localStorage
          setIsLoading(false);
          return;
        }
      }
      
      console.log('PurchaseSuccess: Nenhuma licença encontrada ainda');
    } catch (err) {
      console.error('PurchaseSuccess: Erro inesperado ao buscar licença:', err);
    }
  };

  // Polling para buscar licença (caso webhook ainda não tenha processado)
  useEffect(() => {
    fetchLicense();

    // Se ainda não encontrou a licença, fazer polling
    const interval = setInterval(() => {
      if (pollingAttempts < maxPollingAttempts && !license) {
        setPollingAttempts(prev => prev + 1);
        fetchLicense();
      } else {
        setIsLoading(false);
        if (!license && !user?.id) {
          setShowLoginMessage(true);
        }
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pollingAttempts, license]);

  const copyLicenseCode = () => {
    if (license?.code) {
      navigator.clipboard.writeText(license.code);
      toast.success('Código copiado!', {
        description: 'A chave de acesso ao suporte foi copiada para a área de transferência.'
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  return <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }}></div>
      </div>

      {/* Theme toggle */}

      {/* Back button */}
      <div className="absolute top-6 left-6 z-10">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <img src={logo} alt={`${name} Logo`} className="h-12 w-12" />
            <h1 className="text-4xl font-bold text-foreground">{name}</h1>
          </div>
        </div>

        {/* Success Card */}
        <div className="max-w-md mx-auto">
          <Card className="glass-card animate-scale-in border-0 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-3xl text-foreground mb-2">Pagamento Confirmado!</CardTitle>
              <CardDescription className="text-base">
                Obrigado por escolher o {name} para sua assistência técnica
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="text-center space-y-2">
                    <p className="text-foreground font-medium">Processando seu pagamento...</p>
                    <p className="text-sm text-muted-foreground">Aguarde enquanto ativamos seu acesso ao suporte</p>
                  </div>
                </div>
              ) : license ? (
                <>
                  {/* Chave de Acesso */}
                  <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-2 border-primary/30 rounded-xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Key className="h-5 w-5" />
                      <h3 className="font-bold text-lg">Seu Acesso ao Suporte está Pronto!</h3>
                    </div>
                    
                    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] px-2 py-1 rounded-bl-lg flex items-center gap-1">
                        <Save className="h-3 w-3" />
                        Salvo no dispositivo
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-muted-foreground">Chave de Acesso ao Suporte:</span>
                        <Button
                          onClick={copyLicenseCode}
                          variant="ghost"
                          size="sm"
                          className="h-8"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <div className="font-mono text-xl font-bold text-center tracking-wider text-foreground bg-muted/50 rounded-lg py-3 px-4 break-all border border-border/50">
                        {license.code}
                      </div>
                      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                        <Shield className="h-3 w-3" />
                        Não compartilhe esta chave com ninguém
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Ativada em:</p>
                        <p className="text-sm font-semibold text-foreground">{formatDate(license.activated_at)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Expira em:</p>
                        <p className="text-sm font-semibold text-foreground">{formatDate(license.expires_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Aviso sobre criar conta */}
                  <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
                          Crie uma conta e use esta chave para ativar seu acesso ao suporte
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Esta chave pode ser ativada apenas <strong>1 vez</strong> quando o pagamento for aprovado.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Link para suporte */}
                  <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                      Perdeu o código ou precisa de ajuda?
                    </p>
                    <Link to="/suporte" className="block">
                      <Button variant="outline" className="w-full" size="sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Entre em contato com o suporte
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  </div>

                  {/* Botão para ir ao Dashboard ou criar conta */}
                  {user?.id ? (
                    <Link to="/dashboard">
                      <Button className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" size="lg">
                        Acessar Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/auth">
                      <Button className="w-full h-12 text-base font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" size="lg">
                        Criar Conta e Ativar Acesso ao Suporte
                      </Button>
                    </Link>
                  )}
                </>
              ) : showLoginMessage ? (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-3 text-center">Faça Login para Ver seu Acesso ao Suporte</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Sua contratação foi processada com sucesso! Faça login ou crie sua conta para visualizar sua chave de acesso ao suporte.
                  </p>
                  <Link to="/auth">
                    <Button className="w-full" variant="outline">
                      Ir para o Login
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-background border-2 border-amber-500/30 rounded-xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                      <Key className="h-5 w-5" />
                      <h3 className="font-bold text-lg">Acesso ao Suporte em Processamento</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-foreground font-medium text-center">
                        🎉 Pagamento confirmado com sucesso!
                      </p>
                      <p className="text-muted-foreground text-sm text-center">
                        Sua chave de acesso ao suporte será fornecida em breve. Estamos processando seu pedido e você receberá a chave de ativação nos próximos minutos.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <h3 className="font-semibold text-foreground mb-3 text-center">📋 Próximos Passos</h3>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Entre em contato conosco via WhatsApp</li>
                      <li>Informe seu pedido e aguarde a confirmação</li>
                      <li>Receba sua chave de acesso ao suporte e credenciais de acesso</li>
                      <li>Comece a usar o {name} imediatamente!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* WhatsApp Contact Button */}
              <Button onClick={() => window.open(whatsappUrl, '_blank')} className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl" size="lg">
                <MessageCircle className="h-5 w-5 mr-2" />
                Enviar Comprovante via WhatsApp
              </Button>

              <div className="text-center pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-2">
                  <strong>WhatsApp:</strong> {whatsapp || '(11) 9 9999-9922'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Entre em contato para receber sua chave de acesso ao suporte • Suporte disponível de segunda a sábado, das 8h às 18h
                </p>
              </div>

              {/* Back to login */}
              <div className="text-center">
                <Link to="/auth" className="text-primary hover:underline text-sm font-medium">
                  Ir para o Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional info */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            ✓ Ativação rápida • ✓ Suporte incluído • ✓ Sem taxa de setup
          </p>
        </div>
      </div>
    </div>;
};
