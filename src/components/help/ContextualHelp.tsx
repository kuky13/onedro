import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Video, 
  ArrowRight,
  Lightbulb,
  Zap,
  Users,
  FileText,
  Settings,
  BarChart2,
  Shield,
  Star,
  HelpCircle,
  Wrench,
  Crown
} from 'lucide-react';
import { HelpContent } from '@/hooks/useHelpSystem';

interface ContextualHelpProps {
  context: string;
  onContentSelect: (content: HelpContent) => void;
  onStartTutorial: () => void;
}

// Conteúdo de ajuda por contexto
const helpContentByContext: Record<string, HelpContent[]> = {
  dashboard: [
    {
      id: 'dashboard-overview',
      title: 'Visão Geral do Dashboard',
      description: 'Entenda como interpretar as métricas e gráficos do seu painel principal.',
      category: 'basic',
      tags: ['dashboard', 'métricas', 'gráficos'],
      icon: 'BarChart2',
      steps: [
        {
          title: 'Métricas Principais',
          description: 'Veja seu faturamento, ticket médio e total de orçamentos.',
          target: '[data-help="metrics"]',
          position: 'bottom'
        },
        {
          title: 'Gráfico de Vendas',
          description: 'Acompanhe a evolução das suas vendas ao longo do tempo.',
          target: '[data-help="sales-chart"]',
          position: 'top'
        }
      ]
    },
    {
      id: 'dashboard-quick-actions',
      title: 'Ações Rápidas',
      description: 'Aprenda a usar os botões de ação rápida para agilizar seu trabalho.',
      category: 'tips',
      tags: ['ações', 'produtividade'],
      icon: 'Zap'
    }
  ],
  budgets: [
    {
      id: 'budget-management',
      title: 'Gerenciar Orçamentos',
      description: 'Como visualizar, editar, compartilhar e organizar seus orçamentos.',
      category: 'basic',
      tags: ['orçamentos', 'gestão'],
      icon: 'FileText',
      steps: [
        {
          title: 'Lista de Orçamentos',
          description: 'Veja todos os seus orçamentos organizados por status.',
          target: '[data-help="budget-list"]',
          position: 'right'
        },
        {
          title: 'Filtros e Busca',
          description: 'Use filtros para encontrar orçamentos específicos rapidamente.',
          target: '[data-help="budget-filters"]',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'budget-status',
      title: 'Status dos Orçamentos',
      description: 'Entenda o significado de cada status e como gerenciar o fluxo.',
      category: 'faq',
      tags: ['status', 'fluxo'],
      icon: 'BookOpen'
    }
  ],
  'new-budget': [
    {
      id: 'create-budget',
      title: 'Criar Novo Orçamento',
      description: 'Passo a passo completo para criar orçamentos profissionais.',
      category: 'tutorial',
      tags: ['criar', 'orçamento', 'tutorial'],
      icon: 'FileText',
      steps: [
        {
          title: 'Dados do Cliente',
          description: 'Preencha as informações básicas do cliente.',
          target: '[data-help="client-info"]',
          position: 'right'
        },
        {
          title: 'Informações do Dispositivo',
          description: 'Adicione detalhes sobre o dispositivo e problema.',
          target: '[data-help="device-info"]',
          position: 'right'
        },
        {
          title: 'Serviços e Valores',
          description: 'Defina os serviços e valores do orçamento.',
          target: '[data-help="services"]',
          position: 'right'
        }
      ]
    }
  ],
  worm: [
    {
      id: 'worm-system-overview',
      title: 'Worm System - Sistema Exclusivo de Orçamentos',
      description: 'Sistema avançado para gestão completa de orçamentos com recursos premium.',
      category: 'basic',
      tags: ['worm', 'orçamentos', 'sistema'],
      icon: 'FileText',
      steps: [
        {
          title: 'Acesso ao Worm',
          description: 'Acesse através do menu principal ou URL /worm.',
          target: '[data-help="worm-access"]',
          position: 'bottom'
        },
        {
          title: 'Lista Avançada',
          description: 'Visualize orçamentos com filtros avançados e busca.',
          target: '[data-help="worm-list"]',
          position: 'right'
        },
        {
          title: 'Gerenciamento de Status',
          description: 'Altere status, compartilhe e gerencie ciclo de vida dos orçamentos.',
          target: '[data-help="worm-actions"]',
          position: 'top'
        }
      ]
    },
    {
      id: 'worm-trash-system',
      title: 'Sistema de Lixeira (/worm/lixeira)',
      description: 'Recupere orçamentos excluídos e gerencie itens na lixeira.',
      category: 'basic',
      tags: ['lixeira', 'recuperação', 'exclusão'],
      icon: 'Shield'
    },
    {
      id: 'worm-features',
      title: 'Recursos Premium do Worm',
      description: 'Compartilhamento via WhatsApp, PDFs automáticos, histórico completo.',
      category: 'advanced',
      tags: ['premium', 'whatsapp', 'pdf'],
      icon: 'Star'
    }
  ],
  clients: [
    {
      id: 'client-management',
      title: 'Gestão de Clientes',
      description: 'Como cadastrar, editar e organizar sua base de clientes.',
      category: 'basic',
      tags: ['clientes', 'cadastro'],
      icon: 'Users',
      steps: [
        {
          title: 'Cadastro de Cliente',
          description: 'Adicione novos clientes com dados completos.',
          target: '[data-help="client-form"]',
          position: 'right'
        },
        {
          title: 'Gestão Avançada',
          description: 'Para usuários com recursos avançados ativados.',
          target: '[data-help="advanced-clients"]',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'advanced-client-features',
      title: 'Funcionalidades Avançadas de Clientes',
      description: 'Recursos premium para gestão completa da base de clientes.',
      category: 'advanced',
      tags: ['avançado', 'premium', 'histórico'],
      icon: 'Star'
    }
  ],
  'service-orders': [
    {
      id: 'service-orders-overview',
      title: 'Ordens de Serviço',
      description: 'Sistema completo para gerenciar ordens de serviço técnico.',
      category: 'basic',
      tags: ['ordem-serviço', 'técnico', 'gestão'],
      icon: 'Wrench',
      steps: [
        {
          title: 'Criar Nova OS',
          description: 'Crie ordens de serviço detalhadas.',
          target: '[data-help="new-service-order"]',
          position: 'right'
        },
        {
          title: 'Acompanhar Status',
          description: 'Monitore o progresso e atualize status.',
          target: '[data-help="service-status"]',
          position: 'bottom'
        },
        {
          title: 'Compartilhamento',
          description: 'Compartilhe OS com clientes via link público.',
          target: '[data-help="service-share"]',
          position: 'top'
        }
      ]
    },
    {
      id: 'service-orders-advanced',
      title: 'Recursos Avançados para OS',
      description: 'Funcionalidades avançadas para ordens de serviço.',
      category: 'advanced',
      tags: ['avançado', 'premium', 'recursos'],
      icon: 'Crown'
    }
  ],
  settings: [
    {
      id: 'company-settings',
      title: 'Configurações da Empresa',
      description: 'Personalize as informações que aparecem nos seus orçamentos.',
      category: 'basic',
      tags: ['empresa', 'personalização'],
      icon: 'Settings',
      steps: [
        {
          title: 'Dados da Empresa',
          description: 'Configure nome, endereço e contatos.',
          target: '[data-help="company-data"]',
          position: 'right'
        },
        {
          title: 'Branding',
          description: 'Personalize cores, logo e aparência.',
          target: '[data-help="branding"]',
          position: 'bottom'
        }
      ]
    },
    {
      id: 'advanced-features-settings',
      title: 'Funcionalidades Avançadas',
      description: 'Ative recursos premium como controle avançado de clientes.',
      category: 'advanced',
      tags: ['avançado', 'beta', 'premium'],
      icon: 'Star'
    },
    {
      id: 'beta-features',
      title: 'Recursos Beta',
      description: 'Teste novas funcionalidades em desenvolvimento.',
      category: 'advanced',
      tags: ['beta', 'experimental'],
      icon: 'Shield'
    }
  ],
  security: [
    {
      id: 'security-dashboard',
      title: 'Dashboard de Segurança',
      description: 'Monitore a segurança da sua conta e dados.',
      category: 'basic',
      tags: ['segurança', 'monitoramento'],
      icon: 'Shield',
      steps: [
        {
          title: 'Alertas de Segurança',
          description: 'Visualize alertas e notificações de segurança.',
          target: '[data-help="security-alerts"]',
          position: 'bottom'
        },
        {
          title: 'Configurações',
          description: 'Ajuste preferências de segurança.',
          target: '[data-help="security-settings"]',
          position: 'right'
        }
      ]
    }
  ],
  game: [
    {
      id: 'bug-hunter-game',
      title: 'Jogo Caçador de Bugs',
      description: 'Mini-game interativo para relaxar durante o trabalho.',
      category: 'tutorial',
      tags: ['jogo', 'entretenimento', 'bugs'],
      icon: 'BookOpen',
      steps: [
        {
          title: 'Como Jogar',
          description: 'Clique nos bugs para eliminá-los e ganhar pontos.',
          target: '[data-help="game-board"]',
          position: 'bottom'
        },
        {
          title: 'Conquistas',
          description: 'Desbloqueie conquistas jogando regularmente.',
          target: '[data-help="achievements"]',
          position: 'right'
        }
      ]
    }
  ],
  general: [
    {
      id: 'getting-started',
      title: 'Primeiros Passos',
      description: 'Guia completo para começar a usar o sistema.',
      category: 'tutorial',
      tags: ['início', 'básico'],
      icon: 'BookOpen',
      steps: [
        {
          title: 'Configuração Inicial',
          description: 'Configure dados da empresa e preferências.',
          target: '[data-help="initial-setup"]',
          position: 'bottom'
        },
        {
          title: 'Primeiro Orçamento',
          description: 'Crie seu primeiro orçamento no sistema.',
          target: '[data-help="first-budget"]',
          position: 'right'
        }
      ]
    },
    {
      id: 'system-navigation',
      title: 'Navegação do Sistema',
      description: 'Aprenda a navegar entre todas as seções disponíveis.',
      category: 'basic',
      tags: ['navegação', 'menu', 'rotas'],
      icon: 'BookOpen'
    }
  ],
  plans: [
    {
      id: 'plans-overview',
      title: 'Escolhendo um Plano',
      description: 'Veja como comparar planos, entender benefícios e assinar o ideal para seu negócio.',
      category: 'basic',
      tags: ['planos', 'assinatura', 'benefícios'],
      icon: 'BookOpen',
      steps: [
        {
          title: 'Comparação de Planos',
          description: 'Compare recursos, preços e escolha o que melhor atende sua assistência.',
          target: '[data-help="plan-comparison"]',
          position: 'bottom'
        },
        {
          title: 'Assinatura e Pagamento',
          description: 'Veja como assinar e enviar comprovante pelo WhatsApp.',
          target: '[data-help="plan-payment"]',
          position: 'right'
        }
      ]
    }
  ],
  index: [
    {
      id: 'welcome',
      title: 'Bem-vindo ao OneDrip!',
      description: 'Descubra as principais funcionalidades e como começar rapidamente.',
      category: 'tutorial',
      tags: ['início', 'apresentação'],
      icon: 'Lightbulb',
      steps: [
        {
          title: 'Cadastro e Login',
          description: 'Crie sua conta ou faça login para acessar o sistema.',
          target: '[data-help="login-section"]',
          position: 'bottom'
        },
        {
          title: 'Explorando o Sistema',
          description: 'Veja as principais áreas: orçamentos, clientes, relatórios e configurações.',
          target: '[data-help="features-section"]',
          position: 'bottom'
        }
      ]
    }
  ],
  license: [
    {
      id: 'license-help',
      title: 'Licença Expirada ou Conta Inativa',
      description: 'Saiba como renovar sua licença ou ativar sua conta para continuar usando o sistema.',
      category: 'faq',
      tags: ['licença', 'renovação', 'ativação'],
      icon: 'Shield',
      steps: [
        {
          title: 'Entrar em Contato',
          description: 'Fale com o suporte via WhatsApp para ativar ou renovar sua licença.',
          target: '[data-help="license-support"]',
          position: 'bottom'
        }
      ]
    }
  ],
  purchase: [
    {
      id: 'purchase-success',
      title: 'Sucesso na Compra',
      description: 'Veja os próximos passos após a confirmação do pagamento.',
      category: 'tips',
      tags: ['compra', 'pagamento', 'acesso'],
      icon: 'Star',
      steps: [
        {
          title: 'Envio do Comprovante',
          description: 'Envie o comprovante de pagamento pelo WhatsApp para liberar seu acesso.',
          target: '[data-help="purchase-whatsapp"]',
          position: 'bottom'
        },
        {
          title: 'Recebendo Credenciais',
          description: 'Aguarde a confirmação e receba suas credenciais para acessar o sistema.',
          target: '[data-help="purchase-credentials"]',
          position: 'bottom'
        }
      ]
    }
  ],
  notfound: [
    {
      id: 'notfound-help',
      title: 'Página Não Encontrada (404)',
      description: 'Saiba o que fazer se você cair em uma página inexistente.',
      category: 'faq',
      tags: ['erro', '404', 'ajuda'],
      icon: 'HelpCircle',
      steps: [
        {
          title: 'Voltar ao Início',
          description: 'Clique para retornar à página inicial e continue sua navegação.',
          target: '[data-help="notfound-home"]',
          position: 'bottom'
        }
      ]
    }
  ]
};

const getIcon = (iconName: string) => {
  const icons: Record<string, React.ComponentType<any>> = {
    BarChart2,
    Zap,
    FileText,
    BookOpen,
    Users,
    Settings,
    Lightbulb,
    Shield,
    Star,
    HelpCircle,
    Wrench,
    Crown
  };
  
  const IconComponent = icons[iconName] || BookOpen;
  return <IconComponent className="h-4 w-4" />;
};

export const ContextualHelp = ({
  context,
  onContentSelect,
  onStartTutorial
}: ContextualHelpProps) => {
  const contextHelp = helpContentByContext[context] || helpContentByContext.general || [];
  
  const tutorialContent = contextHelp.find(content => content.category === 'tutorial');

  return (
    <div className="space-y-4">
      {/* Tutorial em Destaque */}
      {tutorialContent && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  {getIcon(tutorialContent.icon || 'BookOpen')}
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">
                    {tutorialContent.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs mt-1">
                    Tutorial Interativo
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-3">
              {tutorialContent.description}
            </p>
            <Button
              onClick={() => onStartTutorial()}
              size="sm"
              className="w-full gap-2"
            >
              <Video className="h-3 w-3" />
              Iniciar Tutorial
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Outros Conteúdos de Ajuda */}
      <div className="space-y-3">
        {contextHelp?.filter(content => content.category !== 'tutorial').map((content) => (
          <Card 
            key={content.id} 
            className="hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onContentSelect(content)}
            tabIndex={0}
            aria-label={`Abrir ajuda: ${content.title}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    {getIcon(content.icon || 'BookOpen')}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{content.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {content.description}
                    </p>
                    <div className="flex gap-1 mt-1">
                      {content.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sugestões Rápidas */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h4 className="text-sm font-medium">Dicas Rápidas</h4>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary"></div>
              <span>Use Ctrl+H para abrir a ajuda rapidamente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary"></div>
              <span>Clique no ícone ? ao lado dos campos para ajuda contextual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary"></div>
              <span>Use a busca para encontrar respostas específicas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};