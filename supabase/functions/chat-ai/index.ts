import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAIRequest } from "../_shared/ai-provider.ts";
import { CHAT_AI_SYSTEM_PROMPT } from "./prompts/system-prompt.ts";
import { AIContext } from "./types.ts";
import {
  validateDataContext,
  markDataNotFound,
} from "./validators/context-validator.ts";
import {
  detectHallucinatedData,
  sanitizeResponse,
} from "./validators/response-validator.ts";
import {
  getUserLicense,
  formatLicenseInfo,
} from "./modules/license.ts";
import {
  searchBudgets,
  searchBudgetsByModelAndService,
  getAllBudgets,
  getBudgetsByStatus,
  getBudgetStats,
  formatBudgetsForAI,
} from "./modules/budgets.ts";
import {
  searchServiceOrders,
  getServiceOrdersByStatus,
  getServiceOrderStats,
  formatServiceOrdersForAI,
} from "./modules/service-orders.ts";
import {
  getAllTrashedItems,
  formatTrashedItemsForAI,
} from "./modules/trash.ts";
import {
  searchClients,
  getAllClients,
  formatClientsForAI,
} from "./modules/clients.ts";
// createBudget removed — IA is now read-only (triage mode)
import { DATA_CATALOG, buildSelectColumns } from "./data-catalog.ts";

// ============= MOOD SYSTEM =============

interface ChatMood {
  mood_level: number;
  negative_interactions: number;
  positive_interactions: number;
}

// Lista de palavras ofensivas (expandir conforme necessário)
const OFFENSIVE_WORDS = [
  'idiota', 'burro', 'burra', 'estupido', 'estupida', 'imbecil', 'otario', 'otaria', 'merda',
  'porra', 'caralho', 'fdp', 'filho da puta', 'filha da puta', 'desgraça',
  'lixo', 'inutil', 'incompetente', 'vai tomar no cu', 'vtmnc',
  'se fode', 'foda-se', 'cala boca', 'cale a boca', 'cala a boca',
  'bosta', 'arrombado', 'arrombada', 'babaca', 'imbecil', 'retardado', 'retardada'
];

async function getMoodLevel(
  supabase: any,
  userId: string,
  conversationId: string
): Promise<ChatMood> {
  const { data, error } = await supabase
    .from('chat_mood')
    .select('mood_level, negative_interactions, positive_interactions')
    .eq('user_id', userId)
    .eq('conversation_id', conversationId)
    .single();

  if (error || !data) {
    // Criar mood inicial
    const { data: newMood } = await supabase
      .from('chat_mood')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        mood_level: 100,
        negative_interactions: 0,
        positive_interactions: 0
      })
      .select('mood_level, negative_interactions, positive_interactions')
      .single();

    return newMood || { mood_level: 100, negative_interactions: 0, positive_interactions: 0 };
  }

  return data;
}

function detectOffensiveLanguage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return OFFENSIVE_WORDS.some(word => lowerMessage.includes(word));
}

