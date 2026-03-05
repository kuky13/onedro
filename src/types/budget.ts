import type { Tables } from "@/integrations/supabase/types";

/**
 * Tipo canônico de Budget (tabela `budgets`).
 * Use este tipo na UI para evitar interfaces locais divergentes e casts `as any`.
 */
export type Budget = Tables<"budgets">;
