import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Mail, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  HelpCircle,
  Users,
  Headphones,
  MessageSquare,
  Home
} from "lucide-react";
import { toast } from "sonner";

interface FAQItem {
  question: string;
  answer: string;
}

const SuportePage = () => {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const navigate = useNavigate();

  const supportChannels = [
    {
      title: "WhatsApp",
      description: "Suporte rápido e direto via WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      link: "https://wa.me/5564996028022",
      availability: "24/7",
      responseTime: "Imediato",
      instructions: [
        "Clique no botão abaixo para abrir o WhatsApp",
        "Envie sua dúvida ou problema",
        "Aguarde o retorno da nossa equipe",
        "Mantenha o chat aberto para acompanhar a conversa"
      ]
    },
    {
      title: "Discord",
      description: "Comunidade e suporte técnico especializado",
      icon: Users,
      color: "bg-indigo-500 hover:bg-indigo-600",
      link: "https://discord.gg/a3X4DC8rjY",
      availability: "24/7",
      responseTime: "1-2 horas",
      instructions: [
        "Entre no nosso servidor Discord",
        "Acesse o canal #suporte",
        "Descreva seu problema detalhadamente",
        "Interaja com a comunidade e moderadores"
      ]
    },
    {
      title: "E-mail",
      description: "Central de ajuda para questões detalhadas",
      icon: Mail,
      color: "bg-blue-500 hover:bg-blue-600",
      link: "mailto:suporte@onedrip.email",
      availability: "Seg-Sex 9h-18h",
      responseTime: "4-8 horas",
      instructions: [
        "Envie um e-mail para suporte@onedrip.email",
        "Inclua o máximo de detalhes possível",
        "Anexe prints ou arquivos se necessário",
        "Aguarde nossa resposta em até 8 horas úteis"
      ]
    }
  ];

  const faqItems: FAQItem[] = [
    {
      question: "Como faço para redefinir minha senha?",
      answer: "Acesse a página de login e clique em 'Esqueci minha senha'. Digite seu e-mail e siga as instruções enviadas para sua caixa de entrada."
    },
    {
      question: "Como posso alterar meus dados pessoais?",
      answer: "Entre no seu painel, vá em 'Configurações' > 'Perfil' e edite as informações desejadas. Não se esqueça de salvar as alterações."
    },
    {
      question: "O que fazer se não estou recebendo e-mails do sistema?",
      answer: "Verifique sua caixa de spam/lixo eletrônico. Adicione nosso domínio (@onedrip.email) à sua lista de remetentes confiáveis."
    },
    {
      question: "Como cancelar minha assinatura?",
      answer: "Acesse 'Configurações' > 'entre em contato conosco' para cancelar sua assinatura."
    },
    {
      question: "Posso usar o sistema em dispositivos móveis?",
      answer: "Sim! Nosso sistema é totalmente responsivo e funciona perfeitamente em smartphones e tablets através do navegador."
    },
    {
      question: "Como faço backup dos meus dados?",
      answer: "Vá em 'Configurações' > 'Dados' e clique em 'Exportar dados'. Você receberá um arquivo com todas suas informações."
    }
  ];

  const handleChannelClick = (link: string, title: string) => {
    window.open(link, '_blank');
    toast.success(`Redirecionando para ${title}...`);
  };

  const handleHelpCenterClick = () => {
    navigate('/central-de-ajuda');
    toast.success('Redirecionando para Central de Ajuda...');
  };

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Botão MENU no topo */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Home className="mr-2 h-4 w-4" />
            MENU
          </Button>
        </div>
        
        {/* Drippy AI Section - Destacada no Topo */}
        <section className="mb-12">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/30 shadow-xl">
            <CardContent className="pt-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <img 
                      src="/lovable-uploads/e12ec9f1-06ab-4f49-8d81-78a481c5b4c0.png"
                      alt="Drippy - Assistente Virtual OneDrip"
                      className="w-24 h-24 rounded-full shadow-xl border-4 border-primary/30"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-4 border-background animate-pulse shadow-lg"></div>
                  </div>
                </div>
                
                <h2 className="text-3xl font-bold mb-4 text-primary">🤖 Conheça a Drippy - Sua Assistente IA</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  Sua assistente virtual inteligente da OneDrip! A Drippy pode te ajudar com dúvidas sobre a plataforma, 
                  funcionalidades e muito mais. Converse com ela para um suporte personalizado e rápido.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button 
                    onClick={() => navigate('/drippy')}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Conversar com a Drippy
                  </Button>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    ✨ Suporte 24/7 com IA
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        
        {/* Canais de Suporte */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
              <Headphones className="h-6 w-6 text-primary" />
              Canais de Suporte
            </h2>
            <p className="text-muted-foreground text-lg">
              Escolha o canal que melhor atende às suas necessidades
            </p>
          </div>

          {/* Container centralizado para os cards */}
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              {supportChannels.map((channel, index) => {
                const IconComponent = channel.icon;
                return (
                  <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30 w-full max-w-sm h-full flex flex-col">
                    <CardHeader className="text-center pb-4 flex-shrink-0">
                      <div className={`w-20 h-20 rounded-full ${channel.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                        <IconComponent className="h-10 w-10 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold">{channel.title}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {channel.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-grow flex flex-col">
                      <div className="space-y-3 flex-grow">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Disponível:</span>
                          </div>
                          <Badge variant="outline" className="font-medium">{channel.availability}</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Resposta:</span>
                          <Badge variant="secondary" className="font-medium">{channel.responseTime}</Badge>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-foreground">Como usar:</h4>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {channel.instructions.map((instruction, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-primary font-bold text-sm">{idx + 1}.</span>
                                <span className="leading-relaxed">{instruction}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleChannelClick(channel.link, channel.title)}
                        className={`w-full ${channel.color} text-white hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg font-semibold py-3 mt-auto`}
                        size="lg"
                      >
                        Acessar {channel.title}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              Perguntas Frequentes
            </h2>
            <p className="text-muted-foreground">
              Encontre respostas rápidas para as dúvidas mais comuns
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                  onClick={() => toggleFAQ(index)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {item.question}
                    </CardTitle>
                    {expandedFAQ === index ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {expandedFAQ === index && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <p className="text-muted-foreground leading-relaxed">
                      {item.answer}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {/* Botão para Central de Ajuda */}
          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-4">
              Não encontrou o que procurava? Acesse nossa central de ajuda completa.
            </p>
            <Button 
              onClick={handleHelpCenterClick}
              variant="outline"
              className="hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Ver mais na Central de Ajuda
            </Button>
          </div>
        </section>



        {/* Call to Action */}
        <section className="text-center py-12">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-semibold mb-4">Ainda precisa de ajuda?</h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está sempre pronta para ajudar você. Entre em contato através do canal que preferir!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => handleChannelClick("https://wa.me/5564996028022", "WhatsApp")}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={() => handleChannelClick("https://discord.gg/a3X4DC8rjY", "Discord")}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                 Discord
                </Button>
                <Button 
                  onClick={() => handleChannelClick("mailto:suporte@onedrip.email", "E-mail")}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                 E-mail
                </Button>

              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default SuportePage;