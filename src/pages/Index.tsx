import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Users,
  Shield,
  ArrowRight,
  CheckCircle,
  Zap,
  Clock,
  Smartphone,
  Star,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  MessageCircle,
  Download,
  Wrench,
  Store } from
"lucide-react";
import { DashboardSkeleton } from "@/components/ui/loading-states";
import { useAppInfo } from "@/hooks/useAppConfig";

import { PWATestAccessButton } from "@/components/pwa/PWATestAccessButton";

// Brand SVG components (inline to avoid 705KB of PNG downloads)
const BrandLG = () => (
  <svg viewBox="0 0 80 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="28" fontWeight="bold" fontFamily="Arial" letterSpacing="1">LG</text>
  </svg>
);

const BrandHuawei = () => (
  <svg viewBox="0 0 120 40" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="Arial" letterSpacing="-1">HUAWEI</text>
  </svg>
);

const BrandRealme = () => (
  <svg viewBox="0 0 100 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="Arial" letterSpacing="-0.5">realme</text>
  </svg>
);

const BrandSamsung = () => (
  <svg viewBox="0 0 140 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="Arial" letterSpacing="2">SAMSUNG</text>
  </svg>
);

const BrandXiaomi = () => (
  <svg viewBox="0 0 100 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="24" fontWeight="bold" fontFamily="Arial">Xiaomi</text>
  </svg>
);

const BrandOppo = () => (
  <svg viewBox="0 0 80 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="26" fontWeight="bold" fontFamily="Arial" letterSpacing="2">OPPO</text>
  </svg>
);

const BrandApple = () => (
  <svg viewBox="0 0 814 1000" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.8-155.5-127.4c-58.6-82-106.7-211.6-106.7-334.8 0-196.7 127.8-301.1 253.7-301.1 66.8 0 122.4 43.9 164.2 43.9 39.9 0 102-46.5 177.6-46.5 28.7 0 131.8 2.6 199.8 97.9zM554.1 159.4c31.1-36.9 53.1-88.1 53.1-139.4 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.7 32.4-55.3 83.6-55.3 135.6 0 7.8.6 15.7 1.3 18.2 2.6.6 6.4 1.3 10.2 1.3 45.4 0 103-30.4 139.7-71.4z"/>
  </svg>
);

const BrandVivo = () => (
  <svg viewBox="0 0 70 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="26" fontWeight="bold" fontFamily="Arial">vivo</text>
  </svg>
);

const BrandMotorola = () => (
  <svg viewBox="0 0 140 30" className="h-full w-auto max-h-5 lg:max-h-8 opacity-60" fill="currentColor">
    <text x="0" y="24" fontSize="22" fontWeight="bold" fontFamily="Arial" letterSpacing="1">MOTOROLA</text>
  </svg>
);

const BRANDS = [
  { name: "LG", Component: BrandLG },
  { name: "Huawei", Component: BrandHuawei },
  { name: "Realme", Component: BrandRealme },
  { name: "Samsung", Component: BrandSamsung },
  { name: "Xiaomi", Component: BrandXiaomi },
  { name: "Oppo", Component: BrandOppo },
  { name: "Apple", Component: BrandApple },
  { name: "Vivo", Component: BrandVivo },
  { name: "Motorola", Component: BrandMotorola },
];


// Vantagens práticas para técnicos
const VANTAGENS = [
{
  icone: Zap,
  titulo: "Orçamento em 2 minutos",
  descricao: "Sem papel, sem demora. Cliente recebe na hora."
},
{
  icone: Search,
  titulo: "Busca instantânea",
  descricao: "Encontre qualquer orçamento em segundos."
},
{
  icone: Receipt,
  titulo: "PDF profissional",
  descricao: "Orçamentos com logo e dados da sua loja."
},
{
  icone: MessageCircle,
  titulo: "Envio via WhatsApp",
  descricao: "Um toque e o cliente recebe o orçamento."
},
{
  icone: Smartphone,
  titulo: "Adaptado para celular",
  descricao: "Use direto do balcão, sem computador."
},
{
  icone: Download,
  titulo: "Backup automático",
  descricao: "Nunca mais perca dados de clientes."
}];


