import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Calculator, ClipboardList, Trash2, Settings, MessageCircle, Crown, Home,
  Wrench, ShieldCheck, Smartphone, Download, Headphones, Lock,
  BookOpen, HelpCircle
} from 'lucide-react';

export interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: React.ReactNode;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface QuickAccessItem {
  icon: React.ComponentType<{ className?: string | undefined }>;
  label: string;
  path: string;
  color: string;
}

export const quickAccessItems: QuickAccessItem[] = [
  { icon: Wrench, label: 'Reparos', path: '/reparos', color: 'text-orange-600' },
  { icon: Calculator, label: 'Criar Orçamento', path: '/worm', color: 'text-blue-500' },
  { icon: ClipboardList, label: 'Ordens de Serviço', path: '/service-orders', color: 'text-green-500' },
  { icon: MessageCircle, label: 'Falar com Drippy', path: '/chat', color: 'text-purple-500' },
  { icon: Trash2, label: 'Lixeira', path: '/trash', color: 'text-red-500' },
  { icon: ShieldCheck, label: 'Garantias', path: '/garantia', color: 'text-emerald-500' },
  { icon: Smartphone, label: 'Películas', path: '/p', color: 'text-teal-500' },
  { icon: Headphones, label: 'Suporte', path: '/suporte', color: 'text-pink-500' },
];

