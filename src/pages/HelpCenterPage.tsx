import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { HelpCircle, Search, FileText, ClipboardList, Crown, Trash2, Settings, Play, ChevronDown, ChevronRight, ExternalLink, BookOpen, Users, Calculator, Wrench, Shield, Building, Home, Download, Lightbulb, MessageCircle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
  videoIncluded?: boolean;
}
interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openSections, setOpenSections] = useState<string[]>(['budgets']);
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]);
  };
  const videoUrl = "https://www.youtube.com/embed/oMRTgDAeQwo?si=9FuByHjah0fcqqRu";
  const helpSections: HelpSection[] = [{
    id: 'budgets',
    title: 'Criação e Gestão de Orçamentos',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Aprenda a criar, visualizar e gerenciar orçamentos de forma eficiente',
    videoIncluded: true,
    content: <div className="space-y-6">
          <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">📋 Como Criar um Novo Orçamento</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Acesse a seção "Orçamentos" no menu principal</li>
              <li>Clique no botão "Novo Orçamento" ou no cartão de criação</li>
              <li>Preencha os dados do cliente (nome, telefone, email)</li>
              <li>Adicione os itens/serviços com descrição, quantidade e valor</li>
              <li>Configure desconto e observações se necessário</li>
              <li>Clique em "Salvar" para finalizar o orçamento</li>
            </ol>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">👀 Visualização e Busca de Orçamentos</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Lista de Orçamentos:</strong> Visualize todos os orçamentos em cartões organizados</li>
              <li><strong>Busca Inteligente:</strong> Use a barra de pesquisa para encontrar orçamentos por cliente, valor ou data</li>
              <li><strong>Filtros:</strong> Filtre por status, período ou valor para encontrar rapidamente</li>
              <li><strong>Ações Rápidas:</strong> Edite, exclua ou compartilhe via WhatsApp diretamente da lista</li>
            </ul>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">💡 Dicas Importantes</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Os orçamentos são atualizados em tempo real via Nuvem</li>
              <li>Use a função de cópia para criar orçamentos similares rapidamente</li>
              <li>O compartilhamento via WhatsApp gera uma mensagem formatada automaticamente</li>
              <li>Todos os dados são salvos automaticamente durante a criação</li>
            </ul>
          </div>


        </div>
  }, {
    id: 'service-orders',
    title: 'Ordens de Serviço',
    icon: <ClipboardList className="h-5 w-5" />,
    description: 'Gerencie ordens de serviço, acompanhe status e organize o workflow',
    videoIncluded: true,
    content: <div className="space-y-6">
          <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">🔧 Criação de Ordens de Serviço</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Acesse "Ordens de Serviço" no menu principal</li>
              <li>Clique em "Nova Ordem" no cabeçalho</li>
              <li>Preencha dados do cliente e dispositivo</li>
              <li>Descreva o problema relatado detalhadamente</li>
              <li>Defina prioridade (Baixa, Média, Alta, Urgente)</li>
              <li>Adicione valor estimado e observações</li>
              <li>Salve para criar a ordem de serviço</li>
            </ol>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">📊 Status e Acompanhamento</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-foreground mb-2">Status Disponíveis:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• <Badge variant="secondary">Pendente</Badge> - Aguardando início</li>
                  <li>• <Badge variant="outline">Em Andamento</Badge> - Sendo executada</li>
                  <li>• <Badge variant="default">Concluída</Badge> - Finalizada</li>
                  <li>• <Badge variant="destructive">Cancelada</Badge> - Cancelada</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Prioridades:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• 🟢 Baixa - Sem urgência</li>
                  <li>• 🟡 Média - Prazo normal</li>
                  <li>• 🟠 Alta - Prioridade elevada</li>
                  <li>• 🔴 Urgente - Máxima prioridade</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">📱 Funcionalidades Avançadas</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Página de Detalhes:</strong> Visualização completa com histórico de eventos</li>

              <li><strong>Histórico de Eventos:</strong> Acompanhe todas as alterações e atualizações</li>
              <li><strong>Compartilhamento WhatsApp:</strong> Envie detalhes formatados para clientes</li>
              <li><strong>Filtros Avançados:</strong> Busque por status, prioridade, cliente ou período</li>
            </ul>
          </div>


        </div>
  }, {
    id: 'trash',
    title: 'Sistema de Lixeira',
    icon: <Trash2 className="h-5 w-5" />,
    description: 'Recupere itens excluídos e gerencie a lixeira do sistema',
    content: <div className="space-y-6">
          <div className="bg-destructive/10 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">🗑️ Como Funciona a Lixeira</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Quando você exclui uma ordem de serviço, ela não é removida permanentemente. 
              Em vez disso, é movida para a lixeira, onde pode ser recuperada ou excluída definitivamente.
            </p>
            <div className="bg-destructive/20 p-3 rounded border border-border">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Itens na lixeira podem ser recuperados a qualquer momento
              </p>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">♻️ Recuperação de Itens</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Acesse a "Lixeira de Ordens de Serviço" no menu</li>
              <li>Localize o item que deseja recuperar</li>
              <li>Clique no botão "Restaurar" no cartão do item</li>
              <li>Confirme a ação no diálogo de confirmação</li>
              <li>O item será restaurado à lista principal</li>
            </ol>
          </div>

          <div className="bg-muted p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">🔥 Exclusão Permanente</h4>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-foreground mb-2">Exclusão Individual:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Clique em "Excluir Permanentemente" no item desejado</li>
                  <li>Confirme a ação (esta operação é irreversível)</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-foreground mb-2">Esvaziar Lixeira:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Use o botão "Esvaziar Lixeira" para remover todos os itens</li>
                  <li>Confirme a ação (todos os itens serão perdidos permanentemente)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">📋 Informações Exibidas</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Na lixeira, você pode visualizar as seguintes informações dos itens excluídos:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Tipo de dispositivo e problema relatado</li>
              <li>Status e prioridade da ordem</li>
              <li>Data de criação e exclusão</li>
              <li>Informações do cliente</li>
            </ul>
          </div>
        </div>
  }, {
    id: 'settings',
    title: 'Configurações do Sistema',
    icon: <Settings className="h-5 w-5" />,
    description: 'Personalize sua experiência e configure preferências da aplicação',
    videoIncluded: true,
    content: <div className="space-y-6">


          <div className="bg-primary/10 p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">🏢 Configurações da Empresa</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Dados da Empresa:</strong> Nome, endereço, telefone e informações de contato</li>
              <li><strong>Logo da Empresa:</strong> Upload e gerenciamento da logo corporativa</li>
              <li><strong>Configurações de Marca:</strong> Cores, temas e personalização visual</li>
              <li><strong>Configurações de Compartilhamento:</strong> Personalização de mensagens WhatsApp</li>
            </ul>
          </div>



          <div className="bg-muted p-4 rounded-lg border border-border">
            <h4 className="font-semibold text-foreground mb-2">💾 Gerenciamento de Dados</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Importação/Exportação:</strong> Backup e restauração de orçamentos</li>
              <li><strong>Limpeza de Cache:</strong> Limpar dados temporários e cache do navegador</li>
              <li><strong>Políticas:</strong> Acesso a termos de uso e políticas de privacidade</li>
            </ul>
          </div>


        </div>
  }];
  const faqItems: FAQItem[] = [{
    question: "Como posso recuperar um orçamento excluído?",
    answer: "Os orçamentos excluídos são movidos para a lixeira. Acesse a seção de lixeira, localize o item e clique em 'Restaurar'.",
    category: "budgets"
  }, {
    question: "Quais recursos estão disponíveis no sistema?",
    answer: "O sistema oferece funcionalidades completas de ordens de serviço, incluindo página de detalhes histórico de eventos para todos os usuários autenticados.",
    category: "service-orders"
  }, {
    question: "Como alterar o status de uma ordem de serviço?",
    answer: "Na lista de ordens de serviço, clique no cartão da ordem desejada e use os botões de ação para alterar o status (Pendente, Em Andamento, Concluída, Cancelada).",
    category: "service-orders"
  }, {
    question: "Como limpar o cache do sistema?",
    answer: "Acesse Configurações > Ações da Conta > Limpeza de Cache. Isso removerá dados temporários, mas manterá seus dados do backend seguros.",
    category: "settings"
  }, {
    question: "É possível filtrar ordens de serviço por prioridade?",
    answer: "Sim! Use os filtros na página de ordens de serviço para filtrar por status, prioridade, cliente ou período específico.",
    category: "service-orders"
  }];
  const categories = [{
    id: 'all',
    label: 'Todas as Categorias',
    icon: <BookOpen className="h-4 w-4" />
  }, {
    id: 'budgets',
    label: 'Orçamentos',
    icon: <Calculator className="h-4 w-4" />
  }, {
    id: 'service-orders',
    label: 'Ordens de Serviço',
    icon: <ClipboardList className="h-4 w-4" />
  }, {
    id: 'service-orders-advanced',
    label: 'Sistema Avançado',
    icon: <Crown className="h-4 w-4" />
  }, {
    id: 'trash',
    label: 'Lixeira',
    icon: <Trash2 className="h-4 w-4" />
  }, {
    id: 'settings',
    label: 'Configurações',
    icon: <Settings className="h-4 w-4" />
  }];
  const filteredSections = helpSections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchTerm.toLowerCase()) || section.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || section.id === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const filteredFAQ = faqItems.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  return <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-full">
                <HelpCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-bold text-foreground">Central de Ajuda</h1>
            </div>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate('/dashboard')}>
              <Home className="h-4 w-4" />
              MENU
            </Button>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Encontre respostas, tutoriais e guias completos para aproveitar ao máximo 
            todas as funcionalidades do sistema OneDrip.
          </p>
        </div>

        {/* Search and Filters */}
        

        {/* Main Video Section */}
        <Card className="mb-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Play className="h-6 w-6" />
              Tutorial Completo do Sistema
            </CardTitle>
            <p className="text-primary-foreground/80">
              Assista ao vídeo tutorial completo e aprenda a usar todas as funcionalidades
            </p>
          </CardHeader>
          
        </Card>

        {/* Help Sections */}
        <div className="space-y-6 mb-12">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            Guias Detalhados por Módulo
          </h2>
          
          {filteredSections.map(section => <Card key={section.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <Collapsible open={openSections.includes(section.id)} onOpenChange={() => toggleSection(section.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          {section.icon}
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-xl flex items-center gap-2">
                            {section.title}
                            {section.videoIncluded}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1">{section.description}</p>
                        </div>
                      </div>
                      {openSections.includes(section.id) ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Separator className="mb-6" />
                    {section.content}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>)}
        </div>

        {/* FAQ Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <HelpCircle className="h-6 w-6" />
              Perguntas Frequentes
            </CardTitle>
            <p className="text-muted-foreground">
              Respostas rápidas para as dúvidas mais comuns
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredFAQ.map((item, index) => <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <h4 className="font-semibold text-foreground mb-2">{item.question}</h4>
                  <p className="text-muted-foreground text-sm">{item.answer}</p>
                </div>)}
            </div>
          </CardContent>
        </Card>



        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ExternalLink className="h-6 w-6" />
              Links Úteis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/terms', '_blank')}>
                <FileText className="h-6 w-6" />
                <span>Termos de Uso</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/privacy', '_blank')}>
                <Shield className="h-6 w-6" />
                <span>Política de Privacidade</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/cookies', '_blank')}>
                <Settings className="h-6 w-6" />
                <span>Cookies</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2" onClick={() => window.open('/suporte', '_blank')}>
                <MessageCircle className="h-6 w-6" />
                <span>Suporte</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Support Button removido */}
    </div>;
};
export default HelpCenterPage;