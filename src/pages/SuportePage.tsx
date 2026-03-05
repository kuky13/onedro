import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Mail,
  ChevronDown,
  ArrowLeft,
  HelpCircle,
  Users,
  Headphones,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react";

// Dados dos canais de suporte
const CANAIS = [
  {
    title: "WhatsApp",
    description: "Atendimento rápido e direto",
    icon: MessageCircle,
    color: "bg-green-500",
    link: "https://wa.me/5564996028022",
    availability: "24/7",
    responseTime: "Imediato",
  },
  {
    title: "Discord",
    description: "Comunidade e suporte técnico",
    icon: Users,
    color: "bg-indigo-500",
    link: "https://discord.gg/a3X4DC8rjY",
    availability: "24/7",
    responseTime: "1-2 horas",
  },
  {
    title: "E-mail",
    description: "Questões detalhadas",
    icon: Mail,
    color: "bg-blue-500",
    link: "mailto:suporte@onedrip.email",
    availability: "Seg-Sex",
    responseTime: "4-8 horas",
  },
];

// FAQ items
const FAQ = [
  {
    question: "Como faço para redefinir minha senha?",
    answer:
      "Acesse a página de login e clique em 'Esqueci minha senha'. Digite seu e-mail e siga as instruções enviadas para sua caixa de entrada.",
  },
  {
    question: "Posso usar o sistema no celular?",
    answer:
      "Sim! O OneDrip é totalmente responsivo e funciona perfeitamente em smartphones e tablets através do navegador ou App instalado.",
  },
  {
    question: "Como cancelar minha assinatura?",
    answer:
      "Entre em contato conosco pelo WhatsApp ou e-mail para solicitar o cancelamento. O processo é simples e rápido.",
  },
  {
    question: "E se eu não gostar do sistema?",
    answer: "Você tem 7 dias grátis para testar. Se não gostar, basta não continuar. Sem compromisso e sem cobranças.",
  },
  {
    question: "Meus dados ficam seguros?",
    answer: "Sim! Seus dados são criptografados e armazenados com segurança em servidores de alta disponibilidade.",
  },
];

// Vantagens do suporte
const VANTAGENS = [
  { icon: Zap, text: "Resposta rápida" },
  { icon: Clock, text: "Suporte 24/7" },
];

const SuportePage = () => {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-7xl mx-auto lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">OneDrip</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-muted-foreground font-medium">
                Entrar
              </Button>
            </Link>
            <Link to="/sign">
              <Button size="sm" className="font-medium">
                Criar conta
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 py-8 lg:py-16">
          <div className="max-w-7xl mx-auto">
            <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
              {/* Left - Text */}
              <div className="text-center lg:text-left space-y-4 lg:space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  <Headphones className="w-4 h-4" />
                  Suporte OneDrip
                </div>

                <h1 className="text-3xl lg:text-5xl font-bold text-foreground leading-tight">
                  Estamos aqui para <span className="text-primary">ajudar você</span>
                </h1>

                <p className="text-muted-foreground text-base lg:text-lg max-w-lg mx-auto lg:mx-0">
                  Escolha o canal de atendimento que preferir. Nossa equipe está pronta para resolver suas dúvidas.
                </p>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                  {VANTAGENS.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <item.icon className="w-3.5 h-3.5 text-primary" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Drippy AI Card (Desktop) */}
              <div className="hidden lg:block">
                <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-border/60 rounded-2xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <img
                        src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                        alt="Drippy"
                        className="w-16 h-16 rounded-full border-2 border-primary/30"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground">Drippy - Assistente IA</h3>
                      <p className="text-sm text-muted-foreground">Suporte inteligente 24/7</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Converse com nossa assistente virtual para obter respostas rápidas sobre a plataforma.
                  </p>
                  <Link to="/chat">
                    <Button className="w-full font-semibold">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Conversar com Drippy
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Drippy Card Mobile */}
        <section className="px-4 pb-8 lg:hidden">
          <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-border/60 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                  alt="Drippy"
                  className="w-12 h-12 rounded-full border-2 border-primary/30"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div>
                <h3 className="font-bold text-foreground">Drippy - IA</h3>
                <p className="text-xs text-muted-foreground">Suporte 24/7</p>
              </div>
            </div>
            <Link to="/chat">
              <Button className="w-full font-semibold" size="sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                Conversar com Drippy
              </Button>
            </Link>
          </div>
        </section>

        {/* Canais de Suporte */}
        <section className="px-4 py-8 lg:py-12 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 lg:mb-12">
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Canais de Atendimento</h2>
              <p className="text-muted-foreground">Escolha como prefere entrar em contato</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
              {CANAIS.map((canal, index) => {
                const IconComponent = canal.icon;
                return (
                  <a
                    key={index}
                    href={canal.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-card border border-border/60 rounded-xl p-5 lg:p-6 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl ${canal.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md`}
                      >
                        <IconComponent className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-lg mb-1">{canal.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{canal.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            {canal.availability}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            <Zap className="w-3 h-3" />
                            {canal.responseTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-4 py-8 lg:py-16">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8 lg:mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-full text-sm font-medium mb-4">
                <HelpCircle className="w-4 h-4" />
                Dúvidas frequentes
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Perguntas Frequentes</h2>
              <p className="text-muted-foreground">Respostas rápidas para as dúvidas mais comuns</p>
            </div>

            <div className="space-y-3">
              {FAQ.map((item, index) => (
                <div key={index} className="bg-card border border-border/60 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full flex items-center justify-between p-4 lg:p-5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <span className="font-medium text-foreground pr-4">{item.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                        expandedFAQ === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFAQ === index && (
                    <div className="px-4 pb-4 lg:px-5 lg:pb-5">
                      <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="px-4 py-8 lg:py-16 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">Ainda precisa de ajuda?</h2>
            <p className="text-muted-foreground mb-6 lg:mb-8">Nossa equipe está sempre pronta para ajudar você</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://wa.me/5564996028022" target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-green-500 hover:bg-green-600 font-semibold">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
              <a href="https://discord.gg/a3X4DC8rjY" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full sm:w-auto font-semibold">
                  <Users className="w-4 h-4 mr-2" />
                  Discord
                </Button>
              </a>
            </div>

            {/* Benefits */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Resposta rápida</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Suporte em português</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Equipe especializada</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} OneDrip. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Link to="/terms" className="hover:text-foreground transition-colors">
                Termos
              </Link>
              <span>•</span>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <span>•</span>
              <Link to="/cookies" className="hover:text-foreground transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/40 lg:hidden">
        <a href="https://wa.me/5564996028022" target="_blank" rel="noopener noreferrer">
          <Button className="w-full h-12 font-semibold bg-green-500 hover:bg-green-600">
            <MessageCircle className="w-5 h-5 mr-2" />
            Falar com Suporte
          </Button>
        </a>
      </div>

      {/* Spacer for fixed CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default SuportePage;