// Funcionalidades principais
const FUNCIONALIDADES = [
{
  icone: FileText,
  titulo: "Orçamentos Inteligentes",
  descricao: "PDF personalizado, WhatsApp integrado, validade automática."
},
{
  icone: Users,
  titulo: "Gestão de Clientes",
  descricao: "Histórico completo, busca rápida, dados organizados."
},
{
  icone: Shield,
  titulo: "Ordem de Serviço",
  descricao: "Acompanhamento em tempo real, status automático."
},
{
  icone: Wrench,
  titulo: "Controle de Reparos",
  descricao: "Quanto entrou, quanto cada técnico fez."
},
{
  icone: Store,
  titulo: "Loja Virtual",
  descricao: "Catálogo online com pedidos via WhatsApp."
}];


// Depoimentos
const DEPOIMENTOS = [
{
  nome: "Paulo oliveira",
  cargo: "Proprietário - Oliveira Imports",
  rating: 4.5,
  texto:
  "Antes eu perdia clientes por causa do orçamento e Agora faço em 2 min e envio para o cliente um PDF e uma mensagem no Whatsapp."
},
{
  nome: "Maria",
  cargo: "Atendente de assistência",
  rating: 4.2,
  texto: "Consigo achar qualquer Orçamento em segundos. Organizou completamente minha rotina."
},
{
  nome: "André",
  cargo: "Técnico - Oliveira Imports",
  rating: 5.0,
  texto: "Minha rotina na assistência ficou muito mais facil pra salvar ordens de serviço e os reparos que eu fiz."
}];


