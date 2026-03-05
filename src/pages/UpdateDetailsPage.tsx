// @ts-nocheck
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Home, CheckCircle, Calendar, MessageSquare, Settings, Wrench, CreditCard, Star, RotateCcw, Bot, Globe, Heart, Database, Zap, Search, Sparkles, BookOpen, Code2, Store, Shield } from "lucide-react";
import { toast } from "sonner";
const UpdateDetailsPage = () => {
  const navigate = useNavigate();
  const whatsappFeatures = [{
    title: "Templates Dinâmicos",
    description: "Mensagens personalizadas com placeholders automáticos",
    icon: MessageSquare,
    color: "bg-green-500",
    details: ["Template padrão global para todos os usuários", "Placeholders dinâmicos preenchidos automaticamente", "Preview em tempo real com dados do orçamento", "Reset para padrão com um clique"]
  }, {
    title: "Sistema de Serviços/Peças",
    description: "Múltiplas opções de qualidade para cada serviço",
    icon: Wrench,
    color: "bg-orange-500",
    details: ["Até 4 opções de qualidade por serviço", "Preços à vista e parcelados automáticos", "Garantias proporcionais aos preços", "Serviços adicionais inclusos"]
  }];
  const placeholders = [{
    name: "{nome_empresa}",
    desc: "Nome da empresa"
  }, {
    name: "{modelo_dispositivo}",
    desc: "Modelo do aparelho"
  }, {
    name: "{nome_reparo}",
    desc: "Tipo de serviço"
  }, {
    name: "{qualidade_peca}",
    desc: "Qualidade da peça"
  }, {
    name: "{garantia_meses}",
    desc: "Tempo de garantia"
  }, {
    name: "{preco_vista}",
    desc: "Preço à vista formatado"
  }, {
    name: "{preco_parcelado}",
    desc: "Preço parcelado"
  }, {
    name: "{num_parcelas}",
    desc: "Número de parcelas"
  }, {
    name: "{valor_parcela}",
    desc: "Valor de cada parcela"
  }, {
    name: "{servicos_inclusos}",
    desc: "Lista de serviços adicionais"
  }, {
    name: "{observacoes}",
    desc: "Observações do orçamento"
  }, {
    name: "{data_validade}",
    desc: "Data de validade do orçamento"
  }];
  const drippyFeatures = [{
    title: "Busca Inteligente de Orçamentos",
    description: "Sistema avançado que entende linguagem natural",
    icon: Search,
    color: "bg-blue-500",
    details: ["Busca por número (#38, OR: 123)", "Busca por modelo (iPhone 13, Galaxy A12)", "Busca por cliente (nome completo ou parcial)", "Busca por tipo de serviço e data", "Fuzzy search (entende variações)"]
  }, {
    title: "Busca de Ordens de Serviço",
    description: "Encontre OS por múltiplos critérios",
    icon: Wrench,
    color: "bg-orange-500",
    details: ["Busca por número de OS", "Busca por cliente e telefone", "Busca por modelo do aparelho", "Busca por tipo de reparo", "Busca por status e período"]
  }, {
    title: "Pesquisa na Internet",
    description: "Busca informações atualizadas online",
    icon: Globe,
    color: "bg-green-500",
    details: ["Informações sobre tecnologia", "Notícias do setor", "Curiosidades aleatórias", "Novos dispositivos", "Dicas técnicas"]
  }, {
    title: "Sistema de Humor Adaptativo",
    description: "Adapta o tom baseado na interação",
    icon: Heart,
    color: "bg-pink-500",
    details: ["5 níveis de humor (100 a 0)", "Responde ao tratamento recebido", "Mantém profissionalismo", "Contexto conversacional", "Educada em qualquer situação"]
  }, {
    title: "Acesso Fácil e Rápido",
    description: "Múltiplos pontos de acesso à IA",
    icon: Zap,
    color: "bg-yellow-500",
    details: ["Página dedicada /chat", "Barra de busca no Dashboard", "Menu hambúrguer (mobile)", "Botão flutuante em páginas", "Sempre disponível para ajudar"]
  }];
  const drippyExamples = [{
    question: "Como buscar um orçamento específico?",
    answer: "Exemplos: 'Mostre o orçamento #38', 'Orçamentos do cliente João Silva', 'iPhone 13 do mês passado'"
  }, {
    question: "Como pesquisar na internet?",
    answer: "Exemplos: 'Qual o preço médio de tela de iPhone 14?', 'Novidades sobre Samsung Galaxy S24', 'Curiosidade sobre tecnologia'"
  }, {
    question: "Como consultar ordens de serviço?",
    answer: "Exemplos: 'Mostre OS #123', 'Ordens pendentes', 'Reparos do cliente Maria', 'OS criadas hoje'"
  }, {
    question: "Como a Drippy adapta suas respostas?",
    answer: "A Drippy monitora o tom da conversa e ajusta suas respostas de acordo. Seja educado e ela será mais amigável!"
  }];
  const handleBackToDashboard = () => {
    navigate('/dashboard');
    toast.success('Redirecionando para o Dashboard...');
  };
  const handleGoToSupport = () => {
    navigate('/suporte');
    toast.success('Redirecionando para Suporte...');
  };
  const systemAreas = [{
    id: 'store',
    title: 'Loja Online',
    description: 'Loja pública conectada ao seu painel, pronta para vender 24/7.',
    icon: Store,
    badge: 'Loja',
    highlights: ['Link público exclusivo para sua loja', 'Gestão de orçamentos que chegam pela loja', 'Catálogo de produtos e serviços organizado', 'Integração direta com o Dashboard principal']
  }, {
    id: 'warranties',
    title: 'Gestão de Garantias',
    description: 'Controle completo das garantias ligadas às ordens de serviço.',
    icon: Shield,
    badge: 'Pós-venda',
    highlights: ['Vinculada automaticamente às OS criadas', 'Status claros: Em andamento, Concluído, Entregue', 'Filtros por texto, status e período', 'Ações rápidas para concluir, entregar ou reverter garantias']
  }, {
    id: 'repairs',
    title: 'Gestão de Reparos',
    description: 'Central única para serviços, técnicos e status dos reparos.',
    icon: Wrench,
    badge: 'Operação',
    highlights: ['Dashboard dedicado para acompanhar reparos', 'Cadastro de serviços de reparo com valores e IMEI do aparelho', 'Registro da senha do dispositivo (PIN, padrão ou alfanumérica)', 'Checklist de funcionamento do aparelho antes/depois do reparo', 'Gestão da equipe técnica e comissões', 'Status personalizados para cada etapa do reparo']
  }];
  const versionHighlights = [{
    area: 'Loja Online',
    description: 'Deixa sua loja mais integrada ao restante do sistema e agradável no mobile.',
    items: ['Navbar inferior no mobile com atalhos para Orçamentos, Produtos, Serviços e Configurações', 'Atalho direto para visualizar a loja pública em nova aba', 'Tela de “Nenhuma loja encontrada” com CTA claro para criar sua primeira loja']
  }, {
    area: 'Gestão de Garantias',
    description: 'Facilita o acompanhamento de garantias ativas e entregues.',
    items: ['Tabela com status em destaque e cores intuitivas', 'Ações rápidas para concluir, entregar e reverter garantias', 'Filtros por texto e status para encontrar qualquer garantia rapidamente']
  }, {
    area: 'Gestão de Reparos',
    description: 'Transforma reparos em um mini‑painel dedicado dentro do OneDrip.',
    items: ['Layout com header fixo e navegação clara entre Buscar, Dashboard, Serviços, Técnicos e Status', 'Barra de navegação inferior otimizada para uso em celulares', 'Botão flutuante que leva direto para a tela de Serviços']
  }, {
    area: 'Planos & Assinaturas',
    description: 'Deixa a contratação de planos mais clara e profissional.',
    items: ['Seção de benefícios com ícones e descrições focadas em resultado', 'Depoimentos e provas sociais configuráveis via painel', 'FAQ estruturado com as principais dúvidas sobre planos e pagamentos']
  }];
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Detalhes</h1>
                <p className="text-xs text-muted-foreground">Atualização</p>
              </div>
            </div>
          </div>
          
          <Button onClick={handleBackToDashboard} className="rounded-full gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Menu</span>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section>
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
            <CardContent className="py-10 px-6 flex flex-col items-center gap-8 text-center">
              <div className="flex-1 space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl mb-2 filter drop-shadow-lg animate-bounce-slow">🫐</span>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
                    <span>Notas da versão</span>
                    <span className="h-3 w-px bg-primary/30" />
                    <span>Blue Berry</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mt-2">
                    Blue Berry 2.9.0
                  </h1>
                </div>
                
                 <p className="text-muted-foreground max-w-xl md:max-w-2xl mx-auto leading-relaxed text-lg">
                   Atualização focada em deixar sua rotina mais organizada
                 </p>
                 
                <div className="flex flex-wrap items-center gap-3 justify-center pt-2">
                  <Badge variant="secondary" className="gap-2 px-3 py-1.5 text-sm bg-background/50 backdrop-blur-sm border border-border/50">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Lançado em 08/01/2026
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Visão geral das áreas do sistema */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Visão geral das áreas do sistema
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Entenda rapidamente como Loja, Garantias, Reparos e Planos se conectam no OneDrip.
              </p>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemAreas.map(area => {
            const Icon = area.icon;
            return <Card key={area.id} className="group h-full border-border/60 bg-card/60 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-3 flex flex-row items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base truncate">{area.title}</CardTitle>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
                          {area.badge}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {area.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {area.highlights.map((item, idx) => <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-primary mt-0.5" />
                          <span>{item}</span>
                        </li>)}
                    </ul>
                  </CardContent>
                </Card>;
          })}
          </div>
        </section>

        {/* Novidades desta versão */}
        

        <Separator />

        {/* WhatsApp Templates Section */}
        <section className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <MessageSquare className="h-6 w-6 text-green-500" />
              <h2 className="text-2xl font-bold text-foreground">WhatsApp Templates & Serviços</h2>
            </div>
            <p className="text-muted-foreground">
              Sistema completo para criar orçamentos profissionais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {whatsappFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.details.map((detail, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>)}
                    </ul>
                  </CardContent>
                </Card>;
          })}
          </div>

          {/* Placeholders */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="h-5 w-5 text-primary" />
                Placeholders Disponíveis
              </CardTitle>
              <CardDescription>
                Variáveis substituídas automaticamente pelos dados do orçamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {placeholders.map((placeholder, index) => <div key={index} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded-lg">
                      {placeholder.name}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">{placeholder.desc}</p>
                  </div>)}
              </div>
            </CardContent>
          </Card>

          {/* How to Use */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Como Usar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Criando seu Template
                  </h4>
                  <ol className="space-y-2">
                    {['Clique em "WhatsApp" no header da página /worm', 'Use os botões de placeholders para inserir variáveis', 'Visualize o preview com dados de exemplo', 'Salve seu template personalizado'].map((step, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>)}
                  </ol>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-500" />
                    Configurando Serviços
                  </h4>
                  <ol className="space-y-2">
                    {['Selecione o serviço desejado (ex: Troca de Tela)', 'Configure até 4 opções de qualidade', 'Defina preços, garantias e serviços inclusos', 'Clique "Gerar Orçamento" para criar a mensagem'].map((step, idx) => <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs shrink-0">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>)}
                  </ol>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-start gap-2">
                  <RotateCcw className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <h5 className="font-medium text-sm text-foreground">Dica Importante</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      O template padrão global já vem configurado com uma mensagem profissional. 
                      Você pode personalizá-lo ou usar o botão "Reset para Padrão" para restaurar.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <Separator />

        {/* Drippy IA Section */}
        <section className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Bot className="h-6 w-6 text-purple-500" />
              <h2 className="text-2xl font-bold text-foreground">Drippy IA</h2>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Assistente pessoal com inteligência artificial integrada ao OneDrip
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drippyFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{feature.title}</CardTitle>
                        <CardDescription className="text-xs truncate">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {feature.details.map((detail, idx) => <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>)}
                    </ul>
                  </CardContent>
                </Card>;
          })}
          </div>

          {/* FAQ */}
          <Card className="border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Exemplos de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drippyExamples.map((example, index) => <div key={index} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <h4 className="font-medium text-sm text-foreground mb-2">{example.question}</h4>
                    <p className="text-xs text-muted-foreground">{example.answer}</p>
                  </div>)}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Card className="border-border/50 bg-gradient-to-br from-muted/20 to-muted/40">
            <CardContent className="py-8">
              <h3 className="text-xl font-bold text-foreground mb-2">Precisa de Ajuda?</h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está pronta para te ajudar
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleBackToDashboard} className="rounded-full gap-2">
                  <Home className="h-4 w-4" />
                  Ir para o Dashboard
                </Button>
                <Button variant="outline" onClick={handleGoToSupport} className="rounded-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Suporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>;
};
export default UpdateDetailsPage;