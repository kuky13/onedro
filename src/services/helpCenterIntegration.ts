/**
 * Serviço de integração entre a IA Drippy e a Documentação
 * Permite que a Drippy sugira artigos e tutoriais relevantes baseado nas perguntas do usuário
 */

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  url: string;
  helpfulCount?: number;
}

export interface HelpSuggestion {
  article: HelpArticle;
  relevance: number;
  reason: string;
}

// Base de conhecimento da Documentação
const helpArticles: HelpArticle[] = [
  {
    id: 'budgets',
    title: 'Criação e Gestão de Orçamentos',
    description: 'Aprenda a criar, visualizar e gerenciar orçamentos de forma eficiente',
    category: 'budgets',
    tags: ['orçamento', 'criar', 'editar', 'compartilhar', 'pdf', 'whatsapp'],
    url: '/docs#budgets'
  },
  {
    id: 'service-orders',
    title: 'Ordens de Serviço',
    description: 'Gerencie ordens de serviço, acompanhe status e organize o workflow',
    category: 'service-orders',
    tags: ['ordem', 'serviço', 'status', 'prioridade', 'workflow'],
    url: '/docs#service-orders'
  },
  {
    id: 'drippy-ia',
    title: 'Drippy IA - Assistente Inteligente',
    description: 'Conheça a assistente virtual integrada ao sistema com busca inteligente',
    category: 'drippy-ia',
    tags: ['drippy', 'ia', 'assistente', 'busca', 'inteligente'],
    url: '/docs#drippy-ia'
  },
  {
    id: 'trash',
    title: 'Sistema de Lixeira',
    description: 'Recupere itens excluídos e gerencie a lixeira do sistema',
    category: 'trash',
    tags: ['lixeira', 'recuperar', 'excluir', 'restaurar'],
    url: '/docs#trash'
  },
  {
    id: 'settings',
    title: 'Configurações do Sistema',
    description: 'Personalize sua experiência e configure preferências da aplicação',
    category: 'settings',
    tags: ['configurações', 'empresa', 'logo', 'personalização'],
    url: '/docs#settings'
  },
  {
    id: 'plans',
    title: 'Planos e Assinaturas',
    description: 'Entenda como funcionam os planos, pagamentos e ativação de licença',
    category: 'plans',
    tags: ['plano', 'planos', 'assinatura', 'pagamento', 'licença', 'licenca', 'renovação', 'renovacao', 'mensal', 'anual'],
    url: '/docs#plans'
  },
  {
    id: 'store',
    title: 'Minha Loja Online',
    description: 'Configure sua loja virtual para receber orçamentos e vender serviços/produtos',
    category: 'store',
    tags: ['loja', 'store', 'virtual', 'orcamentos online', 'produtos', 'serviços', 'servicos', 'link público', 'link publico'],
    url: '/docs#store'
  },
  {
    id: 'downloads',
    title: 'Download de Vídeos',
    description: 'Use o downloader integrado para baixar vídeos do YouTube e outras plataformas',
    category: 'downloads',
    tags: ['download', 'vídeo', 'video', 'youtube', 'baixar', 'mp4', 'mp3'],
    url: '/docs#downloads'
  },
  {
    id: 'suporte',
    title: 'Suporte e Atendimento',
    description: 'Saiba como entrar em contato com a equipe de suporte por WhatsApp, Discord ou Email',
    category: 'suporte',
    tags: ['suporte', 'ajuda', 'contato', 'whatsapp', 'discord', 'email', 'chamado'],
    url: '/docs#suporte'
  },
  {
    id: 'conta-seguranca',
    title: 'Conta e Segurança',
    description: 'Gerencie sua conta, altere senha, exporte dados e entenda a LGPD',
    category: 'conta-seguranca',
    tags: ['conta', 'senha', 'segurança', 'seguranca', 'lgpd', 'privacidade', 'email', 'verificar', 'exportar', 'dados'],
    url: '/docs#conta-seguranca'
  }
];

const faqItems = [
  {
    question: "Como posso recuperar um orçamento excluído?",
    answer: "Os orçamentos excluídos são movidos para a lixeira. Acesse a seção de lixeira, localize o item e clique em 'Restaurar'.",
    category: "budgets",
    tags: ['orçamento', 'excluir', 'recuperar', 'lixeira']
  },
  {
    question: "Como uso a Drippy IA para buscar orçamentos?",
    answer: "Acesse a Drippy pelo Dashboard ou em /chat e pergunte naturalmente: 'Busque o orçamento #38', 'Mostre orçamentos de iPhone', etc.",
    category: "drippy-ia",
    tags: ['drippy', 'ia', 'busca', 'orçamento']
  },
  {
    question: "Como alterar o status de uma ordem de serviço?",
    answer: "Na lista de ordens de serviço, clique no cartão da ordem desejada e use os botões de ação para alterar o status.",
    category: "service-orders",
    tags: ['ordem', 'serviço', 'status', 'alterar']
  },
  {
    question: "Como limpar o cache do sistema?",
    answer: "Acesse Configurações > Ações da Conta > Limpeza de Cache. Isso removerá dados temporários, mas manterá seus dados do backend seguros.",
    category: "settings",
    tags: ['cache', 'limpar', 'configurações']
  },
  {
    question: "Como contratar ou renovar meu plano?",
    answer: "Acesse /plans e escolha o plano desejado. Após o pagamento, confirme o status em /licenca.",
    category: "plans",
    tags: ['plano', 'planos', 'renovar', 'assinatura', 'pagamento']
  },
  {
    question: "Como ativar minha loja online?",
    answer: "Acesse /store para criar ou gerenciar sua loja. Se ainda não tiver uma, você será direcionado para /store/nova.",
    category: "store",
    tags: ['loja', 'store', 'ativar loja', 'criar loja', 'minha loja']
  },
  {
    question: "Como baixar vídeos pelo sistema?",
    answer: "Acesse /downloads, cole o link do vídeo (YouTube, Instagram, TikTok, etc.), escolha a qualidade desejada e clique em Baixar.",
    category: "downloads",
    tags: ['download', 'vídeo', 'baixar', 'youtube']
  },
  {
    question: "Como abrir um chamado de suporte?",
    answer: "Acesse /suporte e escolha o canal mais adequado: WhatsApp (resposta imediata), Discord (comunidade) ou E-mail (suporte@onedrip.email).",
    category: "suporte",
    tags: ['suporte', 'chamado', 'contato', 'ajuda']
  },
  {
    question: "Como alterar minha senha?",
    answer: "Acesse Configurações > Conta > Alterar Senha. Você também pode usar a opção 'Esqueci minha senha' na tela de login para receber um link de redefinição por e-mail.",
    category: "conta-seguranca",
    tags: ['senha', 'alterar', 'redefinir', 'conta']
  },
  {
    question: "Meus dados estão protegidos pela LGPD?",
    answer: "Sim! O OneDrip segue a Lei Geral de Proteção de Dados. Você pode solicitar a exportação ou exclusão dos seus dados a qualquer momento em Configurações > Conta.",
    category: "conta-seguranca",
    tags: ['lgpd', 'dados', 'privacidade', 'proteção']
  }
];