async function updateMoodLevel(
  supabase: any,
  userId: string,
  conversationId: string,
  isNegative: boolean
): Promise<number> {
  const currentMood = await getMoodLevel(supabase, userId, conversationId);

  let newMoodLevel = currentMood.mood_level;
  let negativeCount = currentMood.negative_interactions;
  let positiveCount = currentMood.positive_interactions;

  if (isNegative) {
    // Cada interação negativa reduz 10 pontos (mínimo 0)
    newMoodLevel = Math.max(0, newMoodLevel - 10);
    negativeCount += 1;
  } else {
    // Interações positivas recuperam 5 pontos (máximo 100)
    newMoodLevel = Math.min(100, newMoodLevel + 5);
    positiveCount += 1;
  }

  await supabase
    .from('chat_mood')
    .update({
      mood_level: newMoodLevel,
      negative_interactions: negativeCount,
      positive_interactions: positiveCount,
      last_negative_at: isNegative ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('conversation_id', conversationId);

  console.log(`[MOOD] User ${userId} - New mood level: ${newMoodLevel} (${isNegative ? 'negative' : 'positive'} interaction)`);

  return newMoodLevel;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const token = authHeader.replace("Bearer ", "");
    const isInternalService = Boolean(serviceRoleKey) && token === serviceRoleKey;

    // Parse body early so we can support internal calls (WhatsApp automation)
    const body = await req.json();
    const {
      message,
      conversationId,
      messageHistory,
      owner_id,
      source,
      ia_config: iaConfigFromCaller,
    } = body ?? {};

    // Client for DB access
    const supabaseClient = createClient(
      supabaseUrl,
      isInternalService ? serviceRoleKey : anonKey,
      {
        global: {
          headers: {
            ...(isInternalService ? {} : { Authorization: authHeader }),
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Resolve acting user
    let actingUserId: string;
    if (isInternalService) {
      if (typeof owner_id !== "string" || !owner_id) {
        throw new Error("Missing owner_id for internal call");
      }
      actingUserId = owner_id;
    } else {
      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Unauthorized");
      }
      actingUserId = user.id;
    }

    // Usar 'drippy' como fallback se conversationId não for fornecido
    const safeConversationId = conversationId || 'drippy';
    console.log(`[CHAT-AI] ===== NOVA MENSAGEM =====`);
    console.log(`[CHAT-AI] User ID: ${actingUserId} (internal=${isInternalService ? 'yes' : 'no'})`);
    console.log(`[CHAT-AI] Conversation ID: ${safeConversationId}`);
    console.log(`[CHAT-AI] Mensagem: "${message}"`);
    console.log(`[CHAT-AI] Histórico recebido: ${messageHistory?.length || 0} mensagens`);

    // Detectar linguagem ofensiva
    const isOffensive = detectOffensiveLanguage(message);

    // Buscar mood level atual
    const currentMood = await getMoodLevel(supabaseClient, actingUserId, safeConversationId);
    console.log(`[DEBUG] Current mood level: ${currentMood.mood_level}`);

    // Atualizar mood se necessário
    let moodLevel = currentMood.mood_level;
    if (isOffensive) {
      moodLevel = await updateMoodLevel(supabaseClient, actingUserId, safeConversationId, true);
      console.log(`[MOOD] Offensive language detected. New mood level: ${moodLevel}`);
    } else {
      // Interações normais (não ofensivas) aumentam levemente o mood
      moodLevel = await updateMoodLevel(supabaseClient, actingUserId, safeConversationId, false);
    }

    // Analisar intenção e buscar contexto
    const context = await analyzeAndFetchContext(
      supabaseClient,
      actingUserId,
      message
    );

    console.log(`[CHAT-AI] Context type: ${context.contextType}`);
    console.log(`[CHAT-AI] Data found: ${context.dataFound}`);
    console.log(`[CHAT-AI] Budgets count: ${context.data.budgets?.length || 0}`);

    // Validar contexto
    const validation = validateDataContext(context);
    if (!validation.isValid) {
      console.error("Context validation failed:", validation.issues);
    }

    // Normalizar source
    const normalizedSource: "app" | "whatsapp" | "internal" =
      source === "whatsapp" || source === "internal" || source === "app"
        ? source
        : (isInternalService ? "internal" : "app");

    // Preparar contexto para a IA (incluindo mood level)
    const contextMessage = await buildContextMessage(supabaseClient, actingUserId, context, moodLevel, normalizedSource);

    // Buscar configuração dinâmica da IA
    const aiConfig = await getAIConfiguration(supabaseClient);

    if (aiConfig.error && !aiConfig.apiKey) {
      console.error('[CHAT-AI] Configuração de IA inválida:', aiConfig.error);
      return new Response(
        JSON.stringify({
          error: aiConfig.error,
          action: "configure_api_key"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = await callAI(
      aiConfig,
      message,
      contextMessage,
      safeConversationId,
      messageHistory,
      supabaseClient,
      actingUserId,
      { source: normalizedSource, iaConfig: iaConfigFromCaller }
    );

    console.log(`[CHAT-AI] AI Response length: ${aiResponse?.length || 0} chars`);
    console.log(`[CHAT-AI] AI Response preview: ${aiResponse?.substring(0, 150) || 'empty'}...`);

    // Validar resposta
    if (detectHallucinatedData(aiResponse, context)) {
      console.warn("Hallucinated data detected, sanitizing response");
      const sanitized = sanitizeResponse(aiResponse, context);
      return new Response(JSON.stringify({ reply: sanitized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mensagens são salvas pelo frontend para evitar duplicação
    console.log("[CHAT-AI] Resposta enviada, salvamento gerenciado pelo frontend");

    return new Response(JSON.stringify({ reply: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in chat-ai function:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function analyzeAndFetchContext(
  supabase: any,
  userId: string,
  message: string
): Promise<AIContext> {
  const lowerMessage = message.toLowerCase();

  const context: AIContext = {
    userQuestion: message,
    contextType: "general",
    dataFound: false,
    data: {},
    userInfo: {
      userId: userId,
      userName: "",
      userRole: "",
    },
  };

  console.log(`[DEBUG] Analyzing message: "${message}"`);

  // Buscar licença
  if (
    lowerMessage.includes("licença") ||
    lowerMessage.includes("licenca") ||
    lowerMessage.includes("validade") ||
    lowerMessage.includes("assinatura")
  ) {
    context.contextType = "license";
    const license = await getUserLicense(supabase, userId);
    context.data.license = license;
    context.dataFound = !!license;
    console.log(`[DEBUG] License search - Found: ${context.dataFound}`);
  }
  // Buscar orçamentos - detecção ampliada
  else if (
    lowerMessage.includes("orçamento") ||
    lowerMessage.includes("orcamento") ||
    lowerMessage.includes("cotação") ||
    lowerMessage.includes("cotacao") ||
    lowerMessage.includes("or #") ||
    lowerMessage.includes("or:") ||
    lowerMessage.includes("valor") ||
    lowerMessage.includes("preço") ||
    lowerMessage.includes("preco") ||
    lowerMessage.includes("quanto custa") ||
    lowerMessage.includes("quanto fica") ||
    lowerMessage.includes("quanto sai") ||
    lowerMessage.includes("qto") ||
    lowerMessage.includes("qual o valor") ||
    lowerMessage.includes("fica qnto") ||
    lowerMessage.includes("para arrumar") ||
    lowerMessage.includes("pra arrumar") ||
    lowerMessage.includes("pra consertar") ||
    lowerMessage.includes("tabela de preço") ||
    lowerMessage.includes("quanto é") ||
    lowerMessage.includes("quanto e") ||
    lowerMessage.includes("qual é o preço") ||
    lowerMessage.includes("qual e o preco") ||
    lowerMessage.includes("quanto cobro") ||
    lowerMessage.includes("quanto cobrar") ||
    (lowerMessage.includes("troca") && (lowerMessage.includes("tela") || lowerMessage.includes("bateria") || lowerMessage.includes("display") || lowerMessage.includes("vidro") || lowerMessage.includes("conector") || lowerMessage.includes("placa"))) ||
    // Detect model codes (S23, A54, etc.) combined with repair words
    (/\b[a-z]?\d{2,3}\s*(fe|plus|ultra|pro|max|lite)?\b/i.test(lowerMessage) && (lowerMessage.includes("tela") || lowerMessage.includes("bateria") || lowerMessage.includes("troca") || lowerMessage.includes("reparo") || lowerMessage.includes("conserto") || lowerMessage.includes("display") || lowerMessage.includes("vidro"))) ||
    // Detect brand + model patterns (samsung s23, iphone 15, etc.) even without repair word
    (/\b(samsung|iphone|motorola|xiaomi|redmi|poco|galaxy|moto)\s+[a-z0-9\s]{2,}/i.test(lowerMessage) && (lowerMessage.includes("quanto") || lowerMessage.includes("valor") || lowerMessage.includes("preço") || lowerMessage.includes("preco") || lowerMessage.includes("troca") || lowerMessage.includes("tela") || lowerMessage.includes("reparo")))
  ) {
    context.contextType = "budgets";

    console.log(`[DEBUG] 🔍 Analisando query de orçamento: "${message}"`);

    // 1. EXTRAIR ENTIDADES
    const { extractEntitiesFromQuery } = await import("./modules/entity-extractor.ts");
    const entities = extractEntitiesFromQuery(message);
    console.log(`[DEBUG] Entidades extraídas:`, JSON.stringify(entities, null, 2));

    // 2. DETECTAR PERGUNTA DE CONTAGEM
    if (
      (lowerMessage.includes("quantos") || lowerMessage.includes("quantas")) &&
      (lowerMessage.includes("orçamento") || lowerMessage.includes("orcamento"))
    ) {
      console.log(`[DEBUG] Pergunta de CONTAGEM de orçamentos detectada`);
      const allBudgets = await getAllBudgets(supabase, userId);
      context.data.budgets = allBudgets;
      context.dataFound = allBudgets.length > 0;
      context.contextType = "budgets_count";
    }
    // Buscar por status "pendente"
    else if (lowerMessage.includes("pendente")) {
      const budgets = await getBudgetsByStatus(supabase, userId, "pending");
      context.data.budgets = budgets;
      context.dataFound = budgets.length > 0;
    }
    // Buscar por status "aprovado"
    else if (lowerMessage.includes("aprovado")) {
      const budgets = await getBudgetsByStatus(supabase, userId, "approved");
      context.data.budgets = budgets;
      context.dataFound = budgets.length > 0;
    }
    // Estatísticas
    else if (lowerMessage.includes("estatística") || lowerMessage.includes("total")) {
      const stats = await getBudgetStats(supabase, userId);
      context.data.budgets = [stats];
      context.dataFound = !!stats;
    }
    // Busca inteligente geral
    else {
      const { searchBudgetsIntelligent } = await import("./modules/budgets.ts");
      const budgets = await searchBudgetsIntelligent(supabase, userId, message, entities);
      context.data.budgets = budgets;
      context.dataFound = budgets.length > 0;

      if (context.dataFound) {
        console.log(`[DEBUG] ✓ Encontrados ${budgets.length} orçamentos inteligentes`);
      } else {
        console.log(`[DEBUG] ✗ Nenhum orçamento encontrado para a busca`);
      }
    }
  }
  // Buscar ordens de serviço (OS) - SISTEMA INTELIGENTE
  else if (
    lowerMessage.includes("ordem") ||
    lowerMessage.includes("os #") ||
    /\bos\b/i.test(lowerMessage) ||
    lowerMessage.includes("serviço") ||
    lowerMessage.includes("servico") ||
    (lowerMessage.includes("reparo") && !lowerMessage.includes("orçamento")) ||
    (lowerMessage.includes("conserto") && !lowerMessage.includes("orçamento"))
  ) {
    context.contextType = "service_orders";

    console.log(`[DEBUG] 🔍 Analisando query de OS: "${message}"`);

    // 1. EXTRAIR ENTIDADES
    const { extractEntitiesFromQuery } = await import("./modules/entity-extractor.ts");
    const entities = extractEntitiesFromQuery(message);
    console.log(`[DEBUG] Entidades extraídas:`, JSON.stringify(entities, null, 2));

    // 2. DETECTAR PERGUNTA DE CONTAGEM (prioridade alta)
    if (
      (lowerMessage.includes("quantas") || lowerMessage.includes("quantos")) &&
      (lowerMessage.includes("ordem") || /\bos\b/i.test(lowerMessage))
    ) {
      console.log(`[DEBUG] Pergunta de CONTAGEM de OS detectada`);
      const { data: orders } = await supabase
        .from("service_orders")
        .select("*")
        .eq("owner_id", userId)
        .is("deleted_at", null);

      context.data.serviceOrders = orders || [];
      context.dataFound = (orders?.length || 0) > 0;
      context.contextType = "service_orders_count";
    }
    // 3. DETECTAR LISTA GERAL (quais OS tenho)
    else if (
      lowerMessage.includes("quais") ||
      lowerMessage.includes("liste") ||
      lowerMessage.includes("mostre") ||
      (lowerMessage.includes("minhas") && (lowerMessage.includes("ordem") || /\bos\b/i.test(lowerMessage)))
    ) {
      console.log(`[DEBUG] Lista geral de OS solicitada`);
      const { data: orders } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients!fk_service_orders_client_id (
            name,
            phone
          )
        `)
        .eq("owner_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);

      context.data.serviceOrders = orders || [];
      context.dataFound = (orders?.length || 0) > 0;
    }
    // 4. ESTATÍSTICAS DE OS
    else if (lowerMessage.includes("estatística") || lowerMessage.includes("total")) {
      const stats = await getServiceOrderStats(supabase, userId);
      context.data.serviceOrders = [stats];
      context.dataFound = !!stats;
    }
    // 5. BUSCA INTELIGENTE
    else {
      const { searchServiceOrdersIntelligent } = await import("./modules/service-orders.ts");
      const orders = await searchServiceOrdersIntelligent(
        supabase,
        userId,
        message,
        entities
      );

      context.data.serviceOrders = orders;
      context.dataFound = orders.length > 0;

      if (context.dataFound) {
        console.log(`[DEBUG] ✓ Encontradas ${orders.length} OS`);
        console.log(`[DEBUG] Top 3: ${orders.slice(0, 3).map((o: any) => `#${o.sequential_number} - ${o.clients?.name || 'S/N'}`).join(', ')}`);
      } else {
        console.log(`[DEBUG] ✗ Nenhuma OS encontrada`);

        // Sugerir buscas alternativas
        if (entities.deviceModels.length > 0) {
          console.log(`[DEBUG] 💡 Sugestão: Buscar modelos similares a "${entities.deviceModels[0]}"`);
        }
        if (entities.clientNames.length > 0) {
          console.log(`[DEBUG] 💡 Sugestão: Verificar nome do cliente "${entities.clientNames[0]}"`);
        }
      }
    }
  } else if (
    lowerMessage.includes("lixeira") ||
    lowerMessage.includes("deletado") ||
    lowerMessage.includes("deletados") ||
    lowerMessage.includes("excluído") ||
    lowerMessage.includes("excluidos") ||
    lowerMessage.includes("apagado")
  ) {
    context.contextType = "trash";
    const trashedItems = await getAllTrashedItems(supabase, userId);
    context.data.trashedItems = [trashedItems];
    context.dataFound =
      trashedItems.budgets.length > 0 || trashedItems.orders.length > 0;
  }
  // Buscar clientes
  else if (
    lowerMessage.includes("cliente") ||
    lowerMessage.includes("contato")
  ) {
    context.contextType = "clients";

    const clientMatch = message.match(
      /cliente[s]?\s+(?:chamad[oa]s?|de nome)?\s*["']?([^"']+)["']?/i
    );
    if (clientMatch) {
      const clientName = clientMatch[1].trim();
      console.log(`[DEBUG] Buscando cliente: "${clientName}"`);
      const clients = await searchClients(supabase, userId, clientName);
      context.data.clients = clients;
      context.dataFound = clients.length > 0;
    } else {
      const allClients = await getAllClients(supabase, userId);
      context.data.clients = allClients;
      context.dataFound = allClients.length > 0;
    }
  }
  // Loja online do usuário (dados da tabela stores)
  else if (
    lowerMessage.includes("loja") ||
    lowerMessage.includes("store") ||
    lowerMessage.includes("site")
  ) {
    context.contextType = "store";
    console.log("[DEBUG] Buscando dados da loja (stores) do usuário");
    const { data: store, error } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[DEBUG] Erro ao buscar store:", error.message);
      context.dataFound = false;
    } else if (store) {
      context.data.store = store;
      context.dataFound = true;
    }
  }
  // Perfil da empresa (company_info)
  else if (
    lowerMessage.includes("empresa") ||
    lowerMessage.includes("negócio") ||
    lowerMessage.includes("negocio") ||
    lowerMessage.includes("whatsapp") ||
    lowerMessage.includes("telefone") ||
    lowerMessage.includes("endereço") ||
    lowerMessage.includes("endereco") ||
    lowerMessage.includes("horário") ||
    lowerMessage.includes("horario")
  ) {
    context.contextType = "company_profile";
    console.log("[DEBUG] Buscando dados de company_info do usuário");
    const { data: companyInfo, error } = await supabase
      .from("company_info")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[DEBUG] Erro ao buscar company_info:", error.message);
      context.dataFound = false;
    } else if (companyInfo) {
      context.data.companyInfo = companyInfo;
      context.dataFound = true;
    }
  }

  return context;

}

function extractDeviceModel(message: string): string {
  const cleaned = message.toLowerCase().replace(/[^\\w\\s]/g, " ");

  // Padrões comuns de modelos
  const patterns = [
    /iphone\s*\d+(\s*pro)?(\s*max)?(\s*plus)?/i,
    /samsung\s*galaxy\s*[a-z]\d+(\s*\d)?/i,
    /galaxy\s*[a-z]\d+(\s*\d)?/i,
    /redmi\s*(note)?\s*\d+(\s*pro)?/i,
    /xiaomi\s*(mi)?\s*\d+(\s*pro)?/i,
    /moto\s*[a-z]\d+(\s*\w+)?/i,
    /motorola\s*[a-z]\d+(\s*\w+)?/i,
    /poco\s*[a-z]\d+(\s*pro)?/i,
    /realme\s*\d+(\s*pro)?/i,
    /oneplus\s*\d+(\s*pro)?/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) return match[0].trim();
  }

  // Se não encontrou padrão, retorna a parte mais relevante
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    // Pega até 3 palavras que parecem ser modelo
    return words.slice(0, 3).join(' ');
  }

  return "";
}

async function getImportantMemories(
  supabase: any,
  userId: string,
  limit = 5
): Promise<Array<{ id: string; content: string; importance?: number; tags?: string[] }>> {
  try {
    const { data, error } = await supabase
      .from("drippy_long_term_memory")
      .select("id, content, importance, tags")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("importance", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[MEMORY] Erro ao buscar memórias importantes:", error.message);
      return [];
    }

    return (data || []) as Array<{
      id: string;
      content: string;
      importance?: number;
      tags?: string[];
    }>;
  } catch (error) {
    console.error("[MEMORY] Exceção ao buscar memórias importantes:", error);
    return [];
  }
}

async function buildContextMessage(
  supabase: any,
  userId: string,
  context: AIContext,
  moodLevel: number,
  source?: string
): Promise<string> {
  let contextMsg = `🎭 **SEU MOOD_LEVEL ATUAL: ${moodLevel}**\n\nAJUSTE SEU TOM E COMPORTAMENTO DE ACORDO COM AS REGRAS DE HUMOR ADAPTATIVO.\n${moodLevel < 60 ? '⚠️ Você está magoada. Seja mais direta e menos expansiva.' : ''}\n${moodLevel < 40 ? '⚠️⚠️ Você está muito magoada. Respostas curtas e secas.' : ''}\n${moodLevel < 20 ? '🥶 Você está gelada. Respostas minimalistas.' : ''}\n\n`;

  const importantMemories = await getImportantMemories(supabase, userId);

  if (importantMemories.length > 0) {
    contextMsg += `🧠 **MEMÓRIAS IMPORTANTES DO USUÁRIO**\n\n`;
    for (const memory of importantMemories) {
      const importanceLabel =
        typeof memory.importance === "number"
          ? memory.importance >= 4
            ? "ALTÍSSIMA"
            : memory.importance >= 3
              ? "ALTA"
              : "MÉDIA"
          : "DESCONHECIDA";
      contextMsg += `- (Importância: ${importanceLabel}) ${memory.content}\n`;
      if (memory.tags && memory.tags.length > 0) {
        contextMsg += `  Tags: ${memory.tags.join(", ")}\n`;
      }
    }
    contextMsg += `\nUse essas memórias para adaptar seu TOM, EXEMPLOS e RECOMENDAÇÕES ao estilo e preferências da pessoa usuária. Nunca contradiga essas memórias sem explicar por quê.\n\n`;
  } else {
    contextMsg += `🧠 Não há memórias registradas ainda. Use a conversa atual para aprender preferências de tom, exemplos e objetivos do usuário, e salve memórias relevantes usando a ferramenta 'save_memory'.\n\n`;
  }

  contextMsg += `---\n\n**CONTEXTO DA CONVERSA**\n\n`;
  contextMsg += `Tipo: ${context.contextType}\n`;
  contextMsg += `Dados encontrados: ${context.dataFound ? "Sim" : "Não"}\n\n`;

  if (!context.dataFound) {
    const marker = markDataNotFound(context.contextType);
    contextMsg += `⚠️ ${marker.message}\n\n`;

    if (context.contextType === "budgets") {
      contextMsg += `IMPORTANTE: Não encontrei orçamentos com essas características.\n`;
      contextMsg += `VOCÊ DEVE sugerir formas específicas de buscar, com EXEMPLOS PRÁTICOS:\n`;
      contextMsg += `- "me fale qual o valor do orçamento da troca de tela do A12"\n`;
      contextMsg += `- "quantos orçamentos eu tenho?"\n`;
      contextMsg += `- "mostre todos os meus orçamentos"\n`;
      contextMsg += `- "orçamentos do [nome do cliente]"\n\n`;
    } else {
      contextMsg += `IMPORTANTE: Não há dados reais para esta solicitação. Informe o usuário educadamente que não encontrou informações.\n`;
    }

    return contextMsg;
  }

  contextMsg += `**DADOS DISPONÍVEIS:**\n\n`;

  if (context.data.license) {
    contextMsg += formatLicenseInfo(context.data.license) + "\n\n";
  }

  if (context.data.budgets && context.data.budgets.length > 0) {
    const budgetJson = await formatBudgetsForAI(
      supabase,
      userId,
      context.data.budgets,
      context.contextType,
      source
    );
    contextMsg += budgetJson + "\n\n";
    
    // Check if formatted message is present — enforce deterministic output
    if (budgetJson.includes('"mensagem_formatada"')) {
      contextMsg += `🚨 REGRA ABSOLUTA PARA ORÇAMENTOS COM TEMPLATE:\n`;
      contextMsg += `1. O campo "mensagem_formatada" contém o texto EXATO que deve ser sua resposta principal.\n`;
      contextMsg += `2. COPIE a mensagem_formatada literalmente — NÃO altere qualidades, valores ou formatação.\n`;
      contextMsg += `3. As qualidades das peças (ex: "importada", "OLED", "Original") são REAIS e vieram do banco de dados. NUNCA substitua por "Padrão", "Standard" ou qualquer termo genérico.\n`;
      contextMsg += `4. Apenas adicione uma saudação breve antes e uma pergunta amigável depois.\n`;
      contextMsg += `5. Se houver múltiplos orçamentos, cada mensagem_formatada deve ser exibida na íntegra.\n\n`;
    }
    
    contextMsg += `⚠️ DADOS JÁ CARREGADOS - NÃO use a ferramenta get_budgets novamente. Responda diretamente com base nesses dados.\n\n`;
  }

  if (context.data.serviceOrders && context.data.serviceOrders.length > 0) {
    contextMsg += formatServiceOrdersForAI(context.data.serviceOrders) + "\n\n";
  }

  if (context.data.trashedItems) {
    const items = context.data.trashedItems[0];
    contextMsg +=
      formatTrashedItemsForAI(items.budgets, items.orders) + "\n\n";
  }

  if (context.data.clients && context.data.clients.length > 0) {
    contextMsg += formatClientsForAI(context.data.clients) + "\n\n";
  }

  if (context.data.store) {
    const store = context.data.store;
    contextMsg += `🏪 LOJA ONLINE DO USUÁRIO\n\n`;
    contextMsg += `Nome: ${store.name || "(sem nome)"}\n`;
    if (store.slug) {
      contextMsg += `Slug público: ${store.slug}\n`;
    }
    if (store.description) {
      contextMsg += `Descrição: ${store.description}\n`;
    }
    if (store.contact_info) {
      const ci = store.contact_info;
      if (ci.phone) contextMsg += `Telefone: ${ci.phone}\n`;
      if (ci.whatsapp) contextMsg += `WhatsApp: ${ci.whatsapp}\n`;
    }
    contextMsg += "\n";
  }

  if (context.data.companyInfo) {
    const info = context.data.companyInfo;
    contextMsg += `🏢 PERFIL DA EMPRESA DO USUÁRIO\n\n`;
    if (info.name) contextMsg += `Nome: ${info.name}\n`;
    if (info.address) contextMsg += `Endereço: ${info.address}\n`;
    if (info.whatsapp_phone) contextMsg += `WhatsApp: ${info.whatsapp_phone}\n`;
    if (info.email) contextMsg += `Email: ${info.email}\n`;
    if (info.business_hours)
      contextMsg += `Horário de atendimento: ${info.business_hours}\n`;
    if (info.description) contextMsg += `Descrição: ${info.description}\n`;
    contextMsg += "\n";
  }

  return contextMsg;

}

async function webSearch(query: string, supabase?: any, ownerId?: string): Promise<string> {
  try {
    console.log(`[WEB-SEARCH] Buscando: "${query}"`);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return JSON.stringify({ query, error: "Web search não configurada (LOVABLE_API_KEY ausente)." });
    }

    // Use Lovable AI gateway with a search-oriented prompt via Gemini
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "Você é um assistente de pesquisa. Responda com informações factuais, atualizadas e concisas sobre o tema solicitado. Use dados reais. Responda em português." },
          { role: "user", content: `Pesquise e me dê informações atualizadas sobre: ${query}` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[WEB-SEARCH] Gateway error:", res.status);
      return JSON.stringify({ query, error: `Erro na pesquisa (status ${res.status})` });
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content || "Sem resultados.";

    // Log search for cost tracking
    if (supabase && ownerId) {
      try {
        await supabase.from("ia_web_search_logs").insert({
          owner_id: ownerId,
          query,
          provider: "lovable-gateway",
          tokens_used: data.usage?.total_tokens ?? 0,
          results_count: 1,
        });
      } catch (e) {
        console.warn("[WEB-SEARCH] Failed to log search:", e);
      }
    }

    return JSON.stringify({ query, results: answer });
  } catch (error) {
    console.error("[WEB-SEARCH] Erro:", error);
    return JSON.stringify({ query, error: "Não consegui realizar a busca no momento." });
  }
}

// Buscar configuração dinâmica da IA
async function getAIConfiguration(supabase: any): Promise<{
  provider: string;
  model: string;
  apiKey: string | null;
  error?: string;
}> {
  try {
    // 1. Buscar configuração ativa
    const { data: settings } = await supabase
      .from('drippy_settings')
      .select('*')
      .single();

    if (!settings) {
      console.log('[AI-CONFIG] Nenhuma configuração encontrada, usando padrão Lovable AI');
      return {
        provider: 'lovable',
        model: 'google/gemini-3-flash-preview',
        apiKey: Deno.env.get("LOVABLE_API_KEY") || null,
      };
    }

    const { active_provider, active_model } = settings;
    console.log(`[AI-CONFIG] Configuração ativa: ${active_provider} / ${active_model}`);

    // 2. Se for Lovable AI, usar LOVABLE_API_KEY do env
    if (active_provider === 'lovable') {
      const apiKey = Deno.env.get("LOVABLE_API_KEY") || null;
      return { provider: active_provider, model: active_model, apiKey };
    }

    // 3. Para outros providers, buscar na tabela api_keys com aliases aceitos
    const providerServiceNameMap: Record<string, string[]> = {
      claude: ['claude', 'anthropic'],
      deepseek: ['deepseek'],
      gemini: ['gemini'],
      openai: ['openai'],
    };

    const serviceNamesToCheck = providerServiceNameMap[active_provider] || [active_provider];

    const { data: keyRows, error: keyError } = await supabase
      .from('api_keys')
      .select('api_key, updated_at')
      .in('service_name', serviceNamesToCheck)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (keyError) {
      console.error(`[AI-CONFIG] Erro ao buscar API Key para ${active_provider}:`, keyError);
    }

    const apiKey = keyRows?.[0]?.api_key ?? null;

    if (!apiKey) {
      console.error(`[AI-CONFIG] API Key não encontrada para ${active_provider}`);
      return {
        provider: active_provider,
        model: active_model,
        apiKey: null,
        error: `⚠️ API Key não configurada para ${active_provider}. Configure em /supadmin/drippy na aba "API Keys".`
      };
    }

    console.log(`[AI-CONFIG] API Key encontrada para ${active_provider}`);
    return {
      provider: active_provider,
      model: active_model,
      apiKey
    };
  } catch (error) {
    console.error('[AI-CONFIG] Erro ao buscar configuração:', error);
    return {
      provider: 'lovable',
      model: 'google/gemini-3-flash-preview',
      apiKey: Deno.env.get("LOVABLE_API_KEY") || null,
      error: 'Erro ao carregar configuração, usando padrão'
    };
  }
}

// Chamar IA com suporte a múltiplos provedores
async function callAI(
  config: { provider: string; model: string; apiKey: string | null; error?: string },
  userMessage: string,
  contextMessage: string,
  conversationId: string,
  messageHistory: Array<{ role: string; content: string }> | undefined,
  supabase: any,
  userId: string,
  meta?: {
    source?: "app" | "whatsapp" | "internal";
    iaConfig?: { ai_name?: string; personality?: string; welcome_message?: string; active_topics?: any; custom_knowledge?: string; web_search_enabled?: boolean; company_info?: any } | null;
  }
): Promise<string> {
  try {
    const { provider, model, apiKey, error } = config;

    if (!apiKey) {
      console.error(`[AI-CALL] API Key não disponível para ${provider}`);
      return error || "Erro de configuração: API key não encontrada.";
    }

    console.log(`[AI-CALL] Usando provider: ${provider} / model: ${model}`);

    let endpoint = "";
    let headers: Record<string, string> = {};
    let requestBody: any = {};

    // Build system prompt — inject ia_config personalization when coming from WhatsApp
    const iaConf = meta?.iaConfig;
    let effectiveSystemPrompt = CHAT_AI_SYSTEM_PROMPT;
    if (iaConf) {
      const overrides: string[] = [];
      if (iaConf.ai_name && iaConf.ai_name !== "Drippy") {
        overrides.push(`Seu nome é ${iaConf.ai_name} (não Drippy).`);
      }
      if (iaConf.personality) {
        const toneMap: Record<string, string> = {
          friendly: "amigável e acolhedor",
          formal: "formal e profissional",
          casual: "descontraído e informal",
          neutral: "neutro e objetivo",
          empathetic: "empático e compreensivo",
        };
        overrides.push(`Seu tom de voz é: ${toneMap[iaConf.personality] ?? iaConf.personality}.`);
      }
      if (iaConf.custom_knowledge) {
        overrides.push(`BASE DE CONHECIMENTO PERSONALIZADA DO DONO:\n${iaConf.custom_knowledge}`);
      }
      if (iaConf.active_topics) {
        const disabled = Object.entries(iaConf.active_topics)
          .filter(([, v]) => !v)
          .map(([k]) => k);
        if (disabled.length > 0) {
          overrides.push(`TÓPICOS DESATIVADOS (NÃO consulte nem responda sobre): ${disabled.join(", ")}.`);
        }
      }
      // Inject company_info into system prompt for WhatsApp context
      if (iaConf.company_info) {
        const ci = iaConf.company_info;
        const infoLines: string[] = [];
        if (ci.name) infoLines.push(`Nome: ${ci.name}`);
        if (ci.business_hours) infoLines.push(`Horário: ${ci.business_hours}`);
        if (ci.address) infoLines.push(`Endereço: ${ci.address}`);
        if (ci.whatsapp_phone) infoLines.push(`WhatsApp: ${ci.whatsapp_phone}`);
        if (ci.email) infoLines.push(`Email: ${ci.email}`);
        if (ci.description) infoLines.push(`Sobre: ${ci.description}`);
        if (infoLines.length > 0) {
          overrides.push(`INFORMAÇÕES DA SUA EMPRESA:\n${infoLines.join("\n")}`);
        }
      }
      if (overrides.length > 0) {
        effectiveSystemPrompt += "\n\n--- PERSONALIZAÇÕES DO DONO ---\n" + overrides.join("\n");
      }
    }

    const messages: Array<any> = [
      { role: "system", content: effectiveSystemPrompt },
      { role: "system", content: contextMessage },
    ];

    if (messageHistory && messageHistory.length > 1) {
      const historyToInclude = messageHistory.slice(-11, -1);
      messages.push(...historyToInclude);
    }
    messages.push({ role: "user", content: userMessage });

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "web_search",
          description:
            "Busca informações na internet. Use quando o usuário pedir para pesquisar algo, quiser saber notícias, informações atualizadas, curiosidades ou coisas aleatórias.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "O termo ou pergunta para pesquisar na internet",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_budgets",
          description:
            "Lê orçamentos reais do usuário a partir do Supabase. Use para responder perguntas sobre valores, quantidades, status e detalhes de orçamentos.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Texto livre com modelo, cliente ou palavra-chave (opcional).",
              },
              status: {
                type: "string",
                description:
                  "Status do orçamento (ex: pending, approved, rejected). Opcional.",
              },
              limit: {
                type: "number",
                description: "Quantidade máxima de registros a retornar (padrão 10).",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_service_orders",
          description:
            "Lê ordens de serviço reais do usuário a partir do Supabase. Use para responder perguntas sobre OS, reparos, status, valores e histórico.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Texto livre com modelo, cliente ou palavra-chave (opcional).",
              },
              status: {
                type: "string",
                description:
                  "Status da OS (ex: open, finished, cancelled). Opcional.",
              },
              limit: {
                type: "number",
                description: "Quantidade máxima de registros a retornar (padrão 10).",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_clients",
          description:
            "Busca clientes cadastrados do usuário. Pode filtrar por nome, telefone ou email.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Nome, telefone ou email do cliente para buscar (opcional).",
              },
              limit: {
                type: "number",
                description: "Quantidade máxima de registros (padrão 10).",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_store_info",
          description:
            "Busca informações da loja online do usuário (tabela stores) para responder dúvidas sobre link público, status e configurações principais.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_company_profile",
          description:
            "Busca o perfil da empresa (company_info) do usuário para responder perguntas sobre endereço, WhatsApp, horários e dados de contato.",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_product_catalog",
          description:
            "Busca produtos avulsos e acessórios da loja (películas, carregadores, capinhas, cabos, fones) com preços cadastrados pelo dono. Use quando o cliente perguntar sobre preço de produto que não é serviço de reparo.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description:
                  "Busca por categoria (pelicula, carregador, capinha) ou nome do produto (opcional).",
              },
              limit: {
                type: "number",
                description: "Quantidade máxima de produtos (padrão 10).",
              },
            },
          },
        },
      },
    ];

    // Segurança: quando chamado por automações (WhatsApp / internal), bloquear ferramentas
    // que escrevem dados ou armazenam memória.
    const source = meta?.source ?? "app";
    if (source === "whatsapp" || source === "internal") {
      const blocked = new Set(["create_budget", "save_memory"]);

      // Also block tools based on active_topics config
      const activeTopics = meta?.iaConfig?.active_topics;
      if (activeTopics) {
        const topicToolMap: Record<string, string> = {
          budgets: "get_budgets",
          service_orders: "get_service_orders",
          clients: "get_clients",
          store: "get_store_info",
          company_info: "get_company_profile",
        };
        for (const [topic, toolName] of Object.entries(topicToolMap)) {
          if (activeTopics[topic] === false) {
            blocked.add(toolName);
          }
        }
      }

      const before = tools.length;
      for (let i = tools.length - 1; i >= 0; i--) {
        const toolName = tools[i]?.function?.name;
        if (typeof toolName === "string" && blocked.has(toolName)) {
          tools.splice(i, 1);
        }
      }
      console.log(
        `[AI-CALL] Source=${source}. Tools filtered: ${before} -> ${tools.length} (blocked: ${[...blocked].join(", ")})`,
      );
    }

    switch (provider) {
      case "lovable":
        endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        requestBody = {
          model: model,
          messages: messages,
          tools: tools,
          tool_choice: "auto",
        };
        break;

      case "deepseek":
        endpoint = "https://api.deepseek.com/v1/chat/completions";
        headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };
        requestBody = {
          model: model,
          messages: messages,
        };
        break;

      case "gemini": {
        const safeGeminiModel = model === "gemini-1.5-flash" || model === "gemini-1.5-pro"
          ? model
          : "gemini-1.5-flash";
        endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${safeGeminiModel}:generateContent?key=${apiKey}`;
        headers = {
          "Content-Type": "application/json",
        };

        const geminiContents = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          }));

        requestBody = {
          contents: geminiContents,
          systemInstruction: {
            parts: [
              {
                text: messages
                  .filter((m) => m.role === "system")
                  .map((m) => m.content)
                  .join("\n\n"),
              },
            ],
          },
        };
        break;
      }

      case "claude": {
        endpoint = "https://api.anthropic.com/v1/messages";
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };

        const systemMsgs = messages.filter((m: any) => m.role === "system");
        const nonSystemMsgs = messages.filter((m: any) => m.role !== "system");
        const claudeMsgs = nonSystemMsgs.map((m: any) => ({
          role: m.role === "tool" ? "user" : m.role,
          content: m.content,
        }));

        requestBody = {
          model: model,
          system: systemMsgs.map((m: any) => m.content).join("\n\n"),
          messages: claudeMsgs,
          max_tokens: 4096,
        };
        break;
      }

      default:
        return `Provider ${provider} não suportado. Use: lovable, deepseek, gemini ou claude.`;
    }

    let finalResponse = "";
    const aiStartTime = Date.now();

    if (provider === "claude") {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[claude] API error:`, response.status, errorText);
        return `Erro ao conectar com Claude. Status: ${response.status}`;
      }

      const data = await response.json();
      finalResponse = data.content?.[0]?.text || "Sem resposta da IA.";

      // Log
      await logAIRequest({
        provider, model, source: meta?.source || "app",
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
        duration_ms: Date.now() - aiStartTime,
        status: 'success', user_id: userId,
      }, supabase);
    } else if (provider === "gemini") {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${provider}] API error:`, response.status, errorText);
        return `Erro ao conectar com ${provider}. Status: ${response.status}`;
      }

      const data = await response.json();
      finalResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

      // Log
      await logAIRequest({
        provider, model, source: meta?.source || "app",
        input_tokens: data.usageMetadata?.promptTokenCount,
        output_tokens: data.usageMetadata?.candidatesTokenCount,
        duration_ms: Date.now() - aiStartTime,
        status: 'success', user_id: userId,
      }, supabase);
    } else {
      let shouldContinue = true;
      let iterationCount = 0;
      const maxIterations = 3;

      while (shouldContinue && iterationCount < maxIterations) {
        iterationCount++;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${provider}] API error:`, response.status, errorText);
          return `Erro ao conectar com ${provider}. Status: ${response.status}`;
        }

        const data = await response.json();
        const choice = data.choices[0];

        if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
          console.log(`[${provider}] IA decidiu usar ferramenta`);

          messages.push(choice.message);

          for (const toolCall of choice.message.tool_calls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

            console.log(`[${provider}] Executando: ${functionName}`, functionArgs);

            let functionResult: any = "";

            if (functionName === "web_search") {
              functionResult = await webSearch(functionArgs.query, supabase, userId);
            } else if (functionName === "get_budgets") {
              const { query, status, limit } = functionArgs;
              const selectCols = buildSelectColumns("budgets");
              let q = supabase
                .from("budgets")
                .select(selectCols)
                .eq("owner_id", userId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
                .limit(limit || 10);

              if (status) {
                q = q.eq("status", status);
              }
              if (query) {
                q = q.or(
                  `device_model.ilike.%${query}%,client_name.ilike.%${query}%,issue.ilike.%${query}%,part_quality.ilike.%${query}%`
                );
              }

              const { data: budgets, error: err } = await q;
              if (err) {
                console.error("[TOOLS] Erro em get_budgets:", err.message);
                functionResult = JSON.stringify({
                  type: "budgets",
                  error: err.message,
                  items: [],
                });
              } else {
                // Buscar budget_parts para cada orçamento encontrado
                const budgetsWithParts = await Promise.all(
                  (budgets || []).map(async (b: any) => {
                    const { data: parts } = await supabase
                      .from("budget_parts")
                      .select("name, price, quantity, cash_price, installment_price, installment_count, warranty_months, part_type")
                      .eq("budget_id", b.id)
                      .is("deleted_at", null);
                    return { ...b, budget_parts: parts || [] };
                  })
                );

                // Formatar com template do usuário (igual ao analyzeAndFetchContext)
                const formattedResult = await formatBudgetsForAI(
                  supabase,
                  userId,
                  budgetsWithParts,
                  "budgets",
                  "app"
                );

                functionResult = JSON.stringify({
                  type: "budgets",
                  formatted: formattedResult,
                  items: budgetsWithParts,
                });
              }
            } else if (functionName === "get_service_orders") {
              const { query, status, limit } = functionArgs;
              const selectCols = buildSelectColumns("service_orders");
              let q = supabase
                .from("service_orders")
                .select(selectCols)
                .eq("owner_id", userId)
                .is("deleted_at", null)
                .order("created_at", { ascending: false })
                .limit(limit || 10);

              if (status) {
                q = q.eq("status", status);
              }
              if (query) {
                q = q.or(
                  `device_model.ilike.%${query}%,client_name.ilike.%${query}%`
                );
              }

              const { data: orders, error: err } = await q;
              if (err) {
                console.error("[TOOLS] Erro em get_service_orders:", err.message);
                functionResult = JSON.stringify({
                  type: "service_orders",
                  error: err.message,
                  items: [],
                });
              } else {
                functionResult = JSON.stringify({
                  type: "service_orders",
                  items: orders || [],
                });
              }
            } else if (functionName === "get_store_info") {
              const selectCols = buildSelectColumns("stores");
              const { data: store, error: err } = await supabase
                .from("stores")
                .select(selectCols)
                .eq("owner_id", userId)
                .maybeSingle();

              if (err) {
                console.error("[TOOLS] Erro em get_store_info:", err.message);
                functionResult = JSON.stringify({
                  type: "store",
                  error: err.message,
                  store: null,
                });
              } else {
                functionResult = JSON.stringify({
                  type: "store",
                  store: store || null,
                });
              }
            } else if (functionName === "get_company_profile") {
              const selectCols = buildSelectColumns("company_info");
              const { data: company, error: err } = await supabase
                .from("company_info")
                .select(selectCols)
                .eq("owner_id", userId)
                .maybeSingle();

              if (err) {
                console.error(
                  "[TOOLS] Erro em get_company_profile:",
                  err.message,
                );
                functionResult = JSON.stringify({
                  type: "company_profile",
                  error: err.message,
                  company: null,
                });
              } else {
                functionResult = JSON.stringify({
                  type: "company_profile",
                  company: company || null,
                });
              }
            } else if (functionName === "get_clients") {
              const { query, limit } = functionArgs;
              let q = supabase
                .from("clients")
                .select("id, name, phone, email, address, city, notes, tags, created_at")
                .eq("user_id", userId)
                .order("name")
                .limit(limit || 10);

              if (query) {
                q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);
              }

              const { data: clients, error: err } = await q;
              if (err) {
                console.error("[TOOLS] Erro em get_clients:", err.message);
                functionResult = JSON.stringify({ type: "clients", error: err.message, items: [] });
              } else {
                functionResult = JSON.stringify({ type: "clients", items: clients || [] });
              }
            } else if (functionName === "get_product_catalog") {
              const { query: pQuery, limit: pLimit } = functionArgs;
              let pq = supabase
                .from("ia_product_catalog")
                .select("id, product_name, price_min, price_max, category, is_active")
                .eq("owner_id", userId)
                .eq("is_active", true)
                .limit(pLimit || 10);

              if (pQuery) {
                pq = pq.or(`product_name.ilike.%${pQuery}%,category.ilike.%${pQuery}%`);
              }

              const { data: products, error: pErr } = await pq;
              if (pErr) {
                console.error("[TOOLS] Erro em get_product_catalog:", pErr.message);
                functionResult = JSON.stringify({ type: "products", error: pErr.message, items: [] });
              } else {
                const formatted = (products || []).map((p: any) => ({
                  ...p,
                  price_min_display: p.price_min ? `R$ ${(p.price_min / 100).toFixed(2)}` : null,
                  price_max_display: p.price_max ? `R$ ${(p.price_max / 100).toFixed(2)}` : null,
                }));
                functionResult = JSON.stringify({ type: "products", items: formatted });
              }
            }

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: typeof functionResult === "string"
                ? functionResult
                : JSON.stringify(functionResult),
            } as any);
          }

          requestBody.messages = messages;
          continue;
        } else {
          finalResponse = choice.message.content;
          shouldContinue = false;

          // Log success for OpenAI-compatible providers
          await logAIRequest({
            provider, model, source: meta?.source || "app",
            input_tokens: data.usage?.prompt_tokens,
            output_tokens: data.usage?.completion_tokens,
            duration_ms: Date.now() - aiStartTime,
            status: 'success', user_id: userId,
          }, supabase);
        }
      }
    }

    return finalResponse;
  } catch (error) {
    console.error(`[AI-CALL] Erro ao chamar ${config.provider}:`, error);

    // Log error
    await logAIRequest({
      provider: config.provider, model: config.model, source: meta?.source || "app",
      duration_ms: Date.now() - (Date.now()),
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      user_id: userId,
    }, supabase).catch(() => {});

    return "Erro ao processar sua mensagem. Por favor, tente novamente.";
  }
}

async function callLovableAI(
  userMessage: string,
  contextMessage: string,
  conversationId: string,
  messageHistory?: Array<{ role: string; content: string }>
): Promise<string> {
  // Esta função agora é um wrapper que chama callAI com configuração dinâmica
  // Mantida para compatibilidade com código existente
  try {
    console.warn('[DEPRECATED] callLovableAI is deprecated, use callAI with getAIConfiguration instead');

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return "Erro de configuração: API key não encontrada.";
    }

    // Construir array de mensagens com histórico completo
    const messages = [
      { role: "system", content: CHAT_AI_SYSTEM_PROMPT },
      { role: "system", content: contextMessage },
    ];

    // Adicionar histórico de mensagens (exceto a última que é a mensagem atual)
    if (messageHistory && messageHistory.length > 1) {
      // Pegar até as últimas 10 mensagens de histórico (excluindo a mensagem atual)
      const historyToInclude = messageHistory.slice(-11, -1);
      console.log(`[CHAT-AI] Incluindo ${historyToInclude.length} mensagens de histórico no contexto`);
      messages.push(...historyToInclude);
    }

    // Adicionar a mensagem atual do usuário
    messages.push({ role: "user", content: userMessage });

    console.log(`[CHAT-AI] Total de mensagens enviadas para IA: ${messages.length}`);

    // Definir ferramenta de busca na internet
    const tools = [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Busca informações na internet. Use quando o usuário pedir para pesquisar algo, quiser saber notícias, informações atualizadas, curiosidades ou coisas aleatórias interessantes.",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "O termo ou pergunta para pesquisar na internet"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    let finalResponse = "";
    let shouldContinue = true;
    let iterationCount = 0;
    const maxIterations = 3;

    while (shouldContinue && iterationCount < maxIterations) {
      iterationCount++;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: messages,
            tools: tools,
            tool_choice: "auto"
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI error:", response.status, errorText);
        return "Erro ao conectar com a IA. Por favor, tente novamente.";
      }

      const data = await response.json();
      const choice = data.choices[0];

      // Se a IA decidiu usar uma ferramenta
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        console.log(`[CHAT-AI] IA decidiu usar ferramenta`);

        // Adicionar a resposta da IA com tool_calls ao histórico
        messages.push(choice.message);

        // Executar cada tool call
        for (const toolCall of choice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[CHAT-AI] Executando ferramenta: ${functionName}`, functionArgs);

          let functionResult = "";

          if (functionName === "web_search") {
            functionResult = await webSearch(functionArgs.query, undefined, undefined);
          }

          // Adicionar resultado da ferramenta ao histórico
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: functionResult
          } as any);
        }

        // Continuar o loop para a IA processar os resultados
        continue;
      } else {
        // A IA deu uma resposta final
        finalResponse = choice.message.content;
        shouldContinue = false;
      }
    }

    return finalResponse;
  } catch (error) {
    console.error("Error calling Lovable AI:", error);
    return "Erro ao processar sua mensagem. Por favor, tente novamente.";
  }
}

// Função removida - salvamento de mensagens agora é gerenciado apenas pelo frontend
// para evitar duplicação de mensagens no chat
