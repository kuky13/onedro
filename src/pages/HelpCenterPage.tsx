import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, Search, FileText, ClipboardList, Crown, Trash2, Settings, ChevronDown, ChevronRight, ExternalLink, BookOpen, Calculator, Shield, Home, MessageCircle, History, ThumbsUp, ThumbsDown, Zap, Video, ArrowRight, AlertCircle, LayoutDashboard, Wrench, ShieldCheck, Smartphone, Bell, Grid, Download, Headphones, Lock } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/useToast';
interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}
interface FAQItem {
  question: string;
  answer: string;
  category: string;
}
interface SearchHistory {
  id: string;
  query: string;
  timestamp: Date;
  results: number;
}

interface Feedback {
  id: string;
  type: 'helpful' | 'not-helpful';
  contentId: string;
  comment?: string;
}

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [openSections, setOpenSections] = useState<string[]>(['budgets']);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [activeTab, setActiveTab] = useState('search');
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  // Carregar histórico e feedback do localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('help_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    }

    const savedFeedback = localStorage.getItem('help_feedback');
    if (savedFeedback) {
      try {
        const feedbacks: Feedback[] = JSON.parse(savedFeedback);
        const counts: Record<string, number> = {};
        feedbacks.forEach((f) => {
          if (f.type === 'helpful') {
            counts[f.contentId] = (counts[f.contentId] || 0) + 1;
          }
        });
        setHelpfulCounts(counts);
      } catch (e) {
        console.error('Erro ao carregar feedback:', e);
      }
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]);
  };

  // Salvar histórico de buscas
  const saveSearchHistory = (query: string, results: number) => {
    if (query.length < 2) return;
    const newHistory: SearchHistory = {
      id: Date.now().toString(),
      query,
      timestamp: new Date(),
      results
    };
    const updated = [newHistory, ...searchHistory].slice(0, 10);
    setSearchHistory(updated);
    localStorage.setItem('help_search_history', JSON.stringify(updated));
  };

  // Salvar feedback
  const saveFeedback = (contentId: string, type: 'helpful' | 'not-helpful', comment?: string) => {
    const newFeedback: Feedback = {
      id: Date.now().toString(),
      type,
      contentId,
      ...(comment ? { comment } : {})
    };

    const saved = localStorage.getItem('help_feedback') || '[]';
    const feedbacks = JSON.parse(saved);
    feedbacks.push(newFeedback);
    localStorage.setItem('help_feedback', JSON.stringify(feedbacks.slice(-50)));

    if (type === 'helpful') {
      setHelpfulCounts((prev) => ({
        ...prev,
        [contentId]: (prev[contentId] || 0) + 1
      }));
    }

    showSuccess({ title: type === 'helpful' ? 'Obrigado pelo feedback!' : 'Sua opinião nos ajuda a melhorar!' });
    setShowFeedbackForm(null);
    setFeedbackComment('');
  };

  // Definir helpSections e faqItems antes de usar em useMemo
  // (serão redefinidos mais abaixo, mas precisamos das referências aqui)
  const helpSectionsRef = React.useRef<HelpSection[]>([]);
  const faqItemsRef = React.useRef<FAQItem[]>([]);

  // Sugestões de busca
  const searchSuggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];

    const allTerms = [
    ...helpSectionsRef.current.flatMap((s) => [s.title, s.description]),
    ...faqItemsRef.current.flatMap((f) => [f.question, f.answer])];


    return [...new Set(allTerms.
    filter((term) => term.toLowerCase().includes(searchTerm.toLowerCase())).
    slice(0, 5))];
  }, [searchTerm]);

  // Atalhos rápidos
  const quickAccessItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', color: 'text-indigo-500' },
  { icon: Wrench, label: 'Reparos', path: '/reparos', color: 'text-orange-600' },
  { icon: Calculator, label: 'Criar Orçamento', path: '/worm', color: 'text-blue-500' },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/service-orders', color: 'text-green-500' },
  { icon: MessageCircle, label: 'Falar com Drippy', path: '/chat', color: 'text-purple-500' },
  { icon: Trash2, label: 'Lixeira', path: '/trash', color: 'text-red-500' },
  { icon: ShieldCheck, label: 'Garantias', path: '/garantia', color: 'text-emerald-500' },
  { icon: Smartphone, label: 'Películas', path: '/p', color: 'text-teal-500' }];


  // Definir helpSections e faqItems primeiro
  const helpSections: HelpSection[] = [{
    id: 'budgets',
    title: 'Criação e Gestão de Orçamentos',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Aprenda a criar, visualizar e gerenciar orçamentos de forma eficiente',
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
  }, {
    id: 'drippy-ia',
    title: 'Drippy IA - Assistente Inteligente',
    icon: <MessageCircle className="h-5 w-5" />,
    description: 'Conheça a assistente virtual integrada ao sistema com busca inteligente e pesquisa na web',
    content: <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">🤖 Sobre a Drippy IA</h4>
        <p className="text-sm text-muted-foreground mb-3">
          A Drippy é uma assistente virtual inteligente totalmente integrada ao OneDrip.
          Ela pode buscar orçamentos, ordens de serviço, pesquisar informações na internet e muito mais!
        </p>
        <div className="bg-primary/10 p-3 rounded border border-border">
          <p className="text-xs text-foreground font-medium">
            ✨ Acesse a Drippy através do menu Dashboard, pela barra de busca ou em /chat
          </p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">🔍 Busca Inteligente de Orçamentos</h4>
        <p className="text-sm text-muted-foreground mb-2">A Drippy pode buscar orçamentos por:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li><strong>Número:</strong> "Busque o orçamento #38" ou "OR: 123"</li>
          <li><strong>Modelo:</strong> "iPhone 13", "Galaxy A12", "Redmi Note 11"</li>
          <li><strong>Cliente:</strong> Nome completo ou parcial</li>
          <li><strong>Data:</strong> "Orçamentos de hoje", "dessa semana", "janeiro"</li>
          <li><strong>Status:</strong> Pendente, aprovado, em andamento</li>
          <li><strong>Busca Mista:</strong> "iPhone 12 do João", "ordens pendentes de hoje"</li>
        </ul>
      </div>

      <div className="bg-primary/10 p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">📋 Busca de Ordens de Serviço</h4>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li><strong>Por Número:</strong> "Mostre a OS #45"</li>
          <li><strong>Por Cliente:</strong> Nome ou telefone</li>
          <li><strong>Por Aparelho:</strong> Modelo do dispositivo</li>
          <li><strong>Por Período:</strong> Data específica ou intervalo</li>
          <li><strong>Por Status:</strong> Pendente, em andamento, concluída</li>
        </ul>
      </div>

      <div className="bg-secondary/50 p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">🌐 Pesquisa na Internet (NOVO!)</h4>
        <p className="text-sm text-muted-foreground mb-2">
          A Drippy agora pode pesquisar informações atualizadas na web:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Notícias sobre tecnologia e dispositivos</li>
          <li>Informações técnicas e especificações</li>
          <li>Dicas de reparos e manutenção</li>
          <li>Curiosidades aleatórias</li>
        </ul>
      </div>

      <div className="bg-muted p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">🎭 Sistema de Humor Adaptativo</h4>
        <p className="text-sm text-muted-foreground mb-2">
          A Drippy adapta suas respostas baseado na interação:
        </p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>• <strong>100-80:</strong> 😊 Amigável e prestativa</p>
          <p>• <strong>79-60:</strong> 😐 Cordial e profissional</p>
          <p>• <strong>59-40:</strong> 🙂 Neutra e objetiva</p>
          <p>• <strong>39-20:</strong> 😑 Seca mas educada</p>
          <p>• <strong>19-0:</strong> 🥶 Extremamente fria</p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">⚙️ Outras Funcionalidades</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Consulta de clientes cadastrados</li>
          <li>Informações sobre películas compatíveis (redireciona para /p)</li>
          <li>Orientações sobre uso do sistema OneDrip</li>
          <li>Dicas de custos e precificação</li>
          <li>Explicações sobre processos de assistência técnica</li>
        </ul>
      </div>

      <div className="bg-destructive/10 p-4 rounded-lg border border-border">
        <h4 className="font-semibold text-foreground mb-2">⚠️ Importante</h4>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>A Drippy opera em <strong>modo somente leitura</strong></li>
          <li>Ela não cria ou modifica orçamentos/ordens de serviço</li>
          <li>Usa apenas dados reais do seu sistema</li>
          <li>Redireciona para páginas específicas quando necessário</li>
        </ul>
      </div>
    </div>
  }, {
    id: 'plans',
    title: 'Planos e Assinaturas',
    icon: <Crown className="h-5 w-5" />,
    description: 'Entenda como funcionam os planos, pagamentos e ativação de licença',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🛒 Onde ver os planos disponíveis</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse a página <strong>Planos e Preços</strong> em <code>/plans</code> ou pelo menu inicial.</li>
            <li>Escolha entre <strong>plano Mensal</strong> ou <strong>plano Anual</strong>.</li>
            <li>Veja os benefícios, depoimentos e perguntas frequentes antes de contratar.</li>
          </ol>
        </div>

        <div className="bg-primary/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">💳 Como contratar um plano</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Na página <strong>/plans</strong>, clique no botão <strong>Assinar</strong> do plano desejado.</li>
            <li>Você será redirecionado para o fluxo de contratação do plano selecionado.</li>
            <li>Preencha os dados solicitados e conclua o pagamento de forma segura.</li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔐 Ativação e renovação da licença</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Após o pagamento, acesse a página <code>/licenca</code> para visualizar o status da sua licença.</li>
            <li>Quando a licença estiver próxima do vencimento, use o atalho <strong>Ver Planos</strong> para renovar.</li>
            <li>Em caso de dúvidas sobre cobrança, plano ou cancelamento, fale com a Drippy em <code>/chat</code>.</li>
          </ul>
        </div>
      </div>

  }, {
    id: 'store',
    title: 'Minha Loja Online',
    icon: <Home className="h-5 w-5" />,
    description: 'Configure sua loja virtual para receber orçamentos e vender serviços/produtos online',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🚀 Criando sua loja</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse o app e clique em <strong>Minha Loja</strong> ou vá para <code>/store</code>.</li>
            <li>Se você ainda não tiver uma loja, será direcionado para <code>/store/nova</code> para criar.</li>
            <li>Defina nome, slug (endereço público) e demais informações básicas.</li>
          </ol>
        </div>

        <div className="bg-primary/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📨 Recebendo orçamentos da loja</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Os orçamentos recebidos pela loja ficam em <strong>/store/orcamentos</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Visualize todos os pedidos de orçamento feitos pelo site público.</li>
            <li>Edite dados do cliente, modelo do aparelho e valor estimado.</li>
            <li>Atualize status (Pendente, Aprovado, Em andamento, Concluído, etc.).</li>
            <li>Envie mensagens para o cliente via WhatsApp com um clique.</li>
          </ul>
        </div>

        <div className="bg-secondary/50 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🛠 Catálogo de reparos e produtos</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Catálogo de Reparos</strong> em <code>/store/servicos</code>: gerencie <em>Marcas</em>, <em>Modelos</em> e <em>Serviços</em> que aparecem na loja.
            </li>
            <li>
              <strong>Minha Loja</strong> em <code>/store/shop</code>: cadastre <em>Produtos</em> e <em>Categorias</em> para venda direta.
            </li>
          </ul>
        </div>

        <div className="bg-muted p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔗 Link público da loja</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>O endereço público segue o formato <code>/loja/&lt;slug-da-sua-loja&gt;</code>.</li>
            <li>Você pode copiar esse link na tela de Orçamentos da Loja para enviar para clientes.</li>
            <li>Compartilhe nas redes sociais, WhatsApp e site para receber mais pedidos.</li>
          </ul>
        </div>
      </div>

  }, {
    id: 'dashboard',
    title: 'Dashboard (Visão Geral)',
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: 'Acompanhe as métricas e indicadores de vendas e serviços da sua loja',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📊 Métricas Principais</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Visualize o faturamento total e ticket médio do período.</li>
            <li>Acompanhe quantos orçamentos foram aprovados ou rejeitados.</li>
            <li>Veja as tarefas pendentes e os próximos compromissos da assistência.</li>
          </ul>
        </div>
        <div className="bg-primary/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📈 Gráficos e Analytics</h4>
          <p className="text-sm text-muted-foreground">
            O Dashboard traz gráficos mostrando a evolução das suas receitas ao longo dos meses e a distribuição dos serviços mais realizados.
          </p>
        </div>
      </div>

  }, {
    id: 'reparos',
    title: 'Central de Reparos',
    icon: <Wrench className="h-5 w-5" />,
    description: 'Gestão de bancada, técnicos e serviços em andamento',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">👨‍🔧 Gestão de Técnicos</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Adicione e gerencie os técnicos que prestam serviço para a sua loja. Cada técnico pode ter serviços atrelados a ele.
          </p>
        </div>
        <div className="bg-primary/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔧 Serviços de Reparo</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acompanhe todos os aparelhos na bancada através de um quadro visualizado por status.</li>
            <li>Adicione peças e registre o custo real de cada conserto.</li>
            <li>Ao finalizar o serviço, a garantia é gerada automaticamente.</li>
          </ul>
        </div>
      </div>

  }, {
    id: 'garantia',
    title: 'Controle de Garantias',
    icon: <ShieldCheck className="h-5 w-5" />,
    description: 'Consulte garantias, registre devoluções e emita laudos',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔍 Verificação Rápida</h4>
          <p className="text-sm text-muted-foreground">
            Use a busca por IMEI, Cliente ou Número do Serviço para verificar rapidamente se o aparelho está dentro do prazo de garantia ou se os selos estão intactos.
          </p>
        </div>
      </div>

  }, {
    id: 'apps',
    title: 'Hub de Aplicativos',
    icon: <Grid className="h-5 w-5" />,
    description: 'Ative ou gerencie integrações no sistema',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🧩 Módulos Extra</h4>
          <p className="text-sm text-muted-foreground">
            No Hub de Aplicativos (/apps) você encontra opções para expandir o seu OneDrip, ativando módulos de gestão de estoque, emissão de nota, integradores, entre outros, que são disponibilizados gradualmente.
          </p>
        </div>
      </div>

  }, {
    id: 'peliculas',
    title: 'Consulta de Películas',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Consulte compatibilidade de películas entre diferentes modelos',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📱 Compatibilidade</h4>
          <p className="text-sm text-muted-foreground">
            Sabe aquele momento que falta a película de um modelo Específico? Use nossa busca em (/p) para saber instantaneamente quais outras películas do seu estoque servem naquele aparelho.
          </p>
        </div>
      </div>

  }, {
    id: 'notificacoes',
    title: 'Central de Notificações',
    icon: <Bell className="h-5 w-5" />,
    description: 'Fique por dentro das atualizações e alertas do sistema',
    content:
    <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔔 Alertas e Avisos</h4>
          <p className="text-sm text-muted-foreground">
            Receba notificações em tempo real sobre orçamentos aprovados, mensagens de clientes, tarefas da bancada que precisam de atenção, e novos recursos adicionados à plataforma.
          </p>
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
  }, {
    question: "Como uso a Drippy IA para buscar orçamentos?",
    answer: "Acesse a Drippy pelo Dashboard ou em /chat e pergunte naturalmente: 'Busque o orçamento #38', 'Mostre orçamentos de iPhone', 'Ordens do cliente João', etc. Ela entende linguagem natural!",
    category: "drippy-ia"
  }, {
    question: "A Drippy pode pesquisar informações na internet?",
    answer: "Sim! A Drippy agora pode buscar informações atualizadas na web sobre tecnologia, notícias, especificações de dispositivos e muito mais.",
    category: "drippy-ia"
  }, {
    question: "O que é o sistema de humor adaptativo da Drippy?",
    answer: "A Drippy adapta o tom das respostas baseado na interação. Se você for educado, ela responde de forma amigável. Se for grosseiro, ela fica mais fria, mas sempre mantém o profissionalismo.",
    category: "drippy-ia"
  }, {
    question: "Como contratar ou renovar meu plano?",
    answer: "Acesse /plans, escolha entre plano mensal ou anual e conclua o pagamento. Após a confirmação, verifique o status em /licenca.",
    category: "plans"
  }, {
    question: "Como ativar minha loja online?",
    answer: "Acesse /store para criar ou gerenciar sua loja. Se ainda não tiver uma, você será direcionado para /store/nova.",
    category: "store"
  }, {
    question: "Onde vejo o faturamento total da minha loja?",
    answer: "Todas as métricas principais, incluindo o faturamento, ticket médio e orçamentos aprovados, ficam logo na primeira tela ao acessar o Dashboard.",
    category: "dashboard"
  }, {
    question: "Como defino quem fez um conserto?",
    answer: "Em 'Reparos', você pode cadastrar Técnicos na aba correspondente e vinculá-los aos serviços que estão em andamento.",
    category: "reparos"
  }, {
    question: "Como saber se um aparelho ainda tem garantia?",
    answer: "Acesse a seção de Garantias e pesquise pelo número do orçamento, ordem de serviço, cliente ou IMEI do dispositivo. O sistema indicará os dias restantes.",
    category: "garantia"
  }, {
    question: "O que é o Hub de Aplicativos?",
    answer: "É uma seção onde você pode ativar, desativar e gerenciar integrações extras ou módulos opcionais disponíveis no ecossistema OneDrip.",
    category: "apps"
  }, {
    question: "Como saber qual película serve em qual celular?",
    answer: "Acesse a Consulta de Películas (/p) e digite o modelo do celular. O sistema vai listar todos os aparelhos que utilizam a mesma película.",
    category: "peliculas"
  }, {
    question: "Como limpo minhas notificações?",
    answer: "Ao acessar a página de Notificações pelo ícone do sino, você pode visualizar todos os alertas e usar o botão de Marcar Todas como Lidas para limpar o painel.",
    category: "notificacoes"
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
  }, {
    id: 'drippy-ia',
    label: 'Drippy IA',
    icon: <MessageCircle className="h-4 w-4" />
  }, {
    id: 'plans',
    label: 'Planos e Assinaturas',
    icon: <Crown className="h-4 w-4" />
  }, {
    id: 'store',
    label: 'Minha Loja',
    icon: <Home className="h-4 w-4" />
  }, {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />
  }, {
    id: 'reparos',
    label: 'Reparos',
    icon: <Wrench className="h-4 w-4" />
  }, {
    id: 'garantia',
    label: 'Garantias',
    icon: <ShieldCheck className="h-4 w-4" />
  }, {
    id: 'apps',
    label: 'Aplicativos',
    icon: <Grid className="h-4 w-4" />
  }, {
    id: 'peliculas',
    label: 'Películas',
    icon: <Smartphone className="h-4 w-4" />
  }, {
    id: 'notificacoes',
    label: 'Notificações',
    icon: <Bell className="h-4 w-4" />
  }];
  const filteredSections = useMemo(() => {
    return helpSections.filter((section) => {
      const matchesSearch = section.title.toLowerCase().includes(searchTerm.toLowerCase()) || section.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || section.id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, helpSections]);

  const filteredFAQ = useMemo(() => {
    return faqItems.filter((item) => {
      const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) || item.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, faqItems]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    if (query.length >= 2) {
      const results = filteredSections.length + filteredFAQ.length;
      saveSearchHistory(query, results);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="mb-4">
          <h1 className="text-4xl font-bold text-foreground text-center">Documentação</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Encontre respostas, tutoriais e guias completos para aproveitar ao máximo
          todas as funcionalidades do sistema OneDrip.
        </p>
      </div>

      {/* Busca Inteligente Melhorada */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Busque por palavras-chave, perguntas ou funcionalidades..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-6 text-lg" />
            
            {searchSuggestions.length > 0 &&
            <div className="absolute z-10 w-full mt-2 bg-card border rounded-lg shadow-lg">
                {searchSuggestions.map((suggestion, idx) =>
              <button
                key={idx}
                onClick={() => handleSearch(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-2">
                
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </button>
              )}
              </div>
            }
          </div>

          {/* Histórico de Buscas */}
          {searchHistory.length > 0 && searchTerm === '' &&
          <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Buscas recentes:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 5).map((item) =>
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                onClick={() => handleSearch(item.query)}
                className="text-xs">
                
                    {item.query}
                  </Button>
              )}
              </div>
            </div>
          }
        </CardContent>
      </Card>

      {/* Atalhos Rápidos */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Atalhos Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickAccessItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Button
                  key={idx}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-primary/5"
                  onClick={() => navigate(item.path)}>
                  
                  <Icon className={`h-6 w-6 ${item.color}`} />
                  <span className="text-xs text-center">{item.label}</span>
                </Button>);

            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs para diferentes visualizações */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="search">Buscar</TabsTrigger>
          <TabsTrigger value="guides">Guias</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="tutorials">Tutoriais</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          {/* Filtros de Categoria */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) =>
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="flex items-center gap-2">
              
                {cat.icon}
                {cat.label}
              </Button>
            )}
          </div>

          {/* Help Sections */}
          <div className="space-y-6 mb-12">
            {filteredSections.length === 0 && filteredFAQ.length === 0 ?
            <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum resultado encontrado para "{searchTerm}"
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tente usar termos diferentes ou navegue pelas categorias acima
                  </p>
                </CardContent>
              </Card> :

            <>
                {filteredSections.map((section) => <Card key={section.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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

                        {/* Feedback */}
                        <div className="mt-6 flex items-center gap-4 pt-4 border-t">
                          <span className="text-sm text-muted-foreground">Esta informação foi útil?</span>
                          {(helpfulCounts[section.id] ?? 0) > 0 &&
                        <Badge variant="secondary" className="flex items-center gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              {helpfulCounts[section.id]}
                            </Badge>
                        }
                          <div className="flex gap-2">
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveFeedback(section.id, 'helpful')}
                            className="flex items-center gap-1">
                            
                              <ThumbsUp className="h-4 w-4" />
                              Sim
                            </Button>
                            <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFeedbackForm(section.id)}
                            className="flex items-center gap-1">
                            
                              <ThumbsDown className="h-4 w-4" />
                              Não
                            </Button>
                          </div>
                        </div>

                        {showFeedbackForm === section.id &&
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                            <Label htmlFor="feedback">Como podemos melhorar?</Label>
                            <Textarea
                          id="feedback"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder="Sua opinião nos ajuda muito..."
                          className="mt-2" />
                        
                            <div className="flex gap-2 mt-2">
                              <Button
                            size="sm"
                            onClick={() => saveFeedback(section.id, 'not-helpful', feedbackComment)}>
                            
                                Enviar
                              </Button>
                              <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowFeedbackForm(null);
                              setFeedbackComment('');
                            }}>
                            
                                Cancelar
                              </Button>
                            </div>
                          </div>
                      }
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>)}
              </>
            }
          </div>
        </TabsContent>

        <TabsContent value="guides" className="mt-6">
          <div className="space-y-6">
            {helpSections.map((section) =>
            <Card key={section.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {section.content}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <div className="space-y-4">
            {filteredFAQ.map((item, index) =>
            <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{item.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.answer}</p>
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex gap-2 ml-auto">
                      <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveFeedback(`faq-${index}`, 'helpful')}>
                      
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveFeedback(`faq-${index}`, 'not-helpful')}>
                      
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tutorials" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Tutorial: Criando seu Primeiro Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Aprenda passo a passo como criar um orçamento profissional em minutos.
                </p>
                <Button onClick={() => navigate('/worm')} className="w-full">
                  Começar Tutorial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Tutorial: Usando a Drippy IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Descubra como usar a assistente virtual para buscar orçamentos e obter ajuda.
                </p>
                <Button onClick={() => navigate('/chat')} className="w-full">
                  Começar Tutorial
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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