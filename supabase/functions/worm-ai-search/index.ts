import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAIConfig, callAIProvider, logAIRequest } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, user_id } = await req.json();

    if (!query || !user_id) {
      return new Response(
        JSON.stringify({ error: "query e user_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user's budgets (last 200)
    const { data: budgets, error: dbError } = await supabase
      .from("budgets")
      .select("id, client_name, client_phone, device_model, device_type, total_price, cash_price, installment_price, installments, status, workflow_status, issue, notes, custom_services, part_quality, part_type, warranty_months, sequential_number, created_at, valid_until, is_paid, is_delivered")
      .eq("owner_id", user_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);

    if (dbError) {
      console.error("[WORM-AI-SEARCH] DB error:", dbError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar orçamentos" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!budgets || budgets.length === 0) {
      return new Response(
        JSON.stringify({
          message: "Você ainda não tem orçamentos cadastrados. Crie seu primeiro orçamento para começar!",
          matched_ids: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build a compact summary for the AI
    const budgetSummaries = budgets.map((b, i) => {
      const or = b.sequential_number ? `OR-${String(b.sequential_number).padStart(4, "0")}` : `#${i + 1}`;
      const parts = [
        or,
        b.client_name && `Cliente: ${b.client_name}`,
        b.device_model && `${b.device_type || ""} ${b.device_model}`,
        b.issue && `Problema: ${b.issue}`,
        b.total_price && `R$${b.total_price}`,
        b.status && `Status: ${b.status}`,
        b.workflow_status && `Workflow: ${b.workflow_status}`,
        b.part_quality && `Qualidade: ${b.part_quality}`,
        b.is_paid ? "Pago" : "Não pago",
        b.is_delivered ? "Entregue" : "",
        b.created_at && `Criado: ${new Date(b.created_at).toLocaleDateString("pt-BR")}`,
      ].filter(Boolean);
      return `[${b.id}] ${parts.join(" | ")}`;
    });

    const systemPrompt = `Você é a Drippy, assistente IA do sistema OneDrip, especializada em busca inteligente de orçamentos.

REGRAS:
1. O usuário fará perguntas sobre seus orçamentos. Analise a lista abaixo e retorne os que correspondem.
2. Responda SEMPRE em português brasileiro de forma concisa e amigável.
3. Sua resposta deve ter EXATAMENTE este formato JSON (sem markdown, sem code blocks):
{"message": "sua resposta conversacional aqui", "matched_ids": ["id1", "id2"]}
4. Em "message", descreva brevemente o que encontrou (ex: "Encontrei 3 orçamentos do João...").
5. Em "matched_ids", liste os IDs (UUID) dos orçamentos correspondentes. Se nenhum corresponder, retorne array vazio.
6. Se a busca for vaga, retorne os mais relevantes (máximo 20).
7. Entenda variações: "mais caro" = maior total_price, "pendente" = não pago, "recente" = últimos criados, "OR-0001" = sequential_number.
8. NUNCA invente dados. Use APENAS o que está na lista.

ORÇAMENTOS DO USUÁRIO (${budgets.length} total):
${budgetSummaries.join("\n")}`;

    const config = await getAIConfig(supabase);
    const startTime = Date.now();

    const result = await callAIProvider(config, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const duration = Date.now() - startTime;

    // Log the request
    await logAIRequest(
      {
        provider: config.provider,
        model: config.model,
        source: "worm-ai-search",
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        duration_ms: duration,
        status: "success",
        user_id,
        metadata: { query },
      },
      supabase
    );

    // Parse AI response
    let parsed: { message: string; matched_ids: string[] };
    try {
      // Try to extract JSON from the response
      const content = result.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { message: content, matched_ids: [] };
      }
    } catch {
      parsed = { message: result.content, matched_ids: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WORM-AI-SEARCH] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
