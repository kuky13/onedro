import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getTrashedBudgets(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("owner_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getTrashedServiceOrders(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
) {
  const { data, error } = await supabase
    .from("service_orders")
    .select("*")
    .eq("owner_id", userId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export async function getAllTrashedItems(
  supabase: SupabaseClient,
  userId: string
) {
  const [budgets, orders] = await Promise.all([
    getTrashedBudgets(supabase, userId, 5),
    getTrashedServiceOrders(supabase, userId, 5),
  ]);

  return { budgets, orders };
}

export function formatTrashedItemsForAI(
  budgets: any[],
  orders: any[]
): string {
  if (budgets.length === 0 && orders.length === 0) {
    return "NO_DATA_FOUND: A lixeira está vazia.";
  }

  let formatted = `🗑️ **ITENS NA LIXEIRA**\n\n`;
  formatted += `📋 Orçamentos deletados: ${budgets.length}\n`;
  formatted += `🔧 Ordens de serviço deletadas: ${orders.length}\n\n`;

  if (budgets.length > 0) {
    formatted += `**Orçamentos:**\n`;
    budgets.slice(0, 3).forEach((b, idx) => {
      const num = b.sequential_number || "S/N";
      const device = b.device_model || "Dispositivo";
      const date = new Date(b.deleted_at).toLocaleDateString("pt-BR");
      formatted += `${idx + 1}. #${num} - ${device} (Deletado em ${date})\n`;
    });
    formatted += `\n`;
  }

  if (orders.length > 0) {
    formatted += `**Ordens de Serviço:**\n`;
    orders.slice(0, 3).forEach((os, idx) => {
      const num = os.sequential_number || "S/N";
      const device = os.device_model || "Dispositivo";
      const date = new Date(os.deleted_at).toLocaleDateString("pt-BR");
      formatted += `${idx + 1}. OS #${num} - ${device} (Deletado em ${date})\n`;
    });
    formatted += `\n`;
  }

  formatted += `💡 Itens ficam na lixeira por 30 dias antes de serem excluídos permanentemente.`;

  return formatted;
}
