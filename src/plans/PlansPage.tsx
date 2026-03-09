// ============================================
// PÁGINA DE PLANOS - RESPONSIVE DESIGN
// ============================================
// Mobile-first com adaptações para desktop

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Check, Shield, Zap, Star, ChevronDown, ChevronUp, MessageCircle, Users, Smartphone, Receipt, Search, Download } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { PLANS_CONTENT } from './data/content';
import { usePlanPrice } from '@/hooks/usePlanPrice';
import { useAppInfo } from '@/hooks/useAppConfig';
import { useLicense } from '@/hooks/useLicense';

type BillingCycle = 'monthly' | 'yearly';

// Ícones para vantagens
const VANTAGEM_ICONS = [Zap, Search, Receipt, MessageCircle, Smartphone, Download];
export const PlansPage = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const navigate = useNavigate();
  const { name, logo } = useAppInfo();
  useLicense();
  const {
    price: monthlyPrice
  } = usePlanPrice('monthly', PLANS_CONTENT.planos.mensal.preco);
  const {
    price: yearlyPrice
  } = usePlanPrice('yearly', PLANS_CONTENT.planos.anual.preco);
  const currentPlan = billingCycle === 'yearly' ? PLANS_CONTENT.planos.anual : PLANS_CONTENT.planos.mensal;
  const currentPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
  const handleSelectPlan = () => {
    if (billingCycle === 'yearly') {
      navigate('/plans/a');
    } else {
      navigate('/plans/m');
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Header - Responsivo */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 lg:px-8 py-3 lg:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground -ml-2 p-2">
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden lg:inline ml-2">Voltar</span>
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt={name} className="h-8 lg:h-10" />
            <span className="hidden lg:inline font-bold text-lg text-foreground">{name}</span>
          </Link>
          <div className="w-9 lg:w-24" /> {/* Spacer para centralizar */}
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-32 lg:pb-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Section */}
          <section className="pt-6 lg:pt-16 pb-8 lg:pb-12 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-foreground leading-tight mb-3 lg:mb-4">
              {PLANS_CONTENT.titulo_principal}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base lg:text-xl max-w-md lg:max-w-2xl mx-auto">
              {PLANS_CONTENT.subtitulo_principal}
            </p>
          </section>

          {/* Trust Badges */}
          <section className="flex flex-wrap justify-center gap-2 lg:gap-4 mb-8 lg:mb-12">
            {[{
            icon: Shield,
            text: "7 dias de garantia"
          }, {
            icon: Zap,
            text: "Ativação imediata"
          }, {
            icon: MessageCircle,
            text: "Suporte WhatsApp"
          }].map((badge, i) => <div key={i} className="flex items-center gap-1.5 bg-muted/50 px-3 lg:px-4 py-1.5 lg:py-2 rounded-full">
                <badge.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-primary" />
                <span className="text-xs lg:text-sm text-muted-foreground">{badge.text}</span>
              </div>)}
          </section>

          {/* Desktop: Two Column Layout */}
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start">
            
            {/* Coluna esquerda: Planos */}
            <div>
              {/* Plan Selector */}
              <section className="mb-6 lg:mb-8">
                <div className="flex justify-center">
                  <div className="bg-muted p-1 lg:p-1.5 rounded-xl inline-flex">
                    <Button variant={billingCycle === 'monthly' ? 'default' : 'ghost'} size="sm" onClick={() => setBillingCycle('monthly')} className={`px-4 lg:px-6 py-2.5 lg:py-3 text-sm lg:text-base rounded-lg ${billingCycle === 'monthly' ? 'shadow-sm' : ''}`}>
                      Mensal
                    </Button>
                    <Button variant={billingCycle === 'yearly' ? 'default' : 'ghost'} size="sm" onClick={() => setBillingCycle('yearly')} className={`px-4 lg:px-6 py-2.5 lg:py-3 text-sm lg:text-base rounded-lg flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'shadow-sm' : ''}`}>
                      Anual
                      
                    </Button>
                  </div>
                </div>
              </section>

              {/* Plan Card */}
              <section className="mb-10">
                <div className="relative bg-card border-2 border-primary/20 rounded-2xl lg:rounded-3xl p-6 lg:p-10 max-w-md mx-auto shadow-lg">
                  {/* Badge de destaque */}
                  {currentPlan.mostrar_badge && <div className="absolute -top-3 lg:-top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 lg:px-5 py-1 lg:py-1.5 text-xs lg:text-sm font-semibold">
                        {currentPlan.badge_popular}
                      </Badge>
                    </div>}

                  {/* Perfil indicado */}
                  <p className="text-center text-xs lg:text-sm text-muted-foreground mb-4 lg:mb-6 flex items-center justify-center gap-1.5">
                    <Users className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    {currentPlan.perfil_indicado}
                  </p>

                  {/* Preço */}
                  <div className="text-center mb-6 lg:mb-8">
                    {currentPlan.preco_original > currentPrice && <div className="flex items-center justify-center gap-2 mb-1 lg:mb-2">
                        <span className="text-sm lg:text-base text-muted-foreground line-through">
                          {currentPlan.moeda}{currentPlan.preco_original.toFixed(2).replace('.', ',')}
                        </span>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-0 text-xs lg:text-sm">
                          {Math.round((currentPlan.preco_original - currentPrice) / currentPlan.preco_original * 100)}% OFF
                        </Badge>
                      </div>}
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm lg:text-lg text-muted-foreground">{currentPlan.moeda}</span>
                      <span className="text-5xl lg:text-7xl font-bold text-foreground">{currentPrice.toFixed(2).replace('.', ',')}</span>
                      <span className="text-muted-foreground lg:text-lg">{currentPlan.periodo}</span>
                    </div>
                    {currentPlan.economia_texto && <p className="text-green-500 text-sm lg:text-base font-medium mt-2 lg:mt-3">
                        ✨ {currentPlan.economia_texto}
                      </p>}
                  </div>

                  {/* Benefícios */}
                  <ul className="space-y-3 lg:space-y-4 mb-6 lg:mb-8">
                    {currentPlan.beneficios.map((beneficio, i) => <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 lg:h-6 lg:w-6 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm lg:text-base text-foreground">{beneficio}</span>
                      </li>)}
                  </ul>

                  {/* CTA Principal */}
                  <Button onClick={handleSelectPlan} className="w-full py-6 lg:py-7 text-base lg:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                    {PLANS_CONTENT.configuracoes_gerais.botao_texto}
                  </Button>

                  {/* Info extra */}
                  <p className="text-center text-xs lg:text-sm text-muted-foreground mt-4">
                    {PLANS_CONTENT.configuracoes_gerais.informacoes_extras}
                  </p>
                </div>
              </section>
            </div>

            {/* Coluna direita: Vantagens (Desktop) */}
            <div className="hidden lg:block">
              {PLANS_CONTENT.vantagens.mostrar_secao && <div className="bg-muted/30 rounded-3xl p-8 border border-border/30">
                  <h2 className="text-2xl font-bold mb-2">
                    {PLANS_CONTENT.vantagens.titulo}
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    {PLANS_CONTENT.vantagens.subtitulo}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {PLANS_CONTENT.vantagens.lista.slice(0, 6).map((vantagem, i) => {
                  const Icon = VANTAGEM_ICONS[i] || Zap;
                  return <div key={i} className="bg-background rounded-xl p-5 border border-border/50">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="font-medium text-foreground mb-1">
                            {vantagem.titulo}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {vantagem.descricao}
                          </p>
                        </div>;
                })}
                  </div>
                </div>}
            </div>
          </div>

          {/* O que resolve - Mobile Grid */}
          {PLANS_CONTENT.vantagens.mostrar_secao && <section className="mb-12 lg:hidden">
              <h2 className="text-xl font-bold text-center mb-2">
                {PLANS_CONTENT.vantagens.titulo}
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-6">
                {PLANS_CONTENT.vantagens.subtitulo}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {PLANS_CONTENT.vantagens.lista.slice(0, 6).map((vantagem, i) => {
              const Icon = VANTAGEM_ICONS[i] || Zap;
              return <div key={i} className="bg-card border border-border/50 rounded-xl p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-1 leading-tight">
                        {vantagem.titulo}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {vantagem.descricao}
                      </p>
                    </div>;
            })}
              </div>
            </section>}

          {/* Depoimentos */}
          {PLANS_CONTENT.depoimentos.mostrar_secao && <section className="mb-12 lg:mb-20">
              <h2 className="text-xl lg:text-3xl font-bold text-center mb-2 lg:mb-4">
                {PLANS_CONTENT.depoimentos.titulo}
              </h2>
              <p className="text-sm lg:text-lg text-muted-foreground text-center mb-6 lg:mb-12">
                {PLANS_CONTENT.depoimentos.subtitulo}
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 max-w-6xl mx-auto">
                {PLANS_CONTENT.depoimentos.lista.map((depoimento, i) => <div key={i} className="bg-card border border-border/50 rounded-xl lg:rounded-2xl p-4 lg:p-6">
                    <div className="flex items-center gap-1 mb-2 lg:mb-4">
                      {[...Array(depoimento.nota)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 lg:h-5 lg:w-5 fill-primary text-primary" />)}
                    </div>
                    <p className="text-sm lg:text-base text-foreground mb-3 lg:mb-6 italic leading-relaxed">
                      "{depoimento.texto}"
                    </p>
                    <div className="flex items-center gap-2 lg:gap-3">
                      
                      <div>
                        <p className="text-sm lg:text-base font-medium text-foreground">{depoimento.nome}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground">{depoimento.cargo}</p>
                      </div>
                    </div>
                  </div>)}
              </div>
            </section>}

          {/* FAQ */}
          {PLANS_CONTENT.perguntas_frequentes.mostrar_secao && <section className="mb-12 lg:mb-20 max-w-3xl mx-auto">
              <h2 className="text-xl lg:text-3xl font-bold text-center mb-2 lg:mb-4">
                {PLANS_CONTENT.perguntas_frequentes.titulo}
              </h2>
              <p className="text-sm lg:text-lg text-muted-foreground text-center mb-6 lg:mb-12">
                {PLANS_CONTENT.perguntas_frequentes.subtitulo}
              </p>
              
              <div className="space-y-2 lg:space-y-3">
                {PLANS_CONTENT.perguntas_frequentes.lista.map((faq, i) => <div key={i} className="bg-card border border-border/50 rounded-xl lg:rounded-2xl overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 lg:p-6 text-left">
                      <span className="text-sm lg:text-lg font-medium text-foreground pr-4">
                        {faq.pergunta}
                      </span>
                      {expandedFaq === i ? <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedFaq === i && <div className="px-4 lg:px-6 pb-4 lg:pb-6">
                        <p className="text-sm lg:text-base text-muted-foreground">
                          {faq.resposta}
                        </p>
                      </div>}
                  </div>)}
              </div>
            </section>}

          {/* CTA Final */}
          <section className="text-center mb-8 lg:mb-16">
            <h2 className="text-xl lg:text-4xl font-bold mb-2 lg:mb-4">
              {PLANS_CONTENT.secao_final.titulo}
            </h2>
            <p className="text-sm lg:text-lg text-muted-foreground mb-6 lg:mb-10">
              {PLANS_CONTENT.secao_final.subtitulo}
            </p>
            <Button onClick={handleSelectPlan} className="px-8 lg:px-12 py-6 lg:py-7 text-base lg:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
              {PLANS_CONTENT.secao_final.botao_texto}
            </Button>
          </section>

          {/* Footer Links */}
          <footer className="text-center space-y-4 pt-8 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Ao assinar, você concorda com nossos termos e políticas
            </p>
            <div className="flex flex-wrap justify-center gap-4 lg:gap-8 text-xs lg:text-sm text-muted-foreground">
              <button onClick={() => navigate('/terms')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Termos de Uso
              </button>
              <button onClick={() => navigate('/terms#pagamentos')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Pagamentos e Cobrança
              </button>
              <button onClick={() => navigate('/terms#reembolso')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Política de Reembolso
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-4 lg:gap-8 text-xs lg:text-sm text-muted-foreground">
              <button onClick={() => navigate('/privacy')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Privacidade
              </button>
              <button onClick={() => navigate('/cookies')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Cookies
              </button>
              <button onClick={() => navigate('/docs')} className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                Documentação
              </button>
            </div>
          </footer>
        </div>
      </main>

      {/* CTA Fixo Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 p-4 lg:hidden z-40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{currentPlan.nome}</p>
            <p className="text-lg font-bold text-foreground">
              {currentPlan.moeda}{currentPrice.toFixed(2).replace('.', ',')}<span className="text-sm font-normal text-muted-foreground">{currentPlan.periodo}</span>
            </p>
          </div>
          <Button onClick={handleSelectPlan} className="px-6 py-3 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
            Assinar
          </Button>
        </div>
      </div>
    </div>;
};