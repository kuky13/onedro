import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Home,
  Link,
  Shield,
  Plus,
  CheckCircle,
  Calendar,
  User,
  Headphones,
  MessageSquare,
  Smartphone,
  Settings,
  Wrench,
  Package,
  CreditCard,
  Star,
  Edit3,
  Trash2,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

const UpdateDetailsPage = () => {
  const navigate = useNavigate();

  const whatsappFeatures = [
    {
      title: "Templates Dinâmicos",
      description: "Mensagens personalizadas com placeholders automáticos",
      icon: MessageSquare,
      color: "bg-green-500",
      details: [
        "Template padrão global para todos os usuários",
        "Placeholders dinâmicos preenchidos automaticamente",
        "Preview em tempo real com dados do orçamento",
        "Reset para padrão com um clique"
      ]
    },
    {
      title: "Sistema de Serviços/Peças",
      description: "Múltiplas opções de qualidade para cada serviço",
      icon: Wrench,
      color: "bg-orange-500",
      details: [
        "Até 4 opções de qualidade por serviço",
        "Preços à vista e parcelados automáticos",
        "Garantias proporcionais aos preços",
        "Serviços adicionais inclusos"
      ]
    },
    {
      title: "Editor Visual",
      description: "Interface intuitiva para criar e editar templates",
      icon: Edit3,
      color: "bg-purple-500",
      details: [
        "Botões rápidos para inserir placeholders",
        "Preview ao vivo com dados de exemplo",
        "Limite de 1 template por usuário",
        "Confirmação de segurança antes de excluir"
      ]
    },
    {
      title: "Integração Perfeita",
      description: "Geração automática de mensagens profissionais",
      icon: Smartphone,
      color: "bg-blue-600",
      details: [
        "Acesso rápido via botão no header",
        "Template padrão já vem selecionado",
        "Geração automática ao clicar 'Gerar Orçamento'",
        "Compartilhamento direto via WhatsApp"
      ]
    }
  ];

  const placeholders = [
    { name: "{nome_empresa}", desc: "Nome da empresa" },
    { name: "{modelo_dispositivo}", desc: "Modelo do aparelho" },
    { name: "{nome_reparo}", desc: "Tipo de serviço" },
    { name: "{qualidade_peca}", desc: "Qualidade da peça" },
    { name: "{garantia_meses}", desc: "Tempo de garantia" },
    { name: "{preco_vista}", desc: "Preço à vista formatado" },
    { name: "{preco_parcelado}", desc: "Preço parcelado" },
    { name: "{num_parcelas}", desc: "Número de parcelas" },
    { name: "{valor_parcela}", desc: "Valor de cada parcela" },
    { name: "{servicos_inclusos}", desc: "Lista de serviços adicionais" },
    { name: "{observacoes}", desc: "Observações do orçamento" },
    { name: "{data_validade}", desc: "Data de validade do orçamento" }
  ];

  // Removido: seção de funcionalidades da atualização (Imagens na Ordem de Serviço)

  const handleBackToDashboard = () => {
    navigate('/dashboard');
    toast.success('Redirecionando para o Dashboard...');
  };

  const handleGoToSupport = () => {
    navigate('/suporte');
    toast.success('Redirecionando para Suporte...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Botão MENU no topo */}
        <div className="flex justify-end mb-4">
          <Button 
            onClick={handleBackToDashboard}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Home className="mr-2 h-4 w-4" />
            Menu
          </Button>
        </div>
        
        {/* Header da Atualização */}
        <section className="mb-12">
          <Card className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-2 border-primary/30 shadow-xl">
            <CardContent className="pt-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4 text-primary">🫐 Blue Berry 2.8.3</h1>
                <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
                  Foi Implementado recursos importantes para 
                  melhorar sua experiência com a plataforma OneDrip.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Badge variant="secondary" className="text-sm px-4 py-2">
                    <Calendar className="mr-2 h-4 w-4" />
                    Lançado em 11/11/2025
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        
        {/* Seção de funcionalidades removida conforme solicitação */}

        {/* WhatsApp Templates & Serviços/Peças Documentation */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-500" />
              WhatsApp Templates & Serviços/Peças
            </h2>
            <p className="text-muted-foreground">
              Sistema completo para criar orçamentos profissionais e mensagens personalizadas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {whatsappFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-green-500/20">
                  <CardHeader className="text-center pb-4">
                    <div className={`w-16 h-16 rounded-full ${feature.color} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Separator />
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Recursos disponíveis:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {feature.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Placeholders Section */}
          <Card className="mb-8 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Placeholders Dinâmicos Disponíveis
              </CardTitle>
              <CardDescription>
                Variáveis que são automaticamente substituídas pelos dados do orçamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {placeholders.map((placeholder, index) => (
                  <div key={index} className="bg-card p-3 rounded-lg border border-border/50 shadow-sm">
                    <code className="text-sm font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                      {placeholder.name}
                    </code>
                    <p className="text-xs text-muted-foreground mt-1">{placeholder.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* How to Use Section */}
          <Card className="bg-gradient-to-r from-secondary/5 via-primary/5 to-secondary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Como Usar o Sistema
              </CardTitle>
              <CardDescription>
                Passo a passo para aproveitar todas as funcionalidades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Criando seu Template
                    </h4>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                        <span>Clique em "WhatsApp" no header da página /worm</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                        <span>Use os botões de placeholders para inserir variáveis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                        <span>Visualize o preview com dados de exemplo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                        <span>Salve seu template personalizado</span>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-green-500" />
                      Configurando Serviços
                    </h4>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                        <span>Selecione o serviço desejado (ex: Troca de Tela)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                        <span>Configure até 4 opções de qualidade</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                        <span>Defina preços, garantias e serviços inclusos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
                        <span>Clique "Gerar Orçamento" para criar a mensagem</span>
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="bg-muted/40 border border-border/50 rounded-lg p-4">
                  <h5 className="font-medium text-foreground flex items-center gap-2 mb-2">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    Dica Importante
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    O template padrão global já vem configurado com uma mensagem profissional. 
                    Você pode personalizá-lo ou usar o botão "Reset para Padrão" para restaurar 
                    a mensagem original caso necessário.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Botões de Navegação */}
        <section className="text-center py-12">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="pt-8">
              <h3 className="text-2xl font-semibold mb-4">Precisa de ajuda com as novas funcionalidades?</h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe de suporte está pronta para te ajudar a aproveitar ao máximo todas as novidades!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={handleBackToDashboard}
                  variant="outline"
                  className="hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Dashboard
                </Button>
                <Button 
                  onClick={handleGoToSupport}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Headphones className="mr-2 h-4 w-4" />
                  Falar com Suporte
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default UpdateDetailsPage;