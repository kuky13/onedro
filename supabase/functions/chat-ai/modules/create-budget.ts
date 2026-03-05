import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CreateBudgetParams {
  client_name: string;
  client_phone: string;
  device_model: string;
  device_type: string;
  service_name: string; // maps to issue
  validity_days: number;
  parts: Array<{
    name: string;
    quality: string; // maps to part_type
    price_cash: number; // in centavos
    price_installment: number; // in centavos
    installments: number;
    warranty_months: number;
  }>;
  services_included: {
    delivery: boolean;
    screen_protector: boolean;
  };
  notes?: string;
}

export async function createBudget(
  supabase: SupabaseClient,
  userId: string,
  params: CreateBudgetParams
) {
  console.log(`[CREATE-BUDGET] Iniciando criação para ${params.client_name}`);

  // 1. Get next sequential number
  // Using maybeSingle to handle case with no budgets yet
  const { data: maxSeq, error: seqError } = await supabase
    .from("budgets")
    .select("sequential_number")
    .eq("owner_id", userId)
    .order("sequential_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seqError) {
    console.error("[CREATE-BUDGET] Erro ao buscar sequencial:", seqError);
    throw new Error("Erro ao gerar número do orçamento");
  }

  const nextSeq = (maxSeq?.sequential_number || 0) + 1;
  console.log(`[CREATE-BUDGET] Próximo sequencial: #${nextSeq}`);

  // 2. Prepare budget data
  // Use the first part's price as the "main" price for the budget record fallback
  const mainPart = params.parts[0];
  
  // Calculate expiry date
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + (params.validity_days || 15));

  const budgetPayload = {
    owner_id: userId,
    client_name: params.client_name,
    client_phone: params.client_phone,
    device_model: params.device_model,
    device_type: params.device_type || "Smartphone",
    issue: params.service_name,
    status: "pending",
    workflow_status: "pending",
    sequential_number: nextSeq,
    valid_until: validUntilDate.toISOString(),
    includes_delivery: params.services_included?.delivery || false,
    includes_screen_protector: params.services_included?.screen_protector || false,
    notes: params.notes || null,
    
    // Setting global prices from first part as fallback (canonical logic)
    // Note: Database expects numeric. We pass centavos.
    // The frontend/utils usually handle the conversion based on magnitude.
    total_price: mainPart ? mainPart.price_cash : 0,
    cash_price: mainPart ? mainPart.price_cash : 0,
    installment_price: mainPart ? mainPart.price_installment : 0,
    installments: mainPart ? mainPart.installments : 0,
    warranty_months: mainPart ? mainPart.warranty_months : 3,
    part_quality: mainPart ? mainPart.quality : null,
    
    // Default fields
    payment_condition: "A Combinar",
    is_paid: false,
    is_delivered: false
  };

  // 3. Insert Budget
  const { data: budget, error: budgetError } = await supabase
    .from("budgets")
    .insert(budgetPayload)
    .select()
    .single();

  if (budgetError) {
    console.error("[CREATE-BUDGET] Erro ao inserir budget:", budgetError);
    throw budgetError;
  }

  console.log(`[CREATE-BUDGET] Budget criado: ${budget.id}`);

  // 4. Insert Parts
  if (params.parts && params.parts.length > 0) {
     const partsPayload = params.parts.map(part => ({
       budget_id: budget.id,
       name: part.name,
       part_type: part.quality,
       quantity: 1,
       // Mapping logic: price is usually cash_price in this system context
       price: part.price_cash,
       cash_price: part.price_cash,
       installment_price: part.price_installment,
       installment_count: part.installments,
       warranty_months: part.warranty_months,
     }));
 
     const { error: partsError } = await supabase
       .from("budget_parts")
       .insert(partsPayload);

    if (partsError) {
      console.error("[CREATE-BUDGET] Erro ao inserir peças:", partsError);
      // Optional: rollback budget? Supabase functions don't support transactions easily without RPC.
      // For now, we assume it works or we leave a partial budget (which is editable).
      throw partsError;
    }
    console.log(`[CREATE-BUDGET] ${params.parts.length} peças inseridas`);
  }

  return {
    id: budget.id,
    sequential_number: nextSeq,
    client_name: budget.client_name,
    device_model: budget.device_model
  };
}
