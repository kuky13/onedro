import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getUserDefaultTemplate,
  getUserCompanyName,
  generateWhatsAppMessageFromTemplate,
  DEFAULT_TEMPLATE,
} from "../utils/template-utils.ts";
import type { ExtractedEntities } from "./entity-extractor.ts";
import { normalizeText, partialFuzzyMatch } from "./fuzzy-search.ts";

/**
 * Busca inteligente por modelo e serviço com sistema de relevância
 * Útil para consultas como "orçamento da troca de tela do A12"
 */
export async function searchBudgetsIntelligent(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  entities: ExtractedEntities
): Promise<any[]> {
  console.log(`[INTELLIGENT BUDGET SEARCH] Iniciando busca com entidades:`, JSON.stringify(entities, null, 2));

  // 1. BUSCA POR NÚMERO (Prioridade máxima)
  if (entities.numbers.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Busca por números: ${entities.numbers}`);
    const { data: results, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("owner_id", userId)
      .neq("workflow_status", "template")
      .neq("client_name", "TEMPLATE")
      .is("deleted_at", null)
      .in("sequential_number", entities.numbers)
      .order("created_at", { ascending: false });

    if (!error && results && results.length > 0) {
      console.log(`[INTELLIGENT BUDGET SEARCH] ✓ Encontrados ${results.length} orçamentos por número`);
      // Attach parts to these budgets
      const finalResults = await Promise.all(
        results.map(async (budget) => {
          const parts = await getBudgetParts(supabase, budget.id);
          return { ...budget, budget_parts: parts };
        })
      );
      return finalResults;
    }
  }

  // 2. BUSCA MULTI-CAMPO (Combina múltiplos critérios)
  const queries: Promise<any[]>[] = [];

  // Busca por telefone
  if (entities.phones.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Adicionando busca por telefone: ${entities.phones}`);
    queries.push(searchBudgetsByPhone(supabase, userId, entities.phones));
  }

  // Busca por cliente (nome)
  if (entities.clientNames.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Adicionando busca por cliente: ${entities.clientNames}`);
    queries.push(searchBudgetsByClientName(supabase, userId, entities.clientNames));
  }

  // Busca por modelo
  if (entities.deviceModels.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Adicionando busca por modelo: ${entities.deviceModels}`);
    queries.push(searchBudgetsByDeviceModel(supabase, userId, entities.deviceModels));
  }

  // Busca por reparos
  if (entities.repairs.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Adicionando busca por reparo: ${entities.repairs}`);
    queries.push(searchBudgetsByRepair(supabase, userId, entities.repairs));
  }

  if (queries.length > 0) {
    const results = await Promise.all(queries);
    const merged = mergeAndRankBudgets(results, entities);
    if (merged.length > 0) {
      console.log(`[INTELLIGENT BUDGET SEARCH] ✓ Total encontrados: ${merged.length} orçamentos (ranked by relevance)`);
      const topMerged = merged.slice(0, 10);
      const finalResults = await Promise.all(
        topMerged.map(async (budget) => {
          const parts = await getBudgetParts(supabase, budget.id);
          return { ...budget, budget_parts: parts };
        })
      );
      return finalResults;
    }
  }

  // 3. Fallback determinístico: busca direta por modelo + serviço
  if (entities.deviceModels.length > 0) {
    console.log(`[INTELLIGENT BUDGET SEARCH] Fallback determinístico por modelo: ${entities.deviceModels[0]}`);
    const fallbackResults = await searchBudgetsByModelAndService(supabase, userId, entities.deviceModels[0], query);
    if (fallbackResults.length > 0) {
      console.log(`[INTELLIGENT BUDGET SEARCH] ✓ Fallback encontrou ${fallbackResults.length} orçamentos`);
      return fallbackResults;
    }
  }

  // 4. Fallback: Busca geral
  console.log(`[INTELLIGENT BUDGET SEARCH] Fallback para busca textual...`);
  return searchBudgets(supabase, userId, query);
}

async function searchBudgetsByPhone(supabase: SupabaseClient, userId: string, phones: string[]) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null);
  if (error || !data) return [];
  const normalizedPhones = phones.map(p => p.replace(/\\D/g, ''));
  return data.filter(b => {
    const cPhone = (b.client_phone || '').replace(/\\D/g, '');
    return normalizedPhones.some(p => cPhone.includes(p) || p.includes(cPhone) || cPhone.slice(-8) === p.slice(-8));
  });
}

async function searchBudgetsByClientName(supabase: SupabaseClient, userId: string, names: string[]) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null);
  if (error || !data) return [];
  return data.filter(b => {
    const clientName = b.client_name || '';
    return names.some(name => partialFuzzyMatch(name, clientName, 2));
  });
}

async function searchBudgetsByDeviceModel(supabase: SupabaseClient, userId: string, models: string[]) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null);
  if (error || !data) return [];
  return data.filter(b => {
    const deviceModel = `${b.device_type || ''} ${b.device_model || ''}`.trim();
    return models.some(model => partialFuzzyMatch(model, deviceModel, 2));
  });
}

async function searchBudgetsByRepair(supabase: SupabaseClient, userId: string, repairs: string[]) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null);
  if (error || !data) return [];
  return data.filter(b => {
    const issue = normalizeText(b.issue || '');
    return repairs.some(repair => issue.includes(normalizeText(repair)));
  });
}

/**
 * Merge results from multiple search channels and rank by relevance score.
 * Each result set index maps to a search type with different weights:
 *   0 = phone, 1 = clientName, 2 = deviceModel, 3 = repair
 * Budgets appearing in more relevant channels get higher scores.
 */
function mergeAndRankBudgets(results: any[][], entities?: ExtractedEntities): any[] {
  const scoreMap = new Map<string, { budget: any; score: number }>();

  // Weight per channel (order must match how queries are pushed)
  const channelWeights = [
    10,  // phone
    5,   // client name
    100, // device model  (highest)
    40,  // repair/service
  ];

  let channelIdx = 0;

  // Reconstruct channel index based on which entity arrays have items
  const channelOrder: number[] = [];
  if (entities?.phones?.length) channelOrder.push(0);
  if (entities?.clientNames?.length) channelOrder.push(1);
  if (entities?.deviceModels?.length) channelOrder.push(2);
  if (entities?.repairs?.length) channelOrder.push(3);

  results.forEach((resultSet, i) => {
    const weight = channelWeights[channelOrder[i] ?? i] || 1;
    resultSet.forEach(b => {
      const existing = scoreMap.get(b.id);
      if (existing) {
        existing.score += weight;
      } else {
        scoreMap.set(b.id, { budget: b, score: weight });
      }
    });
  });

  // Bonus: if entities have deviceModels, boost budgets whose device_model matches
  if (entities?.deviceModels?.length) {
    const normalizedModels = entities.deviceModels.map(m => normalizeText(m));
    for (const entry of scoreMap.values()) {
      const budgetModel = normalizeText(`${entry.budget.device_type || ''} ${entry.budget.device_model || ''}`);
      for (const qModel of normalizedModels) {
        // Exact normalized match bonus
        if (budgetModel.includes(qModel) || qModel.includes(budgetModel.replace(/\s+/g, ''))) {
          entry.score += 200;
        }
        // Partial match (e.g., "s23fe" in "samsung galaxy s23 fe")
        const compactQuery = qModel.replace(/\s+/g, '');
        const compactBudget = budgetModel.replace(/\s+/g, '');
        if (compactBudget.includes(compactQuery) || compactQuery.includes(compactBudget)) {
          entry.score += 150;
        }
      }
    }
  }

  // Bonus for repair match in issue field
  if (entities?.repairs?.length) {
    for (const entry of scoreMap.values()) {
      const issue = normalizeText(entry.budget.issue || '');
      for (const repair of entities.repairs) {
        if (issue.includes(normalizeText(repair))) {
          entry.score += 50;
        }
      }
    }
  }

  const ranked = Array.from(scoreMap.values());
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.budget.created_at).getTime() - new Date(a.budget.created_at).getTime();
  });

  console.log(`[RANK] Top 5 scores: ${ranked.slice(0, 5).map(r => `#${r.budget.sequential_number}=${r.score}`).join(', ')}`);

  return ranked.map(r => r.budget);
}

export async function searchBudgetsByModelAndService(
  supabase: SupabaseClient,
  userId: string,
  model: string,
  query: string
) {
  console.log(`[DEBUG] Iniciando busca - Modelo: "${model}", Query: "${query}"`);

  // PASSO 1: Buscar orçamentos SEM JOIN (mesma estratégia de getAllBudgets)
  const { data: budgets, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null)
    .ilike("device_model", `%${model}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  // Logging detalhado de erros
  if (error) {
    console.error(`[ERROR] Falha ao buscar orçamentos do modelo "${model}":`, error);
    return [];
  }

  if (!budgets || budgets.length === 0) {
    console.log(`[DEBUG] Nenhum orçamento encontrado para modelo "${model}"`);
    return [];
  }

  console.log(`[DEBUG] Encontrados ${budgets.length} orçamentos para o modelo "${model}"`);

  // PASSO 2: Buscar peças de cada orçamento separadamente
  const budgetsWithParts = await Promise.all(
    budgets.map(async (budget) => {
      const parts = await getBudgetParts(supabase, budget.id);
      console.log(`[DEBUG] Orçamento #${budget.sequential_number} - ${parts.length} peças encontradas`);
      return {
        ...budget,
        budget_parts: parts
      };
    })
  );

  console.log(`[DEBUG] Total de orçamentos com peças carregadas: ${budgetsWithParts.length}`);

  // PASSO 3: Identificar palavras-chave de serviço na query
  const servicoKeywords = ["troca", "reparo", "conserto", "tela", "display", "bateria", "placa", "conector", "camera"];
  const mentionsService = servicoKeywords.some(kw => query.toLowerCase().includes(kw));

  if (mentionsService && budgetsWithParts.length > 0) {
    console.log(`[DEBUG] Query menciona serviço - Aplicando sistema de relevância`);

    // Sistema de pontuação para determinar relevância
    const scored = budgetsWithParts.map(b => {
      let score = 0;

      // Verificar correspondência de serviço em múltiplos campos
      const issueText = (b.issue || '').toLowerCase();
      const partNames = b.budget_parts?.map((p: any) => (p.name || '').toLowerCase()).join(' ') || '';
      const partTypeText = b.budget_parts?.map((p: any) => (p.part_type || '').toLowerCase()).join(' ') || '';
      const combinedText = `${issueText} ${partNames} ${partTypeText}`;

      console.log(`[DEBUG] Orçamento #${b.sequential_number} - Texto combinado: "${combinedText}"`);

      // +100 pontos se alguma palavra-chave de serviço corresponde
      const matchingKeywords = servicoKeywords.filter(kw => combinedText.includes(kw));
      if (matchingKeywords.length > 0) {
        score += 100 * matchingKeywords.length;
        console.log(`[DEBUG] Orçamento #${b.sequential_number} - Match keywords: ${matchingKeywords.join(', ')} (+${100 * matchingKeywords.length})`);
      }

      // +50 pontos se tem peças cadastradas (importante para orçamentos sem issue detalhado)
      if (b.budget_parts && b.budget_parts.length > 0) {
        score += 50;
        console.log(`[DEBUG] Orçamento #${b.sequential_number} - Tem ${b.budget_parts.length} peças (+50)`);
      }

      // +25 pontos por peça adicional (orçamentos mais completos)
      if (b.budget_parts && b.budget_parts.length > 1) {
        const bonusPoints = (b.budget_parts.length - 1) * 25;
        score += bonusPoints;
        console.log(`[DEBUG] Orçamento #${b.sequential_number} - Peças extras (+${bonusPoints})`);
      }

      console.log(`[DEBUG] Orçamento #${b.sequential_number} - Score final: ${score}`);
      return { budget: b, score };
    });

    // Ordenar por score (maior primeiro), depois por data (mais recente)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.budget.created_at).getTime() - new Date(a.budget.created_at).getTime();
    });

    console.log(`[DEBUG] Melhor score: ${scored[0]?.score || 0}`);

    // Se a query for muito específica (menciona modelo + serviço), retornar o mais relevante se tiver score >= 50 (tem peças)
    if (scored.length > 0 && scored[0].score >= 50) {
      console.log(`[DEBUG] Retornando orçamento #${scored[0].budget.sequential_number} com score ${scored[0].score}`);
      return [scored[0].budget];
    }

    // Se nenhum orçamento tem score suficiente, retornar os 3 mais recentes que têm peças
    const withParts = scored.filter(s => s.score >= 50).slice(0, 3);
    console.log(`[DEBUG] Retornando ${withParts.length} orçamentos com score >= 50`);
    return withParts.map(s => s.budget);
  }

  console.log(`[DEBUG] Query não menciona serviço - Retornando todos os ${budgetsWithParts.length} orçamentos encontrados`);
  return budgetsWithParts;
}

