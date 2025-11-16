import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper para logging detalhado
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MP-CHECKOUT] ${step}${detailsStr}`);
};

// Validar variáveis de ambiente
function validateEnvironment() {
  const requiredVars = {
    SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
    SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY"),
    MERCADOPAGO_ACCESS_TOKEN: Deno.env.get("MERCADOPAGO_ACCESS_TOKEN"),
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente faltando: ${missing.join(", ")}`);
  }

  return requiredVars as Record<keyof typeof requiredVars, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    // Validar ambiente
    const env = validateEnvironment();
    logStep("Ambiente validado");

    // Parse request body
    const { planId, planType, isAuthenticated } = await req.json();
    logStep("Request body parsed", { planId, planType, isAuthenticated });

    if (!planId || !planType) {
      throw new Error("planId e planType são obrigatórios");
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

    // Buscar usuário autenticado (opcional)
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (isAuthenticated) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        
        if (!userError && userData?.user) {
          userEmail = userData.user.email;
          userId = userData.user.id;
          logStep("Usuário autenticado", { userId, email: userEmail });
        }
      }
    }

    // Definir planos (baseado em stripe-products.ts)
    const plans: Record<string, {
      title: string;
      description: string;
      unit_price: number;
      auto_recurring: {
        frequency: number;
        frequency_type: "months" | "days";
        transaction_amount: number;
        currency_id: string;
      };
    }> = {
      professional_monthly: {
        title: "Plano Profissional Mensal",
        description: "Acesso completo ao sistema de gestão OneDrip",
        unit_price: 35.85,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 35.85,
          currency_id: "BRL"
        }
      },
      professional_yearly: {
        title: "Plano Profissional Anual",
        description: "Acesso completo ao sistema de gestão OneDrip (12 meses)",
        unit_price: 315.25,
        auto_recurring: {
          frequency: 12,
          frequency_type: "months",
          transaction_amount: 315.25,
          currency_id: "BRL"
        }
      }
    };

    const selectedPlan = plans[planId];
    if (!selectedPlan) {
      throw new Error(`Plano inválido: ${planId}`);
    }

    logStep("Plano selecionado", selectedPlan);

    // Criar preferência de assinatura no Mercado Pago
    const origin = req.headers.get("origin") || "https://onedrip.com.br";
    
    const preferenceData = {
      reason: selectedPlan.title,
      payer_email: userEmail,
      back_url: `${origin}/purchase-success`,
      auto_recurring: selectedPlan.auto_recurring,
      external_reference: userId || "guest",
      metadata: {
        user_id: userId || "guest",
        plan_type: planType,
        plan_id: planId
      }
    };

    logStep("Criando assinatura no Mercado Pago", { preferenceData });

    // Chamar API do Mercado Pago (Preapproval - Assinatura)
    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      logStep("Erro na API do Mercado Pago", { status: mpResponse.status, error: errorText });
      throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
    }

    const mpData = await mpResponse.json();
    logStep("Assinatura criada com sucesso", { id: mpData.id });

    // Registrar pagamento pendente no banco (se usuário autenticado)
    if (userId) {
      const { error: insertError } = await supabaseClient
        .from("payments")
        .insert({
          user_id: userId,
          mercadopago_preapproval_id: mpData.id,
          amount: selectedPlan.unit_price * 100, // Converter para centavos
          currency: "BRL",
          status: "pending",
          plan_type: planType,
        });

      if (insertError) {
        logStep("Aviso: Erro ao registrar pagamento no banco", { error: insertError });
      } else {
        logStep("Pagamento registrado no banco");
      }
    }

    // Retornar URL de checkout
    const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;
    
    if (!checkoutUrl) {
      throw new Error("URL de checkout não foi retornada pelo Mercado Pago");
    }

    logStep("URL de checkout gerada", { url: checkoutUrl });

    return new Response(
      JSON.stringify({ url: checkoutUrl, preapproval_id: mpData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: "Verifique os logs da função para mais informações"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