/**
 * Busca artigos relevantes baseado em uma query
 */
export function searchHelpArticles(query: string, limit: number = 3): HelpSuggestion[] {
  if (!query || query.length < 2) return [];

  const queryLower = query.toLowerCase();
  const suggestions: HelpSuggestion[] = [];

  for (const article of helpArticles) {
    let relevance = 0;
    const reasons: string[] = [];

    if (article.title.toLowerCase().includes(queryLower)) {
      relevance += 10;
      reasons.push('título relevante');
    }

    if (article.description.toLowerCase().includes(queryLower)) {
      relevance += 5;
      reasons.push('descrição relevante');
    }

    const matchingTags = article.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower) || 
      queryLower.includes(tag.toLowerCase())
    );
    if (matchingTags.length > 0) {
      relevance += matchingTags.length * 3;
      reasons.push(`tags: ${matchingTags.join(', ')}`);
    }

    if (article.category.toLowerCase().includes(queryLower)) {
      relevance += 2;
      reasons.push('categoria relevante');
    }

    if (relevance > 0) {
      suggestions.push({ article, relevance, reason: reasons.join(', ') });
    }
  }

  for (const faq of faqItems) {
    let relevance = 0;
    const reasons: string[] = [];

    if (faq.question.toLowerCase().includes(queryLower)) {
      relevance += 8;
      reasons.push('pergunta similar');
    }

    if (faq.answer.toLowerCase().includes(queryLower)) {
      relevance += 4;
      reasons.push('resposta relevante');
    }

    const matchingTags = faq.tags.filter(tag => 
      tag.toLowerCase().includes(queryLower) || 
      queryLower.includes(tag.toLowerCase())
    );
    if (matchingTags.length > 0) {
      relevance += matchingTags.length * 2;
      reasons.push(`tags: ${matchingTags.join(', ')}`);
    }

    if (relevance > 0) {
      suggestions.push({
        article: {
          id: `faq-${faq.question}`,
          title: faq.question,
          description: faq.answer,
          category: faq.category,
          tags: faq.tags,
          url: '/docs#faq'
        },
        relevance,
        reason: reasons.join(', ')
      });
    }
  }

  return suggestions
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Gera uma mensagem formatada com sugestões de ajuda
 */
export function formatHelpSuggestions(suggestions: HelpSuggestion[]): string {
  if (suggestions.length === 0) return '';

  let message = '📚 **Sugestões da Documentação:**\n\n';
  
  suggestions.forEach((suggestion, index) => {
    message += `${index + 1}. **${suggestion.article.title}**\n`;
    message += `   ${suggestion.article.description}\n`;
    message += `   🔗 [Ver mais](${suggestion.article.url})\n\n`;
  });

  message += '💡 *Esses artigos podem te ajudar com sua dúvida!*';
  return message;
}

/**
 * Detecta se a pergunta do usuário é sobre ajuda/suporte
 */
export function isHelpRelatedQuery(query: string): boolean {
  const helpKeywords = [
    'como', 'ajuda', 'ajudar', 'duvida', 'dúvida', 'tutorial', 'guia',
    'explicar', 'explicação', 'funciona', 'usar', 'utilizar', 'fazer',
    'criar', 'editar', 'excluir', 'recuperar', 'configurar', 'configuração',
    'problema', 'erro', 'não funciona', 'não consigo', 'preciso de ajuda',
    'plano', 'planos', 'assinatura', 'pagamento', 'licenca', 'licença',
    'loja', 'store', 'download', 'vídeo', 'suporte', 'senha', 'conta', 'lgpd'
  ];

  const queryLower = query.toLowerCase();
  return helpKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * Extrai palavras-chave de uma query para busca melhorada
 */
export function extractKeywords(query: string): string[] {
  const stopWords = ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'para', 'com', 'por', 'que', 'qual', 'quais',
    'como', 'quando', 'onde', 'porque', 'por que', 'é', 'são', 'foi', 'ser', 'estar',
    'ter', 'tem', 'ter', 'fazer', 'fez', 'feito', 'pode', 'poder', 'deve', 'dever'];

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}