export async function searchBudgets(
  supabase: SupabaseClient,
  userId: string,
  query: string
) {
  console.log(`[SEARCH] Iniciando busca com query: "${query}"`);

  const baseQuery = supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Detectar busca por número
  const numMatch = query.match(/\d+/);
  const isOnlyNumber = /^\s*\d+\s*$/.test(query);

  if (numMatch && isOnlyNumber) {
    const numStr = numMatch[0];
    const num = parseInt(numStr);
    console.log(`[SEARCH] Busca por número: "${numStr}" (parsed: ${num})`);

    // Estratégia 1: Busca exata
    console.log(`[SEARCH] Tentando busca exata por sequential_number = ${num}`);
    const { data: exactMatch } = await baseQuery
      .eq('sequential_number', num)
      .limit(1);

    if (exactMatch && exactMatch.length > 0) {
      console.log(`[SEARCH] ✓ Encontrado com busca exata: #${exactMatch[0].sequential_number}`);
      return exactMatch;
    }

    // Estratégia 2: Busca parcial (começa com) usando LIKE
    console.log(`[SEARCH] Tentando busca parcial com sequential_number começando com '${num}'`);
    const { data: partialMatch } = await supabase
      .from("budgets")
      .select("*")
      .eq("owner_id", userId)
      .neq("workflow_status", "template")
      .neq("client_name", "TEMPLATE")
      .is("deleted_at", null)
      .or(`sequential_number.eq.${num * 10},sequential_number.gte.${num * 10}.sequential_number.lt.${(num + 1) * 10}`)
      .order("sequential_number", { ascending: true })
      .limit(10);

    if (partialMatch && partialMatch.length > 0) {
      console.log(`[SEARCH] ✓ Encontrados ${partialMatch.length} com busca parcial`);
      return partialMatch;
    }

    // Estratégia 3: Busca em outros campos (cliente, modelo)
    console.log(`[SEARCH] Tentando busca em cliente/modelo/problema`);
    const { data: fieldMatch } = await supabase
      .from("budgets")
      .select("*")
      .eq("owner_id", userId)
      .neq("workflow_status", "template")
      .neq("client_name", "TEMPLATE")
      .is("deleted_at", null)
      .or(`client_name.ilike.%${query}%,device_model.ilike.%${query}%,issue.ilike.%${query}%`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (fieldMatch && fieldMatch.length > 0) {
      console.log(`[SEARCH] ✓ Encontrados ${fieldMatch.length} em outros campos`);
      return fieldMatch;
    }

    console.log(`[SEARCH] ✗ Nenhum resultado encontrado`);
    return [];
  } else {
    // Busca textual em múltiplos campos
    console.log(`[SEARCH] Busca textual: "${query}"`);

    // Buscar orçamentos que correspondem
    const { data, error } = await baseQuery
      .or(`client_name.ilike.%${query}%,device_model.ilike.%${query}%,device_type.ilike.%${query}%,issue.ilike.%${query}%`)
      .limit(20); // Aumentar limite para filtrar depois

    if (error) {
      console.error(`[SEARCH] ✗ Erro na busca:`, error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`[SEARCH] ✗ Nenhum resultado encontrado`);
      return [];
    }

    console.log(`[SEARCH] Encontrados ${data.length} orçamentos preliminares`);

    // Carregar peças para cada orçamento e verificar se há match nas peças
    const budgetsWithParts = await Promise.all(
      data.map(async (budget) => {
        const parts = await getBudgetParts(supabase, budget.id);
        return {
          ...budget,
          budget_parts: parts
        };
      })
    );

    // Filtrar orçamentos que têm match no texto ou nas peças
    const lowerQuery = query.toLowerCase();
    const filtered = budgetsWithParts.filter(b => {
      const hasTextMatch =
        (b.client_name || '').toLowerCase().includes(lowerQuery) ||
        (b.device_model || '').toLowerCase().includes(lowerQuery) ||
        (b.device_type || '').toLowerCase().includes(lowerQuery) ||
        (b.issue || '').toLowerCase().includes(lowerQuery);

      const hasPartMatch = b.budget_parts?.some((p: any) =>
        (p.name || '').toLowerCase().includes(lowerQuery) ||
        (p.part_type || '').toLowerCase().includes(lowerQuery)
      );

      return hasTextMatch || hasPartMatch;
    });

    console.log(`[SEARCH] Após filtrar por peças: ${filtered.length} orçamentos`);

    // Retornar no máximo 10 resultados
    const result = filtered.slice(0, 10);
    console.log(`[SEARCH] Resultado final: ${result.length} orçamentos`);
    return result;
  }
}

export async function getBudgetsByStatus(
  supabase: SupabaseClient,
  userId: string,
  status: string
) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .eq("status", status)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return data || [];
}

