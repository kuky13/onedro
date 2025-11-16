import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MP-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido");

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    // Parse notification
    const notification = await req.json();
    logStep("Notificação parsed", notification);

    const { type, data } = notification;

    // Criar cliente Supabase com service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Processar diferentes tipos de notificação
    if (type === "subscription_preapproval" || type === "preapproval") {
      // Buscar detalhes da assinatura
      const preapprovalId = data.id;
      logStep("Buscando detalhes da assinatura", { preapprovalId });

      const response = await fetch(
        `https://api.mercadopago.com/preapproval/${preapprovalId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar assinatura: ${response.status}`);
      }

      const subscription = await response.json();
      logStep("Assinatura obtida", { status: subscription.status });

      // Atualizar pagamento no banco
      const { error: updateError } = await supabase
        .from("payments")
        .update({
          status: subscription.status === "authorized" ? "completed" : subscription.status,
          completed_at: subscription.status === "authorized" ? new Date().toISOString() : null
        })
        .eq("mercadopago_preapproval_id", preapprovalId);

      if (updateError) {
        logStep("Erro ao atualizar pagamento", { error: updateError });
      }

      // Se aprovado, ativar licença
      if (subscription.status === "authorized") {
        const userId = subscription.metadata?.user_id;
        
        if (userId && userId !== "guest") {
          logStep("Ativando licença", { userId });

          const expiresAt = new Date();
          if (subscription.auto_recurring?.frequency_type === "months") {
            expiresAt.setMonth(expiresAt.getMonth() + subscription.auto_recurring.frequency);
          }

          const { error: licenseError } = await supabase
            .from("licenses")
            .upsert({
              user_id: userId,
              is_active: true,
              activated_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            }, {
              onConflict: "user_id"
            });

          if (licenseError) {
            logStep("Erro ao ativar licença", { error: licenseError });
          } else {
            logStep("Licença ativada com sucesso");
          }
        }
      }
    }

    // Processar pagamento individual (para pagamentos manuais)
    if (type === "payment") {
      const paymentId = data.id;
      logStep("Processando pagamento", { paymentId });

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao buscar pagamento: ${response.status}`);
      }

      const payment = await response.json();
      logStep("Pagamento obtido", { status: payment.status });

      // Atualizar no banco se houver referência externa
      if (payment.external_reference) {
        await supabase
          .from("payments")
          .update({
            status: payment.status === "approved" ? "completed" : payment.status,
            mercadopago_payment_id: payment.id,
            payment_method: payment.payment_method_id,
            completed_at: payment.status === "approved" ? new Date().toISOString() : null
          })
          .eq("user_id", payment.external_reference);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
