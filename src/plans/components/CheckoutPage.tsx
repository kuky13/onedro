// ============================================
// CHECKOUT PAGE - MOBILE-FIRST CONVERSION OPTIMIZED
// ============================================
// Design focado em técnicos de celular
// Redução de fricção, foco em valor real

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, Check, Clock, Zap, MessageCircle, Loader2, User, Mail, Phone, AlertCircle, Atom, FileText, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PLANS_CONTENT } from '../data/content';
import { PixPaymentDisplay } from './PixPaymentDisplay';
import { createAbacatePayPix, createAbacatePayBilling } from '@/lib/abacatepay-client';

import { toast } from 'sonner';
import { usePlanPrice } from '@/hooks/usePlanPrice';
import { useAuth } from '@/hooks/useAuth';
import { useLicense } from '@/hooks/useLicense';
import { CouponInput } from '@/components/checkout/CouponInput';
interface AppliedCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}
interface CheckoutPageProps {
  planType?: 'monthly' | 'yearly';
}
export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  planType
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    licenseStatus,
    isLoading: licenseLoading,
    hasValidLicense,
    isExpired,
    isTrial,
    daysUntilExpiry
  } = useLicense();
  const currentPlanType = planType || 'monthly';
  const isMonthly = currentPlanType === 'monthly';
  const staticPlanData = isMonthly ? PLANS_CONTENT.planos.mensal : PLANS_CONTENT.planos.anual;
  const {
    price: dynamicPrice
  } = usePlanPrice(currentPlanType, staticPlanData.preco);
  const planData = {
    ...staticPlanData,
    preco: dynamicPrice
  };
  

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', {
        state: {
          redirectTo: location.pathname
        },
        replace: true
      });
      toast.error('Login necessário', {
        description: 'Você precisa estar logado para realizar uma compra.'
      });
    }
  }, [user, authLoading, navigate, location.pathname]);

  // Estados
  const [step, setStep] = useState<'info' | 'payment' | 'pix'>('info');
  const [purchaseMode, setPurchaseMode] = useState<'one_time' | 'subscription'>('one_time');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64?: string;
    paymentId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: ''
  });
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [finalPrice, setFinalPrice] = useState(dynamicPrice);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: ''
  });
  const daysToAdd = currentPlanType === 'yearly' ? 365 : 30;

  // Atualizar preço final quando o preço dinâmico mudar
  useEffect(() => {
    if (!appliedCoupon) {
      setFinalPrice(dynamicPrice);
    }
  }, [dynamicPrice, appliedCoupon]);
  const handleCouponApplied = (coupon: AppliedCoupon | null, newPrice: number) => {
    setAppliedCoupon(coupon);
    setFinalPrice(newPrice);
  };
  const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  const validateForm = (): boolean => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      taxId: ''
    };
    let isValid = true;
    if (!contactData.name.trim() || contactData.name.trim().length < 2) {
      newErrors.name = 'Nome obrigatório (mínimo 2 caracteres)';
      isValid = false;
    }
    if (!contactData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
      newErrors.email = 'Email inválido';
      isValid = false;
    }
    const phoneDigits = contactData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      newErrors.phone = 'Telefone inválido';
      isValid = false;
    }
    if (!validateCPF(contactData.taxId)) {
      newErrors.taxId = 'CPF inválido';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleTaxIdChange = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
      cleaned = cleaned.replace(/(\d{3})(\d)/, '$1.$2');
      cleaned = cleaned.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      setContactData({
        ...contactData,
        taxId: cleaned
      });
    }
  };
  const handlePhoneChange = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      if (cleaned.length <= 10) {
        cleaned = cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
      } else {
        cleaned = cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
      setContactData({
        ...contactData,
        phone: cleaned
      });
    }
  };
  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setStep('payment');
    } else {
      toast.error('Preencha todos os campos corretamente');
    }
  };
  const handlePixPayment = async () => {
    setIsLoading(true);
    try {
      toast.info('Gerando QR Code PIX (AbacatePay)...');

      // 1. Criar purchase_registration antes do PIX
      const { data: registration, error: regError } = await supabase
        .from('purchase_registrations')
        .insert([{
          customer_name: contactData.name,
          customer_email: contactData.email,
          customer_phone: contactData.phone,
          customer_tax_id: contactData.taxId,
          plan_type: currentPlanType,
          amount: Math.round(finalPrice * 100),
          currency: 'BRL',
          payment_method: 'PIX',
          status: 'pending',
          user_id: user?.id || null,
          metadata: { provider: 'abacatepay' } as unknown as import('@/integrations/supabase/types').Json
        }])
        .select()
        .single();

      if (regError || !registration) {
        console.error('Erro ao criar registro de compra:', regError);
        throw new Error('Erro ao preparar pagamento');
      }

      // 2. Gerar PIX com purchaseRegistrationId
      const pixPayment = await createAbacatePayPix({
        amount: Math.round(finalPrice * 100),
        description: planData.nome,
        customerName: contactData.name,
        customerEmail: contactData.email,
        customerPhone: contactData.phone,
        customerTaxId: contactData.taxId,
        purchaseRegistrationId: registration.id
      });

      // 3. Atualizar registro com paymentId do AbacatePay
      await supabase
        .from('purchase_registrations')
        .update({
          mercadopago_payment_id: pixPayment.payment_id,
          metadata: { provider: 'abacatepay', abacatepay_id: pixPayment.payment_id }
        })
        .eq('id', registration.id);

      setPixData({
        qrCode: pixPayment.qr_code,
        qrCodeBase64: pixPayment.qr_code_base64,
        paymentId: pixPayment.payment_id
      });
      setStep('pix');
      toast.success('QR Code gerado!');
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      toast.error('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleCardPayment = async () => {
    setIsLoading(true);
    try {
      toast.info('Gerando link de pagamento...');
      
      // 1. Criar purchase_registration
      const { data: registration, error: regError } = await supabase
        .from('purchase_registrations')
        .insert([{
          customer_name: contactData.name,
          customer_email: contactData.email,
          customer_phone: contactData.phone,
          customer_tax_id: contactData.taxId,
          plan_type: currentPlanType,
          amount: Math.round(finalPrice * 100),
          currency: 'BRL',
          payment_method: 'CARD', // Indica intenção de pagar com cartão
          status: 'pending',
          user_id: user?.id || null,
          metadata: { provider: 'abacatepay' } as unknown as import('@/integrations/supabase/types').Json
        }])
        .select()
        .single();

      if (regError || !registration) {
        console.error('Erro ao criar registro de compra:', regError);
        throw new Error('Erro ao preparar pagamento');
      }

      // 2. Gerar Link de Checkout (Billing)
      const billing = await createAbacatePayBilling({
        amount: Math.round(finalPrice * 100),
        description: `${planData.nome} (Cartão)`,
        customerName: contactData.name,
        customerEmail: contactData.email,
        customerPhone: contactData.phone,
        customerTaxId: contactData.taxId,
        frequency: "ONE_TIME", // Pagamento único, igual ao PIX atual
        returnUrl: window.location.origin + "/plans",
        completionUrl: window.location.origin + "/purchase-success",
        purchaseRegistrationId: registration.id
      });

      // 3. Atualizar registro com paymentId
      await supabase
        .from('purchase_registrations')
        .update({
          mercadopago_payment_id: billing.payment_id,
          metadata: { provider: 'abacatepay', abacatepay_id: billing.payment_id }
        })
        .eq('id', registration.id);

      if (billing.url) {
        toast.success('Redirecionando para pagamento...');
        window.location.href = billing.url;
      } else {
        throw new Error('URL de redirecionamento não recebida');
      }
    } catch (error) {
      console.error('Erro ao criar pagamento com cartão:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscription = async () => {
    setIsLoading(true);
    try {
      toast.info('Criando assinatura (AbacatePay)...');
      const billing = await createAbacatePayBilling({
        amount: Math.round(finalPrice * 100),
        description: `Assinatura ${planData.nome}`,
        customerName: contactData.name,
        customerEmail: contactData.email,
        customerPhone: contactData.phone,
        customerTaxId: contactData.taxId,
        frequency: "MULTIPLE_PAYMENTS",
        returnUrl: window.location.origin + "/plans",
        completionUrl: window.location.origin + "/purchase-success",
      });

      if (billing.url) {
        toast.success('Redirecionando para pagamento...');
        window.location.href = billing.url;
      } else {
        throw new Error('URL de redirecionamento não recebida');
      }
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast.error('Erro ao criar assinatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleConfirmPayment = () => {
    if (paymentMethod === 'card') {
      return handleCardPayment();
    }
    if (purchaseMode === 'one_time') {
      return handlePixPayment();
    }
    return handleSubscription();
  };
  if (authLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header fixo */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => step === 'info' ? navigate('/plans') : setStep('info')} className="text-muted-foreground hover:text-foreground -ml-2 p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-foreground">Finalizar Compra</span>
          <div className="w-9" />
        </div>
      </header>

      <main className="px-4 pb-8 pt-4 max-w-lg mx-auto">
        {/* Resumo do Plano - Sempre Visível */}
        <Card className="mb-6 bg-card border-border/50">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">{planData.nome}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  {appliedCoupon ? <>
                      <span className="text-lg line-through text-muted-foreground">
                        {planData.moeda}{planData.preco.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-2xl font-bold text-green-500">
                        {planData.moeda}{finalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </> : <span className="text-2xl font-bold text-foreground">
                      {planData.moeda}{planData.preco.toFixed(2).replace('.', ',')}
                    </span>}
                  <span className="text-sm text-muted-foreground">{planData.periodo}</span>
                </div>
              </div>
              {planData.economia_texto && <Badge className="bg-green-500/20 text-green-500 border-0">
                  {planData.economia_texto}
                </Badge>}
            </div>

            {/* Cupom de desconto */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <CouponInput planType={currentPlanType} originalPrice={dynamicPrice} onCouponApplied={handleCouponApplied} />
            </div>
            
            {/* Status da licença */}
            {!licenseLoading && licenseStatus && <div className={`mt-4 p-3 rounded-lg text-sm ${isTrial ? 'bg-blue-500/10 border border-blue-500/20' : hasValidLicense && !isExpired ? 'bg-green-500/10 border border-green-500/20' : isExpired ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                <div className="flex items-start gap-2">
                  {isTrial ? <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" /> : isExpired ? <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" /> : <Shield className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-medium text-foreground">
                      {isTrial ? `Teste ativo (${daysUntilExpiry} dias restantes)` : hasValidLicense && !isExpired ? `Licença ativa (${daysUntilExpiry} dias)` : isExpired ? 'Licença expirada' : 'Sem licença'}
                    </p>
                    {purchaseMode === 'one_time' && <p className="text-xs text-muted-foreground mt-0.5">
                      +{daysToAdd} dias serão adicionados
                    </p>}
                    {purchaseMode === 'subscription' && <p className="text-xs text-muted-foreground mt-0.5">
                      Acesso contínuo enquanto a assinatura estiver ativa
                    </p>}
                  </div>
                </div>
              </div>}
          </CardContent>
        </Card>

        {/* Step 1: Formulário de Contato */}
        {step === 'info' && <Card className="bg-card border-border/50">
            <CardContent className="p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Seus dados
              </h2>
              
              <form onSubmit={handleSubmitInfo} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-sm text-foreground">Nome completo</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="name" type="text" placeholder="Seu nome" value={contactData.name} onChange={(e) => setContactData({
                  ...contactData,
                  name: e.target.value
                })} className={`pl-10 ${errors.name ? 'border-red-500' : ''}`} />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="seu@email.com" value={contactData.email} onChange={(e) => setContactData({
                  ...contactData,
                  email: e.target.value
                })} className={`pl-10 ${errors.email ? 'border-red-500' : ''}`} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm text-foreground">WhatsApp</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={contactData.phone} onChange={(e) => handlePhoneChange(e.target.value)} className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="taxId" className="text-sm text-foreground">CPF</Label>
                  <div className="relative mt-1.5">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="taxId" type="text" placeholder="000.000.000-00" value={contactData.taxId} onChange={(e) => handleTaxIdChange(e.target.value)} className={`pl-10 ${errors.taxId ? 'border-red-500' : ''}`} />
                  </div>
                  {errors.taxId && <p className="text-xs text-red-500 mt-1">{errors.taxId}</p>}
                </div>

                <Button type="submit" className="w-full py-5 mt-4 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Continuar
                </Button>
              </form>
            </CardContent>
          </Card>}

        {step === 'payment' && <div className="space-y-4">
            <Card className="bg-card border-border/50">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Forma de Pagamento
                </h2>

                <div className="space-y-3 mb-6">
                  {/* Opção PIX */}
                  <button 
                    onClick={() => setPaymentMethod('pix')} 
                    className={`w-full p-4 rounded-xl border-2 transition-all ${paymentMethod === 'pix' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background border-border/30 hover:border-border'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'pix' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {paymentMethod === 'pix' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">PIX</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Aprovação imediata. Liberação automática.
                        </p>
                        {paymentMethod === 'pix' && (
                          <div className="mt-2 text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded inline-block">
                            Recomendado
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Opção Cartão */}
                  <button 
                    onClick={() => setPaymentMethod('card')} 
                    className={`w-full p-4 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'bg-primary/10 border-primary shadow-sm' : 'bg-background border-border/30 hover:border-border'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${paymentMethod === 'card' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {paymentMethod === 'card' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" />
                          <p className="font-semibold text-foreground">Cartão de Crédito</p>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Pague com segurança via AbacatePay.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Botão de confirmação */}
                <Button onClick={handleConfirmPayment} disabled={isLoading} className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isLoading ? <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {paymentMethod === 'pix' ? 'Gerando QR Code...' : 'Gerando link de pagamento...'}
                    </span> : paymentMethod === 'pix' ? 'Pagar com PIX' : 'Ir para Pagamento'}
                </Button>
              </CardContent>
            </Card>

            {/* Segurança */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Atom className="h-3.5 w-3.5 text-green-500" />
                <span>Pagamento seguro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span>Garantia 7 dias</span>
              </div>
            </div>

            <div className="text-center">
              
            </div>
          </div>}

        {/* Step 3: PIX Display */}
        {step === 'pix' && pixData && <div className="space-y-4">
            <PixPaymentDisplay qrCode={pixData.qrCode} {...pixData.qrCodeBase64 ? {
          qrCodeBase64: pixData.qrCodeBase64
        } : {}} paymentId={pixData.paymentId} amount={planData.preco} currency={planData.moeda} onPaymentApproved={() => {}} />
            
          </div>}

        {/* Garantias */}
        <div className="mt-8 space-y-3">
          {[{
          icon: Shield,
          text: "Garantia incondicional de 7 dias"
        }, {
          icon: Zap,
          text: "Ativação imediata após pagamento"
        }, {
          icon: MessageCircle,
          text: "Suporte via WhatsApp incluído"
        }].map((item, i) => <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
              <item.icon className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>{item.text}</span>
            </div>)}
        </div>

        {/* Contato */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">Precisa de ajuda?</p>
          <a href={`https://wa.me/55${PLANS_CONTENT.configuracoes.whatsapp_numero}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            Fale conosco no WhatsApp
          </a>
        </div>

        {/* Links Legais */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center mb-3">
            Ao prosseguir com a compra, você concorda com nossos termos:
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            <button onClick={() => navigate('/terms')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Termos de Uso
            </button>
            <span className="text-border">•</span>
            <button onClick={() => navigate('/terms#pagamentos')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Pagamentos
            </button>
            <span className="text-border">•</span>
            <button onClick={() => navigate('/terms#reembolso')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Reembolso
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground mt-2">
            <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Privacidade
            </button>
            <span className="text-border">•</span>
            <button onClick={() => navigate('/cookies')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Cookies
            </button>
            <span className="text-border">•</span>
            <button onClick={() => navigate('/docs')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
              Documentação
            </button>
          </div>
        </div>
      </main>
    </div>;
};
export default CheckoutPage;