export const helpSections: HelpSection[] = [
  {
    id: 'budgets',
    title: 'Criação e Gestão de Orçamentos',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Aprenda a criar, visualizar e gerenciar orçamentos de forma eficiente',
    content: (
      <div className="space-y-6">
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
    ),
  },
  {
    id: 'service-orders',
    title: 'Ordens de Serviço',
    icon: <ClipboardList className="h-5 w-5" />,
    description: 'Gerencie ordens de serviço, acompanhe status e organize o workflow',
    content: (
      <div className="space-y-6">
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
    ),
  },
  {
    id: 'trash',
    title: 'Sistema de Lixeira',
    icon: <Trash2 className="h-5 w-5" />,
    description: 'Recupere itens excluídos e gerencie a lixeira do sistema',
    content: (
      <div className="space-y-6">
        <div className="bg-destructive/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🗑️ Como Funciona a Lixeira</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Quando você exclui uma ordem de serviço, ela não é removida permanentemente.
            Em vez disso, é movida para a lixeira, onde pode ser recuperada ou excluída definitivamente.
          </p>
          <div className="bg-destructive/20 p-3 rounded border border-border">
            <p className="text-xs text-destructive font-medium">⚠️ Itens na lixeira podem ser recuperados a qualquer momento</p>
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
      </div>
    ),
  },
  {
    id: 'settings',
    title: 'Configurações do Sistema',
    icon: <Settings className="h-5 w-5" />,
    description: 'Personalize sua experiência e configure preferências da aplicação',
    content: (
      <div className="space-y-6">
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
    ),
  },
  {
    id: 'drippy-ia',
    title: 'Drippy IA - Assistente Inteligente',
    icon: <MessageCircle className="h-5 w-5" />,
    description: 'Conheça a assistente virtual integrada ao sistema com busca inteligente e pesquisa na web',
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🤖 Sobre a Drippy IA</h4>
          <p className="text-sm text-muted-foreground mb-3">
            A Drippy é uma assistente virtual inteligente totalmente integrada ao OneDrip.
            Ela pode buscar orçamentos, ordens de serviço, pesquisar informações na internet e muito mais!
          </p>
          <div className="bg-primary/10 p-3 rounded border border-border">
            <p className="text-xs text-foreground font-medium">✨ Acesse a Drippy através do menu Dashboard, pela barra de busca ou em /chat</p>
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
          </ul>
        </div>
        <div className="bg-secondary/50 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🌐 Pesquisa na Internet</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Notícias sobre tecnologia e dispositivos</li>
            <li>Informações técnicas e especificações</li>
            <li>Dicas de reparos e manutenção</li>
          </ul>
        </div>
        <div className="bg-destructive/10 p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">⚠️ Importante</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>A Drippy opera em <strong>modo somente leitura</strong></li>
            <li>Ela não cria ou modifica orçamentos/ordens de serviço</li>
            <li>Usa apenas dados reais do seu sistema</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'plans',
    title: 'Planos e Assinaturas',
    icon: <Crown className="h-5 w-5" />,
    description: 'Entenda como funcionam os planos, pagamentos e ativação de licença',
    content: (
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
            <li>Em caso de dúvidas, fale com a Drippy em <code>/chat</code>.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'store',
    title: 'Minha Loja Online',
    icon: <Home className="h-5 w-5" />,
    description: 'Configure sua loja virtual para receber orçamentos e vender serviços/produtos online',
    content: (
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
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Visualize todos os pedidos de orçamento feitos pelo site público.</li>
            <li>Atualize status (Pendente, Aprovado, Em andamento, Concluído, etc.).</li>
            <li>Envie mensagens para o cliente via WhatsApp com um clique.</li>
          </ul>
        </div>
        <div className="bg-muted p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔗 Link público da loja</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>O endereço público segue o formato <code>/loja/&lt;slug-da-sua-loja&gt;</code>.</li>
            <li>Compartilhe nas redes sociais, WhatsApp e site para receber mais pedidos.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'reparos',
    title: 'Central de Reparos',
    icon: <Wrench className="h-5 w-5" />,
    description: 'Gestão de bancada, técnicos e serviços em andamento',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">👨‍🔧 Gestão de Técnicos</h4>
          <p className="text-sm text-muted-foreground">
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
    ),
  },
  {
    id: 'garantia',
    title: 'Controle de Garantias',
    icon: <ShieldCheck className="h-5 w-5" />,
    description: 'Consulte garantias, registre devoluções e emita laudos',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔍 Verificação Rápida</h4>
          <p className="text-sm text-muted-foreground">
            Use a busca por IMEI, Cliente ou Número do Serviço para verificar rapidamente se o aparelho está dentro do prazo de garantia.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'peliculas',
    title: 'Consulta de Películas',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Consulte compatibilidade de películas entre diferentes modelos',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📱 Compatibilidade</h4>
          <p className="text-sm text-muted-foreground">
            Use nossa busca em (/p) para saber instantaneamente quais outras películas do seu estoque servem naquele aparelho.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'downloads',
    title: 'Download de Vídeos',
    icon: <Download className="h-5 w-5" />,
    description: 'Use o downloader integrado para baixar vídeos do YouTube e outras plataformas',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📥 Como Baixar Vídeos</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Acesse a página <strong>/downloads</strong> pelo menu ou diretamente na URL.</li>
            <li>Cole o link do vídeo (YouTube, Instagram, TikTok, Twitter/X, etc.).</li>
            <li>Escolha a qualidade e formato desejado (MP4, MP3, etc.).</li>
            <li>Clique em <strong>Baixar</strong> e aguarde o processamento.</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: 'suporte',
    title: 'Suporte e Atendimento',
    icon: <Headphones className="h-5 w-5" />,
    description: 'Saiba como entrar em contato com a equipe de suporte',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">📞 Canais de Atendimento</h4>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">💬</span>
              <div><p className="font-semibold text-foreground">WhatsApp</p><p>Resposta imediata, disponível 24/7.</p></div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">🎮</span>
              <div><p className="font-semibold text-foreground">Discord</p><p>Comunidade ativa. Tempo de resposta: 1-2h.</p></div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-lg">📧</span>
              <div><p className="font-semibold text-foreground">E-mail</p><p>suporte@onedrip.email — Seg-Sex, 9h-18h.</p></div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'conta-seguranca',
    title: 'Conta e Segurança',
    icon: <Lock className="h-5 w-5" />,
    description: 'Gerencie sua conta, altere senha, exporte dados e entenda a LGPD',
    content: (
      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🔑 Gerenciamento de Senha</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Alterar Senha:</strong> Acesse Configurações {'>'} Conta {'>'} Alterar Senha.</li>
            <li><strong>Esqueceu a Senha:</strong> Na tela de login, clique em "Esqueci minha senha" para receber link de redefinição.</li>
          </ul>
        </div>
        <div className="bg-muted p-4 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-2">🛡️ LGPD e Privacidade</h4>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>O OneDrip segue a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.</li>
            <li>Seus dados são armazenados de forma segura e criptografada.</li>
            <li>Consulte nossa <strong>Política de Privacidade</strong> em <code>/privacy</code>.</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export const faqItems: FAQItem[] = [
  { question: 'Como posso recuperar um orçamento excluído?', answer: 'Os orçamentos excluídos são movidos para a lixeira. Acesse a seção de lixeira, localize o item e clique em "Restaurar".', category: 'budgets' },
  { question: 'Quais recursos estão disponíveis no sistema?', answer: 'O sistema oferece funcionalidades completas de ordens de serviço, incluindo página de detalhes e histórico de eventos.', category: 'service-orders' },
  { question: 'Como alterar o status de uma ordem de serviço?', answer: 'Na lista de ordens de serviço, clique no cartão da ordem desejada e use os botões de ação para alterar o status.', category: 'service-orders' },
  { question: 'Como limpar o cache do sistema?', answer: 'Acesse Configurações > Ações da Conta > Limpeza de Cache. Isso removerá dados temporários, mas manterá seus dados seguros.', category: 'settings' },
  { question: 'É possível filtrar ordens de serviço por prioridade?', answer: 'Sim! Use os filtros na página de ordens de serviço para filtrar por status, prioridade, cliente ou período específico.', category: 'service-orders' },
  { question: 'Como uso a Drippy IA para buscar orçamentos?', answer: 'Acesse a Drippy pelo Dashboard ou em /chat e pergunte naturalmente: "Busque o orçamento #38", "Mostre orçamentos de iPhone", etc.', category: 'drippy-ia' },
  { question: 'A Drippy pode pesquisar informações na internet?', answer: 'Sim! A Drippy pode buscar informações atualizadas na web sobre tecnologia, notícias, especificações de dispositivos e muito mais.', category: 'drippy-ia' },
  { question: 'Como contratar ou renovar meu plano?', answer: 'Acesse /plans, escolha entre plano mensal ou anual e conclua o pagamento. Após a confirmação, verifique o status em /licenca.', category: 'plans' },
  { question: 'Como ativar minha loja online?', answer: 'Acesse /store para criar ou gerenciar sua loja. Se ainda não tiver uma, você será direcionado para /store/nova.', category: 'store' },
  { question: 'Como defino quem fez um conserto?', answer: 'Em "Reparos", você pode cadastrar Técnicos na aba correspondente e vinculá-los aos serviços em andamento.', category: 'reparos' },
  { question: 'Como saber se um aparelho ainda tem garantia?', answer: 'Acesse a seção de Garantias e pesquise pelo número do orçamento, OS, cliente ou IMEI. O sistema indicará os dias restantes.', category: 'garantia' },
  { question: 'Como saber qual película serve em qual celular?', answer: 'Acesse a Consulta de Películas (/p) e digite o modelo do celular.', category: 'peliculas' },
  { question: 'Como baixar vídeos pelo sistema?', answer: 'Acesse /downloads, cole o link do vídeo, escolha a qualidade desejada e clique em Baixar.', category: 'downloads' },
  { question: 'Como abrir um chamado de suporte?', answer: 'Acesse /suporte e escolha o canal: WhatsApp (resposta imediata), Discord (comunidade) ou E-mail (suporte@onedrip.email).', category: 'suporte' },
  { question: 'Como alterar minha senha?', answer: 'Acesse Configurações > Conta > Alterar Senha. Você também pode usar "Esqueci minha senha" na tela de login.', category: 'conta-seguranca' },
  { question: 'Meus dados estão protegidos pela LGPD?', answer: 'Sim! O OneDrip segue a Lei Geral de Proteção de Dados. Você pode solicitar exportação ou exclusão dos seus dados a qualquer momento.', category: 'conta-seguranca' },
];

export const helpCategories: CategoryItem[] = [
  { id: 'all', label: 'Todas as Categorias', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'budgets', label: 'Orçamentos', icon: <Calculator className="h-4 w-4" /> },
  { id: 'service-orders', label: 'Ordens de Serviço', icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'trash', label: 'Lixeira', icon: <Trash2 className="h-4 w-4" /> },
  { id: 'settings', label: 'Configurações', icon: <Settings className="h-4 w-4" /> },
  { id: 'drippy-ia', label: 'Drippy IA', icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'plans', label: 'Planos e Assinaturas', icon: <Crown className="h-4 w-4" /> },
  { id: 'store', label: 'Minha Loja', icon: <Home className="h-4 w-4" /> },
  { id: 'reparos', label: 'Reparos', icon: <Wrench className="h-4 w-4" /> },
  { id: 'garantia', label: 'Garantias', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'peliculas', label: 'Películas', icon: <Smartphone className="h-4 w-4" /> },
  { id: 'downloads', label: 'Downloads', icon: <Download className="h-4 w-4" /> },
  { id: 'suporte', label: 'Suporte', icon: <Headphones className="h-4 w-4" /> },
  { id: 'conta-seguranca', label: 'Conta e Segurança', icon: <Lock className="h-4 w-4" /> },
];