export async function getAllBudgets(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .neq("workflow_status", "template")
    .neq("client_name", "TEMPLATE")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function getBudgetStats(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("status, total_price")
    .eq("owner_id", userId)
    .is("deleted_at", null);

  if (error || !data) return null;

  const stats = {
    total: data.length,
    pending: data.filter((b) => b.status === "pending").length,
    approved: data.filter((b) => b.status === "approved").length,
    rejected: data.filter((b) => b.status === "rejected").length,
    totalValue: data.reduce((sum, b) => sum + (b.total_price || 0), 0),
  };

  return stats;
}

/**
 * Busca peças de um orçamento
 */
async function getBudgetParts(supabase: SupabaseClient, budgetId: string) {
  try {
    const { data, error } = await supabase
      .from("budget_parts")
      .select("*")
      .eq("budget_id", budgetId)
      .is("deleted_at", null);

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Busca o template de mensagem configurado pelo usuário
 */
async function getUserMessageTemplate(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    // Primeiro buscar o default_template_id do usuário
    const { data: userData } = await supabase
      .from("users")
      .select("default_template_id")
      .eq("id", userId)
      .single();

    if (userData?.default_template_id) {
      const { data: template } = await supabase
        .from("whatsapp_message_templates")
        .select("message_template")
        .eq("id", userData.default_template_id)
        .single();

      if (template?.message_template) {
        return template.message_template;
      }
    }

    // Fallback: buscar qualquer template do usuário marcado como default
    const { data: fallback } = await supabase
      .from("whatsapp_message_templates")
      .select("message_template")
      .eq("user_id", userId)
      .eq("is_default", true)
      .limit(1)
      .single();

    return fallback?.message_template || null;
  } catch {
    console.log("[DEBUG] Nenhum template de mensagem encontrado para o usuário");
    return null;
  }
}

/**
 * Gera introdução contextual variada
 */
function gerarIntroducaoContextual(count: number): string {
  const intros = [
    `✨ Encontrei ${count === 1 ? "o orçamento que você procura" : `${count} orçamentos`}!`,
    `📋 Achei ${count === 1 ? "esse orçamento aqui" : `${count} orçamentos no sistema`}!`,
    `👀 Aqui ${count === 1 ? "está o orçamento" : `estão os ${count} orçamentos`}:`,
    `🎯 Localizei ${count === 1 ? "1 orçamento" : `${count} orçamentos`} pra você!`,
  ];
  return intros[Math.floor(Math.random() * intros.length)];
}

/**
 * Gera metadados contextuais do orçamento
 */
function gerarMetadados(budget: any): string {
  const num = budget.sequential_number || "S/N";
  const status = budget.status || "pending";
  const statusEmoji = status === "approved" ? "✅" : status === "rejected" ? "❌" : "⏳";
  const date = budget.created_at ? new Date(budget.created_at).toLocaleDateString("pt-BR") : "";

  let meta = `\n📌 *Orçamento #${num}* ${statusEmoji}\n`;
  if (budget.client_name) meta += `👤 Cliente: ${budget.client_name}\n`;
  if (date) meta += `📅 Criado em: ${date}\n`;
  meta += `\n`;

  return meta;
}

/**
 * Gera fechamento amigável variado
 */
function gerarFechamentoAmigavel(): string {
  const fechamentos = [
    "\n\n💬 Posso ajudar com mais alguma coisa?",
    "\n\n✨ Precisa de mais algum orçamento ou informação?",
    "\n\n🤝 Se precisar de outros detalhes, é só falar!",
    "\n\n📞 Qualquer dúvida, estou aqui!",
  ];
  return fechamentos[Math.floor(Math.random() * fechamentos.length)];
}

/**
 * Formata orçamentos usando template do usuário
 */
/**
 * Formata orçamentos como dados estruturados para a IA processar
 * A IA receberá JSON estruturado ao invés de template pré-formatado
 */
export async function formatBudgetsForAI(
  supabase: SupabaseClient,
  userId: string,
  budgets: any[],
  contextType?: string,
  source?: string
): Promise<string> {
  if (!budgets || budgets.length === 0) {
    return "NO_DATA_FOUND";
  }

  // Buscar empresa/template do usuário para contexto
  const companyName = await getUserCompanyName(supabase, userId);
  const userTemplate = await getUserMessageTemplate(supabase, userId);

  // Fallback legado: se não houver template, mantém formato WhatsApp antigo
  if (source === "whatsapp" && !userTemplate) {
    return await formatBudgetsForWhatsApp(supabase, budgets, companyName, contextType);
  }

  // Se for pergunta de contagem, retornar formato específico
  if (contextType === "budgets_count") {
    return JSON.stringify({
      tipo: "contagem_orcamentos",
      total: budgets.length,
      empresa: companyName,
      mensagem: `O usuário perguntou QUANTOS orçamentos ele tem. Responda com o número ${budgets.length} de forma clara e ofereça opções.`
    }, null, 2);
  }

  // Para múltiplos orçamentos, retornar resumo estruturado
  if (budgets.length > 1) {
    // Se tem template, gerar uma mensagem formatada para cada orçamento
    if (userTemplate) {
      const formattedMessages = await Promise.all(
        budgets.slice(0, 10).map(async (budget) => {
          const parts = await getBudgetParts(supabase, budget.id);
          const budgetWithParts = { ...budget, budget_parts: parts };
          const msg = generateWhatsAppMessageFromTemplate(
            userTemplate,
            budgetWithParts,
            companyName
          );
          return {
            numero: budget.sequential_number,
            cliente: budget.client_name,
            status: budget.status || budget.workflow_status,
            mensagem_formatada: msg,
          };
        })
      );

      return JSON.stringify({
        tipo: "lista_orcamentos",
        total_encontrados: budgets.length,
        empresa: companyName,
        instrucao: "IMPORTANTE: Para CADA orçamento, use EXATAMENTE a mensagem_formatada como conteúdo. NÃO reformate qualidades. As qualidades (ex: OLED, Importada, Original) já estão corretas. Apresente cada orçamento separado por uma linha divisória.",
        orcamentos: formattedMessages,
      }, null, 2);
    }

    const budgetSummaries = await Promise.all(
      budgets.slice(0, 10).map(async (budget) => {
        const parts = await getBudgetParts(supabase, budget.id);

        // Calcular valores formatados em R$
        const installCount = budget.installments || 1;
        const totalInstall = budget.installment_price ? budget.installment_price * installCount : null;

        return {
          numero: budget.sequential_number,
          cliente: budget.client_name,
          telefone: budget.client_phone,
          aparelho: {
            tipo: budget.device_type,
            modelo: budget.device_model,
          },
          servico: budget.issue || budget.part_type || budget.part_quality,
          valores: {
            vista: formatCentsToReais(budget.cash_price || budget.total_price) || "Não informado",
            parcelado: formatCentsToReais(totalInstall) || "Não informado",
            parcelas: budget.installments || 0,
          },
          pecas: parts.map(p => {
            const pInstallCount = p.installment_count || 1;
            const pTotalInstall = p.installment_price ? p.installment_price * pInstallCount : null;
            return {
              nome: p.name || p.part_type || 'Peça',
              qualidade: p.name || p.part_type || 'Não informada',
              valor_vista: formatCentsToReais(p.cash_price || p.price) || "Não informado",
              valor_parcelado: formatCentsToReais(pTotalInstall) || "Não informado",
              parcelas: p.installment_count || 1,
              garantia_meses: p.warranty_months,
            };
          }),
          servicos_inclusos: {
            entrega: budget.includes_delivery,
            pelicula: budget.includes_screen_protector,
            outros: budget.custom_services,
          },
          status: budget.status || budget.workflow_status,
          garantia_meses: budget.warranty_months,
          observacoes: budget.notes,
          data_criacao: budget.created_at,
          validade: budget.valid_until || budget.expires_at,
        };
      })
    );

    const result: any = {
      tipo: "lista_orcamentos",
      total_encontrados: budgets.length,
      empresa: companyName,
      lista: budgetSummaries,
    };

    return JSON.stringify(result, null, 2);
  }

  // Para orçamento único, retornar dados completos estruturados
  const budget = budgets[0];
  budget.budget_parts = await getBudgetParts(supabase, budget.id);

  // Se tem template, gerar mensagem formatada
  let mensagem_formatada: string | undefined;
  if (userTemplate) {
    mensagem_formatada = generateWhatsAppMessageFromTemplate(
      userTemplate,
      budget,
      companyName
    );
  }

  // Se tem template formatado, enviar direto para a IA usar como resposta
  if (mensagem_formatada) {
    return JSON.stringify({
      tipo: "orcamento_detalhado",
      empresa: companyName,
      mensagem_formatada: mensagem_formatada,
      instrucao: "IMPORTANTE: Responda ao usuário usando EXATAMENTE a mensagem_formatada abaixo como base. NÃO reformate, NÃO substitua qualidades por 'Padrão' ou termos genéricos. As qualidades das peças (ex: OLED, Importada, Original) já estão corretas na mensagem. Apenas adicione uma saudação amigável antes e uma pergunta se precisa de algo mais depois.",
      orcamento_meta: {
        numero: budget.sequential_number,
        cliente: budget.client_name,
        status: budget.status || budget.workflow_status,
      },
    }, null, 2);
  }

  const budgetData: any = {
    tipo: "orcamento_detalhado",
    empresa: companyName,
    orcamento: {
      numero: budget.sequential_number,
      cliente: {
        nome: budget.client_name,
        telefone: budget.client_phone,
        id: budget.client_id,
      },
      aparelho: {
        tipo: budget.device_type,
        modelo: budget.device_model,
      },
      servico: budget.issue || budget.part_type || budget.part_quality,
      valores: {
        vista: formatCentsToReais(budget.cash_price || budget.total_price) || "Não informado",
        parcelado: (() => {
          const ic = budget.installments || 1;
          const ti = budget.installment_price ? budget.installment_price * ic : null;
          return formatCentsToReais(ti) || "Não informado";
        })(),
        parcelas: budget.installments || 0,
      },
      pecas: budget.budget_parts?.map((p: any) => {
        const pIC = p.installment_count || 1;
        const pTI = p.installment_price ? p.installment_price * pIC : null;
        return {
          nome: p.name || p.part_type || 'Peça',
          qualidade: p.name || p.part_type || 'Não informada',
          quantidade: p.quantity || 1,
          valor_vista: formatCentsToReais(p.cash_price || p.price) || "Não informado",
          valor_parcelado: formatCentsToReais(pTI) || "Não informado",
          parcelas: p.installment_count || 1,
          garantia_meses: p.warranty_months,
          tipo: p.part_type,
        };
      }) || [],
      servicos_inclusos: {
        entrega: budget.includes_delivery,
        pelicula: budget.includes_screen_protector,
        outros: budget.custom_services,
      },
      garantia_meses: budget.warranty_months,
      observacoes: budget.notes,
      status: budget.status || budget.workflow_status,
      datas: {
        criacao: budget.created_at,
        validade: budget.valid_until || budget.expires_at,
        aprovacao: budget.approved_at,
        pagamento: budget.payment_confirmed_at,
        entrega: budget.delivery_date,
      },
      flags: {
        pago: budget.is_paid,
        entregue: budget.is_delivered,
      },
    }
  };

  return JSON.stringify(budgetData, null, 2);
}

/**
 * Formata centavos para R$ (ex: 85000 → "R$ 850,00")
 */
function formatCentsToReais(cents: number | null | undefined): string | null {
  if (!cents || cents <= 0) return null;
  const reais = cents / 100;
  return `R$ ${reais.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formata orçamentos para WhatsApp no estilo card /worm
 * Tom: como a própria loja falando com o cliente
 * Omite campos vazios, nunca mostra dados internos (LID, IDs)
 */
async function formatBudgetsForWhatsApp(
  supabase: SupabaseClient,
  budgets: any[],
  companyName: string,
  contextType?: string
): Promise<string> {
  if (contextType === "budgets_count") {
    return JSON.stringify({
      tipo: "contagem_orcamentos",
      total: budgets.length,
      empresa: companyName,
      tom: "loja",
      mensagem: `Temos ${budgets.length} orçamentos cadastrados. O cliente quer saber a quantidade.`
    }, null, 2);
  }

  const formatPart = (p: any) => {
    const part: any = {};
    if (p.name || p.part_type) part.qualidade = p.name || p.part_type;
    const cashStr = formatCentsToReais(p.cash_price || p.price);
    if (cashStr) part.preco_a_vista = cashStr;
    // installment_price no DB é POR PARCELA — multiplicar por count para obter total no cartão
    const installCount = p.installment_count || 1;
    const totalInstall = p.installment_price ? p.installment_price * installCount : null;
    const installStr = formatCentsToReais(totalInstall);
    if (installStr) {
      part.preco_no_cartao = installStr;
    }
    if (p.warranty_months && p.warranty_months > 0) {
      part.garantia = `${p.warranty_months} meses`;
    }
    return part;
  };

  const formatBudget = async (budget: any) => {
    // Buscar peças se não existirem
    let parts = budget.budget_parts;
    if (!parts || parts.length === 0) {
      const { data } = await supabase
        .from("budget_parts")
        .select("*")
        .eq("budget_id", budget.id)
        .is("deleted_at", null);
      parts = data || [];
    }

    const b: any = {};
    if (budget.sequential_number) b.numero = budget.sequential_number;
    if (budget.device_model) b.aparelho = `${budget.device_type || ""} ${budget.device_model}`.trim();

    // Serviço: extrair de issue, part_type ou nome da peça
    const servico = budget.issue || budget.part_type || (parts.length > 0 ? `Serviço para ${budget.device_model}` : null);
    if (servico) b.servico = servico;

    // Peças formatadas
    if (parts.length > 0) {
      b.opcoes_de_peca = parts.map(formatPart);
    } else {
      // Fallback: usar dados do orçamento principal
      const fallback: any = {};
      if (budget.part_quality) fallback.qualidade = budget.part_quality;
      const cashStr = formatCentsToReais(budget.cash_price || budget.total_price);
      if (cashStr) fallback.preco_a_vista = cashStr;
      // installment_price no DB é POR PARCELA — multiplicar por installments para total no cartão
      const installCount = budget.installments || 1;
      const totalInstall = budget.installment_price ? budget.installment_price * installCount : null;
      const installStr = formatCentsToReais(totalInstall);
      if (installStr) {
        fallback.preco_no_cartao = installStr;
      }
      if (budget.warranty_months && budget.warranty_months > 0) {
        fallback.garantia = `${budget.warranty_months} meses`;
      }
      if (Object.keys(fallback).length > 0) b.opcoes_de_peca = [fallback];
    }

    // Serviços inclusos
    const servicos: string[] = [];
    if (budget.includes_delivery) servicos.push("Entrega");
    if (budget.includes_screen_protector) servicos.push("Película de brinde");
    if (budget.custom_services) servicos.push(budget.custom_services);
    if (servicos.length > 0) b.servicos_inclusos = servicos.join(" + ");

    // Validade
    if (budget.valid_until || budget.expires_at) {
      const validDate = new Date(budget.valid_until || budget.expires_at);
      b.validade = validDate.toLocaleDateString("pt-BR");
    }

    return b;
  };

  if (budgets.length === 1) {
    const formatted = await formatBudget(budgets[0]);
    return JSON.stringify({
      tipo: "orcamento_detalhado_whatsapp",
      tom: "loja",
      empresa: companyName,
      instrucao: "Responda como se fosse a própria loja falando com o cliente. Use 1ª pessoa do plural (temos, oferecemos). Apresente o orçamento de forma profissional. Use *negrito* para qualidades. Mostre preços no formato: 'À vista R$ X ou R$ Y no cartão de crédito'. NUNCA divida o preco_no_cartao por parcelas — mostre o valor TOTAL exatamente como está. Pergunte qual opção o cliente prefere. NUNCA mostre IDs internos, telefone LID, 'Cliente Padrão' ou campos vazios.",
      orcamento: formatted,
    }, null, 2);
  }

  // Múltiplos orçamentos
  const formattedList = await Promise.all(budgets.slice(0, 10).map(formatBudget));
  return JSON.stringify({
    tipo: "lista_orcamentos_whatsapp",
    tom: "loja",
    empresa: companyName,
    total: budgets.length,
    instrucao: "Responda como a própria loja. Liste as opções de peça com preços no formato 'À vista R$ X ou R$ Y no cartão de crédito'. NUNCA divida o preco_no_cartao por parcelas — mostre o valor TOTAL exatamente como está. Use *negrito* para qualidades. Se vários orçamentos forem do mesmo modelo, apresente como opções de peça, não orçamentos separados. Pergunte se o cliente quer detalhes. NUNCA mostre IDs internos, telefone LID, 'Cliente Padrão' ou campos vazios.",
    orcamentos: formattedList,
  }, null, 2);
}
