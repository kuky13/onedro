import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ExtractedEntities } from "./entity-extractor.ts";
import { normalizeText, partialFuzzyMatch } from "./fuzzy-search.ts";

/**
 * Sistema de busca inteligente de ordens de serviço
 */
export async function searchServiceOrdersIntelligent(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  entities: ExtractedEntities
): Promise<any[]> {
  
  console.log(`[INTELLIGENT SEARCH] Iniciando busca com entidades:`, JSON.stringify(entities, null, 2));
  
  // 1. BUSCA POR NÚMERO (Prioridade máxima)
  if (entities.numbers.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Busca por números: ${entities.numbers}`);
    const results = await searchBySequentialNumber(supabase, userId, entities.numbers);
    if (results.length > 0) {
      console.log(`[INTELLIGENT SEARCH] ✓ Encontradas ${results.length} OS por número`);
      return results;
    }
  }
  
  // 2. BUSCA MULTI-CAMPO (Combina múltiplos critérios)
  const queries: Promise<any[]>[] = [];
  
  // Busca por telefone
  if (entities.phones.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por telefone: ${entities.phones}`);
    queries.push(searchByPhone(supabase, userId, entities.phones));
  }
  
  // Busca por cliente (nome)
  if (entities.clientNames.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por cliente: ${entities.clientNames}`);
    queries.push(searchByClientName(supabase, userId, entities.clientNames));
  }
  
  // Busca por modelo
  if (entities.deviceModels.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por modelo: ${entities.deviceModels}`);
    queries.push(searchByDeviceModel(supabase, userId, entities.deviceModels));
  }
  
  // Busca por data
  if (entities.dates.start || entities.dates.end) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por data: ${entities.dates.start} - ${entities.dates.end}`);
    queries.push(searchByDateRange(supabase, userId, entities.dates));
  }
  
  // Busca por status
  if (entities.statuses.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por status: ${entities.statuses}`);
    queries.push(searchByStatus(supabase, userId, entities.statuses));
  }
  
  // Busca por reparo
  if (entities.repairs.length > 0) {
    console.log(`[INTELLIGENT SEARCH] Adicionando busca por reparo: ${entities.repairs}`);
    queries.push(searchByRepair(supabase, userId, entities.repairs));
  }
  
  // 3. EXECUTAR BUSCAS EM PARALELO
  if (queries.length > 0) {
    const results = await Promise.all(queries);
    const merged = mergeAndRankResults(results, entities);
    console.log(`[INTELLIGENT SEARCH] ✓ Total encontradas: ${merged.length} OS`);
    return merged;
  }
  
  // 4. BUSCA GERAL (fallback)
  console.log(`[INTELLIGENT SEARCH] Executando busca geral com query: "${query}"`);
  return await searchByMultiField(supabase, userId, query);
}

/**
 * Busca por número sequencial
 */
