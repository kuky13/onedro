// ============================================
// DADOS DA PÁGINA DE PLANOS - EDITÁVEL
// ============================================
// Conteúdo otimizado para conversão de técnicos de reparo de celular
// Foco: linguagem direta, benefícios práticos, valor real

export const PLANS_CONTENT = {
  // SEÇÃO PRINCIPAL (HERO)
  logo: "/lovable-uploads/logoo.png",
  titulo_principal: "Organize sua assistência. Ganhe tempo. Venda mais.",
  subtitulo_principal: "Sistema feito por quem entende assistência técnica. Sem complicação, sem promessa vazia.",

  // DADOS DOS PLANOS (MENSAL E ANUAL)
  planos: {
    mensal: {
      nome: "Plano Mensal",
      descricao: "Ideal para quem está começando ou quer testar",
      perfil_indicado: "Técnico iniciante ou assistência pequena",
      preco: 10.0,
      preco_original: 68.9,
      moeda: "R$",
      periodo: "/mês",
      ciclo: "monthly" as const,
      badge_popular: "",
      mostrar_badge: false,
      economia_texto: "",

      // Lista de benefícios do plano
      beneficios: [
        "Orçamentos ilimitados",
        "Ordens de serviço completas",
        "Loja online integrada",
        "Cálculos automáticos de preço",
        "Suporte via WhatsApp",
        "Backup automático na nuvem",
      ],

      // O que muda na prática
      diferencial_pratico: "Comece a organizar seus orçamentos hoje mesmo",
    },
    anual: {
      nome: "Plano Anual",
      descricao: "Para assistências que querem economizar",
      perfil_indicado: "Assistência em crescimento ou estruturada",
      preco: 10.0,
      preco_original: 638.55,
      moeda: "R$",
      periodo: "/ano",
      ciclo: "yearly" as const,
      badge_popular: "Melhor Custo-Benefício",
      mostrar_badge: true,
      economia_texto: "Economize 3 meses",

      // Lista de benefícios do plano
      beneficios: [
        "Orçamentos ilimitados",
        "Ordens de serviço completas",
        "Loja online integrada",
        "Cálculos automáticos de preço",
        "Suporte via WhatsApp",
        "Backup automático na nuvem",
      ],

      // O que muda na prática
      diferencial_pratico: "Pague menos e tenha estabilidade o ano todo",
    },
  },

  // CONFIGURAÇÕES GERAIS
  configuracoes_gerais: {
    botao_texto: "Começar Agora",
    mostrar_suporte: true,
    texto_suporte: "Suporte brasileiro via WhatsApp",
    informacoes_extras: "Cancele quando quiser • Pagamento via Mercado pago",
  },

  // SEÇÃO DE VANTAGENS/BENEFÍCIOS - Focado em problemas reais de assistências
  vantagens: {
    mostrar_secao: true,
    titulo: "Feito para resolver seus problemas do dia a dia",
    subtitulo: "Funcionalidades pensadas para quem trabalha de verdade",

    lista: [
      {
        icone: "Zap" as const,
        titulo: "Orçamento em 2 minutos",
        descricao: "Pare de perder tempo escrevendo orçamento no papel. Crie e envie pelo WhatsApp direto do celular.",
      },
      {
        icone: "Search" as const,
        titulo: "Acha qualquer orçamento",
        descricao: "Cliente voltou depois de meses? Encontre o orçamento em segundos. Por nome, modelo ou serviço.",
      },
      {
        icone: "FileText" as const,
        titulo: "PDF profissional com sua marca",
        descricao: "Impressione o cliente com orçamento bonito e organizado. Logo da sua loja, dados completos.",
      },
      {
        icone: "MessageCircle" as const,
        titulo: "Integração WhatsApp",
        descricao: "Um clique e o orçamento vai pro WhatsApp do cliente. Sem copiar, colar ou digitar de novo.",
      },
      {
        icone: "Smartphone" as const,
        titulo: "Funciona no seu celular",
        descricao: "Use no balcão, na bancada, onde precisar. Interface pensada para tela de celular.",
      },
      {
        icone: "Shield" as const,
        titulo: "Nunca mais perca dados",
        descricao: "Backup automático na nuvem. Trocou de celular? Seus orçamentos estão lá.",
      },
    ],
  },

  // SEÇÃO DE DEPOIMENTOS - Focado em resultados práticos
  depoimentos: {
    mostrar_secao: true,
    titulo: "Técnicos reais, resultados reais",
    subtitulo: "Veja o que mudou na rotina de quem já usa",

    lista: [
      {
        nome: "Paulo oliveira",
        cargo: "Proprietário - Oliveira Imports",
        texto:
          "Antes eu perdia clientes por causa do orçamento e Agora faço em 2 min e envio para o cliente um PDF e uma mensagem no Whatsapp.",
        nota: 5,
      },
      {
        nome: "Maria",
        cargo: "Atendente de assistência",
        texto: "Consigo achar qualquer Orçamento em segundos. Organizou completamente minha rotina.",
        nota: 5,
      },
      {
        nome: "André",
        cargo: "Técnico - Oliveira Imports",
        texto:
          "Minha rotina na assistência ficou muito mais facil pra salvar ordens de serviço e os reparos que eu fiz.",
        nota: 5,
      },
    ],
  },

  // SEÇÃO DE PERGUNTAS FREQUENTES - Dúvidas reais de técnicos céticos
  perguntas_frequentes: {
    mostrar_secao: true,
    titulo: "Dúvidas comuns",
    subtitulo: "Perguntas que outros técnicos já fizeram",

    lista: [
      {
        pergunta: "Funciona offline?",
        resposta:
          "Precisa de internet, mas qualquer 4G resolve. Se a internet cair, você não perde o que estava fazendo.",
      },
      {
        pergunta: "É difícil de aprender?",
        resposta: "Se você sabe usar WhatsApp, sabe usar o OneDrip. Interface simples, sem enrolação.",
      },
      {
        pergunta: "E se eu não gostar?",
        resposta: "Você tem 7 dias de garantia. Não gostou? Devolvo seu dinheiro, sem pergunta.",
      },
      {
        pergunta: "Posso cancelar quando quiser?",
        resposta: "Sim, sem burocracia. Manda um WhatsApp e cancela.",
      },
      {
        pergunta: "Precisa instalar alguma coisa?",
        resposta: "Não. Abre no navegador do celular ou computador. Funciona em qualquer aparelho.",
      },
      {
        pergunta: "E o suporte?",
        resposta: "Suporte brasileiro via WhatsApp. Gente de verdade que responde rápido.",
      },
    ],
  },

  // SEÇÃO FINAL (CALL TO ACTION)
  secao_final: {
    titulo: "Comece a organizar sua assistência hoje",
    subtitulo: "Em 5 minutos você já está criando orçamentos profissionais",
    botao_texto: "Quero Testar Agora",
  },

  // CONFIGURAÇÕES TÉCNICAS
  configuracoes: {
    whatsapp_numero: "64996028022",
  },
};
