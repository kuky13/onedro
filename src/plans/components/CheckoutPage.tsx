import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, CreditCard, Clock, CheckCircle, MessageCircle, Phone, Award, Zap, TrendingUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FadeInUp, ScaleOnHover } from '@/components/ui/animations';
import { Heading, Text } from '@/components/ui/typography';
import { PLANS_CONTENT } from '../data/content';

interface CheckoutPageProps {
  planType?: 'monthly' | 'yearly';
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ planType }) => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  // Removido requisito de aceite de termos
  // Removed countdown timer state
  
  // Determina o tipo do plano baseado na URL ou prop
  const currentPlanType = planType || (type === 'm' ? 'monthly' : type === 'a' ? 'yearly' : 'monthly');
  const isMonthly = currentPlanType === 'monthly';
  
  // Dados do plano selecionado
  const planData = isMonthly ? PLANS_CONTENT.planos.mensal : PLANS_CONTENT.planos.anual;
  
  // URLs de pagamento
  const paymentUrls = {
    monthly: 'https://mpago.li/2ZqAPDs',
    yearly: 'https://mpago.li/1c4LGhc'
  };
  
  // Removed countdown timer effect
  
  const handlePayment = () => {
    const paymentUrl = isMonthly ? paymentUrls.monthly : paymentUrls.yearly;
    window.open(paymentUrl, '_blank');
  };
  
  const handleDemo = () => {
    // Redireciona para página da Drippy
    navigate('/drippy');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="glass border-b shadow-soft sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/plans')}
                className="flex items-center gap-2 interactive-scale"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-3">
                <img 
                  src={PLANS_CONTENT.logo} 
                  alt="OneDrip" 
                  className="h-8 w-auto"
                />
                <Heading level="h1" size="xl" className="text-foreground">Finalizar Compra</Heading>
              </div>
            </div>
            {!isMonthly && (
              <Badge className="bg-gradient-to-r from-primary to-accent text-black font-bold px-3 py-1">
                🔥 OFERTA LIMITADA
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section com Valor */}
        <FadeInUp className="text-center mb-12">
          <div className="max-w-4xl mx-auto">
            <Heading level="h2" size="4xl" gradient className="mb-4">
              Transforme Sua Assistência Técnica
            </Heading>
            <Text size="xl" color="secondary" className="mb-6">
              Transforme sua gestão com o sistema mais completo do mercado
            </Text>
          </div>
        </FadeInUp>
        
        {/* Seção de Benefícios Principais */}
        <FadeInUp className="mb-16">
          <div className="text-center mb-12">
            <Heading level="h3" size="3xl" className="mb-4">
              Por Que Escolher o OneDrip Agora?
            </Heading>
            <Text size="lg" color="secondary">
              Descubra os benefícios exclusivos que fara sua empresa crescer
            </Text>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              {
                icon: TrendingUp,
                title: "Aumento de 40% na Produtividade",
                description: "Automatize processos e reduza tempo gasto em tarefas manuais",
                color: "text-green-500"
              },
              {
                icon: Award,
                title: "Suporte Premium Incluso",
                description: "Atendimento com prioridade e completo",
                color: "text-purple-500"
              }
            ].map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <ScaleOnHover key={index}>
                  <Card className="glass-card h-full border-0 bg-gradient-to-br from-card to-muted/20">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-primary/10 to-primary/5 mx-auto">
                        <Icon className={`h-8 w-8 ${benefit.color}`} />
                      </div>
                      <Heading level="h4" size="lg" className="mb-2">
                        {benefit.title}
                      </Heading>
                      <Text color="secondary">
                        {benefit.description}
                      </Text>
                    </CardContent>
                  </Card>
                </ScaleOnHover>
              )
            })}
          </div>
        </FadeInUp>
        

        
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Coluna Esquerda - Resumo do Plano */}
          <div className="space-y-8">
            <FadeInUp>
              <Card className="glass-card border-0 bg-gradient-to-br from-card to-muted/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-foreground">Resumo do Seu Plano</CardTitle>
                    {planData.mostrar_badge && (
                      <Badge className="bg-gradient-to-r from-primary to-accent text-black font-bold">
                        {planData.badge_popular}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Heading level="h3" size="lg" className="text-foreground">{planData.nome}</Heading>
                    <Text color="secondary">{planData.descricao}</Text>
                  </div>
                  
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {planData.moeda}{planData.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <Text color="secondary">{planData.periodo}</Text>
                    {planData.preco_original > planData.preco && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        {planData.moeda}{planData.preco_original.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>
                  
                  {planData.economia_texto && (
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-green-500" />
                        <Text weight="bold" className="text-green-400">
                          {planData.economia_texto}
                        </Text>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Heading level="h4" size="md" className="text-foreground">Tudo Incluído:</Heading>
                    <ul className="space-y-2">
                      {planData.beneficios.map((beneficio, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <Text>{beneficio}</Text>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </FadeInUp>

            {/* Informações do Processo */}
            <FadeInUp>
              <Card className="glass-card border-0 bg-gradient-to-br from-card to-muted/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Processo 100% Seguro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: CheckCircle, text: "Pagamento criptografado SSL", color: "text-green-500" },
                    { icon: Zap, text: "Ativação rapida", color: "text-blue-500" },
                    { icon: MessageCircle, text: "Suporte técnico 24/7 incluso", color: "text-purple-500" },
                    { icon: Award, text: "Garantia incondicional de 7 dias", color: "text-yellow-500" }
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        <Text>{item.text}</Text>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </FadeInUp>
          </div>

          {/* Coluna Direita - Garantias e Confiança */}
          <div className="space-y-8">
            {/* Garantia em Destaque */}
            <FadeInUp>
              <Card className="glass-card border-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-10 h-10 text-green-500" />
                  </div>
                  <Heading level="h3" size="xl" className="mb-2 text-green-400">
                    Garantia de 7 Dias
                  </Heading>
                  <Text color="secondary" className="mb-4">
                    Não ficou satisfeito? Devolvemos seu dinheiro, sem perguntas.
                  </Text>
                  <div className="bg-green-500/10 rounded-lg p-3">
                    <Text size="sm" weight="bold" className="text-green-400">
                      ✓ Risco Zero para Você
                    </Text>
                  </div>
                </CardContent>
              </Card>
            </FadeInUp>


          </div>
        </div>

        {/* Seção FAQ */}
        <FadeInUp>
          <div className="max-w-4xl mx-auto mt-16">
            <div className="text-center mb-12">
              <Heading level="h2" size="2xl" className="mb-4 text-foreground">
                Perguntas Frequentes
              </Heading>
              <Text color="secondary" size="lg">
                Tire suas dúvidas sobre o OneDrip
              </Text>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  question: "Como funciona a ativação?",
                  answer: "Após o pagamento, você deverá mandar o comprovante para o nosso WhatsApp para receber a licença de acesso ao sistema."
                },
                {
                  question: "Posso cancelar a qualquer momento?",
                  answer: "Sim! Oferecemos garantia de 7 dias. Se não ficar satisfeito, devolvemos seu dinheiro."
                },
                {
                  question: "O sistema funciona no meu celular?",
                  answer: "Perfeitamente! O OneDrip é responsivo e funciona em qualquer dispositivo - celular, tablet ou computador."
                }
              ].map((faq, index) => (
                <ScaleOnHover key={index}>
                  <Card className="glass-card border-0 bg-gradient-to-br from-card to-muted/20 h-full">
                    <CardContent className="p-6">
                      <Heading level="h3" size="lg" className="mb-3 text-foreground">
                        {faq.question}
                      </Heading>
                      <Text color="secondary">
                        {faq.answer}
                      </Text>
                    </CardContent>
                  </Card>
                </ScaleOnHover>
              ))}
            </div>
          </div>
        </FadeInUp>

        {/* Demonstração Redesenhada */}
        <FadeInUp>
          <div className="max-w-2xl mx-auto mt-16">
            <Card className="glass-card border-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-purple-500" />
                </div>
                <Heading level="h3" size="xl" className="mb-4 text-foreground">
                  Quer Ver o Sistema Funcionando?
                </Heading>
                <Text color="secondary" className="mb-6">
                  Solicite uma demonstração com nossa assistente Drippy. 
                  Ela fornecerá dados e instruções para você acessar o sistema manualmente.
                </Text>
                <Button 
                  onClick={handleDemo}
                  variant="outline" 
                  className="w-full h-12 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                Demonstração Gratuita
                </Button>
              </CardContent>
            </Card>
          </div>
        </FadeInUp>



        {/* Call-to-Action Final */}
        <FadeInUp>
          <div className="max-w-4xl mx-auto mt-16" data-section="revolucionar">
            <Card className="glass-card border-0 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="p-8 text-center">

                
                <Heading level="h2" size="2xl" className="mb-4 text-foreground">
                  Pronto para Revolucionar sua Assistência Técnica?
                </Heading>
                <Text color="secondary" size="lg" className="mb-8">
                  Transforme seu negócio com a solução mais completa do mercado
                </Text>
                
                {/* Botão de Compra Final */}
                <div className="max-w-md mx-auto">
                  {/* Removido bloco de aceite de termos para evitar bloqueio em dispositivos */}
                  
                  <Button 
                    onClick={handlePayment}
                    disabled={false}
                    className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
                  >
                    <CreditCard classNSame="w-6 h-6 mr-3" />
                    Comprar - {planData.moeda}{planData.preco.toFixed(2).replace('.', ',')}
                  </Button>
                  
                  <div className="flex items-center justify-center gap-3 mt-4">                   <img 
                      src="https://kukusolutions.s-ul.eu/wF4rduaN" 
                      alt="Mercado Pago" 
                      className="h-6 w-auto"
                    />
                    <Text size="sm" color="secondary">
                      Pagamento seguro via Mercado Pago
                    </Text>
                  </div>
                  
                  {/* Elementos de Confiança */}
                  <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>SSL Seguro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Garantia de 7 dias</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-500" />
                      <span>Suporte 24/7</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeInUp>

        {/* Contato de Suporte Final */}
        <FadeInUp>
          <div className="max-w-2xl mx-auto mt-8">
            <Card className="glass-card border-0 bg-gradient-to-br from-card to-muted/20">
              <CardContent className="p-6 text-center">
                <Text color="secondary" className="mb-2">Precisa de ajuda? Fale conosco!</Text>
                <Text weight="bold" className="text-foreground">
                  WhatsApp: ({PLANS_CONTENT.configuracoes.whatsapp_numero.slice(0,2)}) {PLANS_CONTENT.configuracoes.whatsapp_numero.slice(2,7)}-{PLANS_CONTENT.configuracoes.whatsapp_numero.slice(7)}
                </Text>
              </CardContent>
            </Card>
          </div>
        </FadeInUp>
      </div>
    </div>
  );
};

export default CheckoutPage;