async function searchBySequentialNumber(
  supabase: SupabaseClient,
  userId: string,
  numbers: number[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .in("sequential_number", numbers)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[searchBySequentialNumber] Erro:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Busca por telefone (normalizado)
 */
async function searchByPhone(
  supabase: SupabaseClient,
  userId: string,
  phones: string[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .is("deleted_at", null);
  
  if (error) {
    console.error("[searchByPhone] Erro:", error);
    return [];
  }
  
  // Filtrar por telefone no lado do cliente (Supabase não suporta busca em JOIN)
  const normalizedPhones = phones.map(p => p.replace(/\D/g, ''));
  
  const filtered = data?.filter(os => {
    const clientPhone = (os.clients?.phone || '').replace(/\D/g, '');
    return normalizedPhones.some(p => 
      clientPhone.includes(p) || 
      p.includes(clientPhone) ||
      clientPhone.slice(-8) === p.slice(-8) // Últimos 8 dígitos
    );
  }) || [];
  
  return filtered;
}

/**
 * Busca por nome de cliente (com fuzzy match)
 */
async function searchByClientName(
  supabase: SupabaseClient,
  userId: string,
  names: string[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .is("deleted_at", null);
  
  if (error) {
    console.error("[searchByClientName] Erro:", error);
    return [];
  }
  
  // Filtrar com fuzzy match
  const filtered = data?.filter(os => {
    const clientName = os.clients?.name || '';
    return names.some(name => 
      partialFuzzyMatch(name, clientName, 2) // Threshold de 2 caracteres de diferença
    );
  }) || [];
  
  return filtered;
}

/**
 * Busca por modelo de dispositivo (com fuzzy match)
 */
async function searchByDeviceModel(
  supabase: SupabaseClient,
  userId: string,
  models: string[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .is("deleted_at", null);
  
  if (error) {
    console.error("[searchByDeviceModel] Erro:", error);
    return [];
  }
  
  // Filtrar com fuzzy match
  const filtered = data?.filter(os => {
    const deviceModel = `${os.device_type || ''} ${os.device_model || ''}`.trim();
    return models.some(model => 
      partialFuzzyMatch(model, deviceModel, 2)
    );
  }) || [];
  
  return filtered;
}

/**
 * Busca por intervalo de datas
 */
async function searchByDateRange(
  supabase: SupabaseClient,
  userId: string,
  dateRange: { start: Date | null; end: Date | null }
): Promise<any[]> {
  let query = supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .is("deleted_at", null);
  
  if (dateRange.start) {
    query = query.gte('entry_date', dateRange.start.toISOString());
  }
  if (dateRange.end) {
    query = query.lte('entry_date', dateRange.end.toISOString());
  }
  
  const { data, error } = await query.order("entry_date", { ascending: false });
  
  if (error) {
    console.error("[searchByDateRange] Erro:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Busca por status
 */
async function searchByStatus(
  supabase: SupabaseClient,
  userId: string,
  statuses: string[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .in("status", statuses)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[searchByStatus] Erro:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Busca por tipo de reparo
 */
async function searchByRepair(
  supabase: SupabaseClient,
  userId: string,
  repairs: string[]
): Promise<any[]> {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .is("deleted_at", null);
  
  if (error) {
    console.error("[searchByRepair] Erro:", error);
    return [];
  }
  
  // Filtrar por reparos mencionados no reported_issue
  const filtered = data?.filter(os => {
    const issue = normalizeText(os.reported_issue || '');
    return repairs.some(repair => issue.includes(normalizeText(repair)));
  }) || [];
  
  return filtered;
}

/**
 * Busca em todos os campos de texto
 */
async function searchByMultiField(
  supabase: SupabaseClient,
  userId: string,
  searchTerm: string
): Promise<any[]> {
  const { data, error } = await supabase
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
    .or(`
      device_model.ilike.%${searchTerm}%,
      device_type.ilike.%${searchTerm}%,
      reported_issue.ilike.%${searchTerm}%,
      imei_serial.ilike.%${searchTerm}%,
      customer_notes.ilike.%${searchTerm}%,
      technician_notes.ilike.%${searchTerm}%
    `)
    .order("created_at", { ascending: false })
    .limit(20);
  
  if (error) {
    console.error("[searchByMultiField] Erro:", error);
    return [];
  }
  
  // Adicionar busca fuzzy no nome do cliente
  const withClientSearch = data?.filter(os => 
    partialFuzzyMatch(searchTerm, os.clients?.name || '', 2) ||
    (os.clients?.phone || '').replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
  );
  
  return withClientSearch && withClientSearch.length > 0 ? withClientSearch : (data || []);
}

/**
 * Mescla resultados de múltiplas buscas e remove duplicatas
 */
function mergeAndRankResults(
  results: any[][],
  entities: ExtractedEntities
): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];
  
  // Mesclar resultados removendo duplicatas
  results.forEach(resultSet => {
    resultSet.forEach(os => {
      if (!seen.has(os.id)) {
        seen.add(os.id);
        merged.push(os);
      }
    });
  });
  
  // Ordenar por relevância (mais recente primeiro)
  merged.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });
  
  return merged.slice(0, 20); // Limitar a 20 resultados
}

// ========== FUNÇÕES LEGADAS (mantidas para compatibilidade) ==========

export async function searchServiceOrders(
  supabase: SupabaseClient,
  userId: string,
  query: string
) {
  let queryBuilder = supabase
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
    .order("created_at", { ascending: false });

  // Busca por número sequencial
  const numMatch = query.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0]);
    queryBuilder = queryBuilder.or(
      `sequential_number.eq.${num},client_name.ilike.%${query}%,device_model.ilike.%${query}%`
    );
  } else {
    // Busca textual
    queryBuilder = queryBuilder.or(
      `client_name.ilike.%${query}%,device_model.ilike.%${query}%,device_type.ilike.%${query}%,issue.ilike.%${query}%`
    );
  }

  const { data, error } = await queryBuilder.limit(10);

  if (error) return [];
  return data || [];
}

export async function getServiceOrdersByStatus(
  supabase: SupabaseClient,
  userId: string,
  status: string
) {
  const { data, error } = await supabase
    .from("service_orders")
    .select(`
      *,
      clients!fk_service_orders_client_id (
        name,
        phone
      )
    `)
    .eq("owner_id", userId)
    .eq("status", status)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return data || [];
}

export async function getServiceOrderStats(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("service_orders")
    .select("status, total_price")
    .eq("owner_id", userId)
    .is("deleted_at", null);

  if (error || !data) return null;

  const stats = {
    total: data.length,
    pending: data.filter((os) => os.status === "pending").length,
    inProgress: data.filter((os) => os.status === "in_progress").length,
    completed: data.filter((os) => os.status === "completed").length,
    delivered: data.filter((os) => os.status === "delivered").length,
    totalValue: data.reduce((sum, os) => sum + (os.total_price || 0), 0),
  };

  return stats;
}

export function formatServiceOrdersForAI(orders: any[]): string {
  if (!orders || orders.length === 0) {
    return "NO_DATA_FOUND: Nenhuma ordem de serviço encontrada.";
  }

  let formatted = `🔧 **ORDENS DE SERVIÇO ENCONTRADAS** (${orders.length})\n\n`;

  orders.slice(0, 5).forEach((os, idx) => {
    const num = os.sequential_number || "S/N";
    const client = os.clients?.name || "Cliente não informado";
    const clientPhone = os.clients?.phone || "Não informado";
    const device = `${os.device_type || ""} ${os.device_model || ""}`.trim();
    const imei = os.imei_serial || "Não informado";
    const issue = os.reported_issue || os.issue || "Problema não informado";
    const warranty = os.warranty_months 
      ? `${os.warranty_months} ${os.warranty_months === 1 ? 'mês' : 'meses'}`
      : "Não informado";
    const price = os.total_price
      ? `R$ ${os.total_price.toFixed(2).replace(".", ",")}`
      : "Valor não informado";
    const entryDate = os.entry_date 
      ? new Date(os.entry_date).toLocaleDateString("pt-BR")
      : "Não informado";
    const exitDate = os.exit_date 
      ? new Date(os.exit_date).toLocaleDateString("pt-BR")
      : "Não informado";
    const createdDate = new Date(os.created_at).toLocaleDateString("pt-BR");
    
    const statusMap: Record<string, string> = {
      pending: "⏳ Pendente",
      in_progress: "🔄 Em andamento",
      completed: "✅ Concluído",
      delivered: "📦 Entregue",
    };
    const status = statusMap[os.status] || os.status;
    
    const paymentStatusMap: Record<string, string> = {
      pending: "⏳ Pendente",
      paid: "✅ Pago",
      partial: "🔄 Parcial",
    };
    const paymentStatus = os.is_paid 
      ? "✅ Pago" 
      : (paymentStatusMap[os.payment_status] || "⏳ Pendente");

    formatted += `${idx + 1}️⃣ **OS #${num}** - ${status}\n\n`;
    formatted += `📱 **DISPOSITIVO:**\n`;
    formatted += `   • Modelo: ${device}\n`;
    formatted += `   • IMEI/Serial: ${imei}\n\n`;
    formatted += `🔧 **SERVIÇO:**\n`;
    formatted += `   • Reparo: ${issue}\n`;
    formatted += `   • Garantia: ${warranty}\n`;
    formatted += `   • Data de Entrada: ${entryDate}\n`;
    formatted += `   • Data de Saída: ${exitDate}\n\n`;
    formatted += `💰 **PAGAMENTO:**\n`;
    formatted += `   • Valor Total: ${price}\n`;
    formatted += `   • Status: ${paymentStatus}\n\n`;
    formatted += `👤 **CLIENTE:**\n`;
    formatted += `   • Nome: ${client}\n`;
    formatted += `   • Telefone: ${clientPhone}\n\n`;
    formatted += `📅 Data de Criação: ${createdDate}\n`;
    formatted += `─────────────────────────────\n\n`;
  });

  if (orders.length > 5) {
    formatted += `... e mais ${orders.length - 5} ordens de serviço.`;
  }

  return formatted;
}