const StarRating = ({ rating }: {rating: number;}) => {
  return (
    <div className="flex items-center gap-1 mb-2 lg:mb-4">
      {[1, 2, 3, 4, 5].map((star) => {
        const fillPercentage = Math.max(0, Math.min(100, (rating - (star - 1)) * 100));
        return (
          <div key={star} className="relative inline-block">
            {/* Base Star (Empty/Gray) */}
            <Star className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-gray-300 fill-gray-100" />
            
            {/* Filled Star Overlay */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillPercentage}%` }}>

              <Star className="h-3.5 w-3.5 lg:h-5 lg:w-5 text-amber-400 fill-amber-400" />
            </div>
          </div>);

      })}
    </div>);

};

// FAQ
const FAQ = [
{
  pergunta: "Funciona no celular?",
  resposta: "Sim, 100%. Você usa direto do balcão, sem precisar de computador."
},
{
  pergunta: "E se eu não gostar?",
  resposta: "7 dias grátis pra testar. Não gostou, não paga nada."
},
{
  pergunta: "Preciso instalar algo?",
  resposta: "Não. Acessa pelo navegador do celular ou computador."
},
{
  pergunta: "Meus dados ficam seguros?",
  resposta: "Backup automático na nuvem. Mesmo que perca o celular, seus dados estão salvos."
}];

const InfiniteBrandCarousel = () => {
  return (
    <div className="w-full overflow-hidden py-6 lg:py-10 bg-muted/5">
      <p className="text-center text-xs lg:text-sm text-muted-foreground mb-4 lg:mb-6 px-4">
        Trabalhe com todas as marcas
      </p>
      <div className="relative w-full">
        <div className="absolute left-0 top-0 bottom-0 w-12 lg:w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-12 lg:w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex w-max animate-infinite-scroll [animation-duration:60s]">
          {[1, 2, 3, 4].map((copy) =>
          <div key={copy} className="flex items-center gap-8 lg:gap-16 px-4">
              {BRANDS.map((brand, idx) => {
                const BrandIcon = brand.Component;
                return (
                  <div
                    key={`${brand.name}-${copy}-${idx}`}
                    className="flex items-center justify-center min-w-[60px] lg:min-w-[100px] h-8 lg:h-12 text-foreground">
                    <BrandIcon />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>);

};
const Index = () => {
  const { user, loading } = useAuth();
  const { name, logo } = useAppInfo();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  if (loading) {
    return <DashboardSkeleton />;
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header - Responsivo */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4">
          <Link to="/landing" className="flex items-center gap-2">
            <img 
              alt={name} 
              className="h-7 w-7 lg:h-9 lg:w-9" 
              src={logo} 
              width="36"
              height="36"
              fetchPriority="high"
            />
            <span className="font-bold text-lg lg:text-xl text-foreground">{name}</span>
          </Link>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button asChild variant="ghost" size="sm" className="text-sm lg:text-base">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="text-sm lg:text-base lg:px-6 bg-primary hover:bg-primary/90">
              <Link to="/sign">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* PWA Test Access */}
      <PWATestAccessButton />

      {/* Hero Section - Desktop: Two Columns */}
      <section className="px-4 lg:px-8 pt-8 lg:pt-20 pb-6 lg:pb-16">
        <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center">
          {/* Coluna de texto */}
          <div className="lg:pr-8">
            {/* Badge de Confiança */}
            <div className="flex justify-center lg:justify-start mb-4 lg:mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <CheckCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-500" />
                <span className="text-xs lg:text-sm font-medium text-green-600">7 dias grátis para testar</span>
              </div>
            </div>

            {/* Título Principal */}
            <h1 className="text-2xl sm:text-3xl lg:text-5xl xl:text-6xl font-bold text-center lg:text-left text-foreground mb-3 lg:mb-6 leading-tight">
              Sistema de Orçamentos
              <br />
              <span className="text-primary">para Assistências Técnicas</span>
            </h1>

            {/* Subtítulo Prático */}
            <p className="text-center lg:text-left text-muted-foreground text-sm lg:text-lg mb-6 lg:mb-8 max-w-sm lg:max-w-none mx-auto lg:mx-0">
              Crie orçamentos profissionais em 2 minutos. Envie por WhatsApp. Organize sua assistência.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 max-w-sm lg:max-w-md mx-auto lg:mx-0">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto h-12 lg:h-14 text-base lg:text-lg font-semibold bg-primary hover:bg-primary/90 lg:px-8">

                <Link to="/sign" className="flex items-center justify-center gap-2">
                  Começar grátis
                  <ArrowRight className="h-4 w-4 lg:h-5 lg:w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 lg:h-14 text-base lg:text-lg lg:px-8">

                <Link to="/plans">Ver planos e preços</Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center lg:justify-start gap-4 lg:gap-6 mt-6 lg:mt-10 text-xs lg:text-sm text-muted-foreground">
              <div className="flex items-center gap-1 lg:gap-2">
                <Shield className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span>Dados seguros</span>
              </div>
              <div className="flex items-center gap-1 lg:gap-2">
                <Smartphone className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span>Adaptado para celular</span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Suporte rápido</span>
              </div>
            </div>
          </div>

          {/* Coluna de imagem/ilustração - Desktop only */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              {/* Mock de interface */}
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 transform rotate-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Orçamento #134</p>
                      <p className="text-sm text-muted-foreground">Samsung S23 Troca de Bateria </p>
                    </div>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold text-foreground">R$ 420,00</span>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Enviar via WhatsApp
                  </Button>
                </div>
              </div>
              {/* Badge flutuante */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                ✓ Enviado
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Carrossel de Marcas */}
      <InfiniteBrandCarousel />

      {/* Seção: O que você ganha */}
      <section className="px-4 lg:px-8 py-8 lg:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg lg:text-3xl font-bold text-center text-foreground mb-2 lg:mb-4">
            O que muda na sua rotina
          </h2>
          <p className="text-center text-muted-foreground text-sm lg:text-lg mb-6 lg:mb-12">
            Resultados práticos no dia a dia
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 max-w-lg lg:max-w-5xl mx-auto">
            {VANTAGENS.map((item, idx) => {
              const Icon = item.icone;
              return (
                <div
                  key={idx}
                  className="bg-background rounded-xl lg:rounded-2xl p-4 lg:p-6 border border-border/50 hover:border-primary/30 transition-colors">

                  <div className="w-9 h-9 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl bg-primary/10 flex items-center justify-center mb-2 lg:mb-4">
                    <Icon className="h-4 w-4 lg:h-7 lg:w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm lg:text-lg text-foreground mb-1 lg:mb-2">{item.titulo}</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed">{item.descricao}</p>
                </div>);

            })}
          </div>
        </div>
      </section>

      {/* Seção: Funcionalidades */}
      <section className="px-4 lg:px-8 py-8 lg:py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg lg:text-3xl font-bold text-center text-foreground mb-6 lg:mb-12">
            Tudo que você precisa
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-6 max-w-lg lg:max-w-6xl mx-auto">
            {FUNCIONALIDADES.map((item, idx) => {
              const Icon = item.icone;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 lg:gap-4 p-4 lg:p-6 bg-muted/20 rounded-xl lg:rounded-2xl border border-border/30 hover:border-primary/30 transition-colors">

                  <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-lg lg:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 lg:h-7 lg:w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm lg:text-lg text-foreground mb-0.5 lg:mb-2">{item.titulo}</h3>
                    <p className="text-xs lg:text-sm text-muted-foreground">{item.descricao}</p>
                  </div>
                </div>);

            })}
          </div>
        </div>
      </section>

      {/* Seção: Depoimentos */}
      <section className="px-4 lg:px-8 py-8 lg:py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg lg:text-3xl font-bold text-center text-foreground mb-2 lg:mb-4">Quem usa, aprova</h2>
          <p className="text-center text-muted-foreground text-sm lg:text-lg mb-6 lg:mb-12">
            Resultados reais de técnicos
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-6 max-w-lg lg:max-w-6xl mx-auto">
            {DEPOIMENTOS.map((dep, idx) =>
            <div key={idx} className="bg-background rounded-xl lg:rounded-2xl p-4 lg:p-8 border border-border/50">
                <StarRating rating={dep.rating} />
                <p className="text-sm lg:text-base text-foreground mb-3 lg:mb-6 leading-relaxed">"{dep.texto}"</p>
                <div>
                  <p className="font-semibold text-sm lg:text-base text-foreground">{dep.nome}</p>
                  <p className="text-xs lg:text-sm text-muted-foreground">{dep.cargo}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Seção: FAQ */}
      <section className="px-4 lg:px-8 py-8 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg lg:text-3xl font-bold text-center text-foreground mb-6 lg:mb-12">
            Dúvidas frequentes
          </h2>

          <div className="space-y-2 lg:space-y-3">
            {FAQ.map((item, idx) =>
            <div key={idx} className="bg-muted/20 rounded-xl lg:rounded-2xl border border-border/30 overflow-hidden">
                <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 lg:p-6 text-left">

                  <span className="font-medium text-sm lg:text-lg text-foreground">{item.pergunta}</span>
                  {expandedFaq === idx ?
                <ChevronUp className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" /> :

                <ChevronDown className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground flex-shrink-0" />
                }
                </button>
                {expandedFaq === idx &&
              <div className="px-4 lg:px-6 pb-4 lg:pb-6">
                    <p className="text-sm lg:text-base text-muted-foreground">{item.resposta}</p>
                  </div>
              }
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-4 lg:px-8 py-10 lg:py-20 bg-primary/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl lg:text-4xl font-bold text-foreground mb-2 lg:mb-4">
            Pronto pra organizar sua assistência?
          </h2>
          <p className="text-sm lg:text-lg text-muted-foreground mb-6 lg:mb-10">
            Teste grátis por 7 dias. Sem compromisso.
          </p>
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto h-12 lg:h-16 text-base lg:text-xl font-semibold bg-primary hover:bg-primary/90 lg:px-12">

            <Link to="/sign" className="flex items-center justify-center gap-2">
              Criar conta grátis
              <ArrowRight className="h-4 w-4 lg:h-6 lg:w-6" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 lg:px-8 py-8 lg:py-12 border-t border-border/30 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <img alt={name} className="h-6 w-6 lg:h-8 lg:w-8" src={logo} />
              <span className="font-bold text-foreground lg:text-lg">{name}</span>
            </div>

            <p className="text-center lg:text-left text-xs lg:text-sm text-muted-foreground">
              © 2026 Desenvolvendo ideias, Entregando soluções
            </p>

            <div className="flex justify-center lg:justify-end items-center gap-3 lg:gap-6 text-xs lg:text-sm">
              <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                Termos
              </Link>
              <span className="text-border">•</span>
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <span className="text-border">•</span>
              <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
          </div>

          <div className="flex justify-center mt-6 lg:mt-8">
            <Link
              to="/kukysolutions"
              className="flex items-center gap-1.5 text-xs lg:text-sm text-muted-foreground hover:text-foreground transition-colors">

              <img 
                src="/kukysolutions-logo.svg" 
                alt="KukySolutions" 
                className="h-4 w-4 lg:h-5 lg:w-5 opacity-70"
                width="20"
                height="20"
                loading="lazy"
              />
              KukySolutions
            </Link>
          </div>
        </div>
      </footer>

      {/* CTA Fixo Mobile - apenas mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur border-t border-border/50 lg:hidden z-40">
        <Button asChild size="lg" className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90">
          <Link to="/sign" className="flex items-center justify-center gap-2">
            Começar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Spacer para o CTA fixo - apenas mobile */}
      <div className="h-16 lg:hidden" />
    </div>);

};
export default Index;