// ============================================
// PÁGINA DE PLANOS - STRIPE
// ============================================
// Para editar textos e dados, vá para: src/plans/data/content.ts
// Este arquivo só contém a estrutura da página

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createShopifyCheckout } from '@/lib/shopify-client';
import { getShopifyPlan } from '@/lib/shopify-products';
import { toast } from 'sonner';

// Importando os dados editáveis
import { PLANS_CONTENT } from './data/content';

// Importando os componentes
import { BenefitsSection } from './components/BenefitsSection';
import { PlanCard } from './components/PlanCard';
import { PlanSelector } from './components/PlanSelector';
import TestimonialsSection from './components/testimonialssection';
import { FAQSection } from './components/FAQSection';
import { FinalCTA } from './components/FinalCTA';
type BillingCycle = 'monthly' | 'yearly';
export const PlansPage = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const navigate = useNavigate();

  // Obter dados do plano atual baseado no ciclo selecionado
  const getCurrentPlanData = () => {
    return billingCycle === 'yearly' ? PLANS_CONTENT.planos.anual : PLANS_CONTENT.planos.mensal;
  };

  // Funções de ação
  const aoSelecionarPlano = async () => {
    try {
      setIsProcessingPayment(true);
      toast.info('Preparando checkout...', {
        description: 'Configurando seu plano de pagamento'
      });
      const plan = getShopifyPlan(billingCycle);
      if (!plan?.variantId) {
        throw new Error('Produto não configurado corretamente');
      }
      toast.info('Conectando com Shopify...', {
        description: 'Isso pode levar alguns segundos'
      });
      const checkoutUrl = await createShopifyCheckout(plan.variantId, 1);
      toast.success('Checkout preparado!', {
        description: 'Redirecionando para o pagamento...'
      });
      setTimeout(() => {
        window.open(checkoutUrl, '_blank');
      }, 1000);
    } catch (error) {
      console.error('❌ Erro ao processar:', error);
      toast.error('Erro ao criar checkout', {
        description: 'Tente novamente ou entre em contato com o suporte'
      });
      setTimeout(() => {
        toast.info('💬 Alternativa disponível', {
          description: 'Entre em contato conosco pelo WhatsApp',
          duration: 10000,
          action: {
            label: 'Contatar Suporte',
            onClick: () => {
              const planName = billingCycle === 'yearly' ? 'Anual' : 'Mensal';
              const message = encodeURIComponent(`Olá! Gostaria de contratar o plano ${planName}. Tive problemas no checkout online.`);
              window.open(`https://wa.me/5564996028022?text=${message}`, '_blank');
            }
          }
        });
      }, 3000);
    } finally {
      setIsProcessingPayment(false);
    }
  };
  const aoVoltar = () => {
    navigate('/');
  };
  return <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-gradient-to-br from-primary/15 to-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-primary/5 rounded-full blur-3xl animate-pulse" style={{
        animationDelay: '1s'
      }}></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/8 rounded-full blur-2xl animate-pulse" style={{
        animationDelay: '2s'
      }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 space-y-20">
        {/* Botão Voltar */}
        <div className="flex justify-between items-center mb-8">
          <Button variant="ghost" size="sm" onClick={aoVoltar} className="interactive-scale text-foreground hover:text-primary hover:bg-primary/10 border border-border/20 rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => navigate('/central-de-ajuda')} className="interactive-scale text-foreground hover:text-primary hover:bg-primary/10 border border-border/20 rounded-xl">
            <HelpCircle className="h-4 w-4 mr-2" />
            Ajuda
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent leading-tight">
            {PLANS_CONTENT.titulo_principal}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {PLANS_CONTENT.subtitulo_principal}
          </p>
        </div>

        {/* Seção de Benefícios */}
        <BenefitsSection mostrar={PLANS_CONTENT.vantagens.mostrar_secao} titulo={PLANS_CONTENT.vantagens.titulo} subtitulo={PLANS_CONTENT.vantagens.subtitulo} vantagens={PLANS_CONTENT.vantagens.lista} />

        {/* Seletor de Ciclo de Pagamento e Planos */}
        <div className="space-y-10">
          <PlanSelector selectedCycle={billingCycle} onCycleChange={setBillingCycle} />
          
          <div className="max-w-4xl mx-auto">
            <PlanCard plano={getCurrentPlanData()} aoSelecionarPlano={aoSelecionarPlano} isProcessing={isProcessingPayment} />
          </div>
        </div>

        {/* Métodos de Pagamento */}
        <div className="text-center space-y-4">
          <h3 className="text-2xl font-bold">Métodos de Pagamento Aceitos</h3>
          <div className="flex justify-center gap-4 flex-wrap">
            <div className="badge badge-lg badge-outline">💳 Cartão de Crédito ou Débito </div>
            <div className="badge badge-lg badge-outline">
              📱 PIX
            </div>
            
          </div>
          <p className="text-sm text-muted-foreground">Pagamento processado de forma segura pela Shopify</p>
        </div>

        {/* Depoimentos */}
        <TestimonialsSection mostrar={PLANS_CONTENT.depoimentos.mostrar_secao} titulo={PLANS_CONTENT.depoimentos.titulo} subtitulo={PLANS_CONTENT.depoimentos.subtitulo} depoimentos={PLANS_CONTENT.depoimentos.lista} />

        {/* FAQ */}
        <FAQSection mostrar={PLANS_CONTENT.perguntas_frequentes.mostrar_secao} titulo={PLANS_CONTENT.perguntas_frequentes.titulo} subtitulo={PLANS_CONTENT.perguntas_frequentes.subtitulo} perguntas={PLANS_CONTENT.perguntas_frequentes.lista} />

        {/* CTA Final */}
        <FinalCTA titulo={PLANS_CONTENT.secao_final.titulo} informacoesExtras={PLANS_CONTENT.configuracoes_gerais.informacoes_extras} botaoTexto={PLANS_CONTENT.secao_final.botao_texto} aoSelecionarPlano={aoSelecionarPlano} isProcessing={isProcessingPayment} />

        {/* Links do Rodapé */}
        <div className="flex justify-center gap-6 text-sm text-muted-foreground pt-10">
          <button onClick={() => navigate('/terms')} className="hover:text-primary">
            Termos de Uso
          </button>
          <button onClick={() => navigate('/privacy')} className="hover:text-primary">
            Política de Privacidade
          </button>
          <button onClick={() => navigate('/cookies')} className="hover:text-primary">
            Política de Cookies
          </button>
        </div>
      </div>
    </div>;
};