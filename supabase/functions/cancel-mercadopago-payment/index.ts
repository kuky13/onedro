import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-CANCEL-PAYMENT] ${step}${detailsStr}`);
};

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OneDrip <no-reply@onedrip.com.br>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendCancellationEmail(
  supabaseAdmin: any,
  paymentId: string,
  reason: "user" | "timer" | "other"
) {
  if (!resend) {
    logStep("RESEND_API_KEY não configurado - pulando envio de email");
    return;
  }

  try {
    // Localizar dados da compra a partir do payment_id do Mercado Pago
    const { data: purchaseReg, error: purchaseError } = await supabaseAdmin
      .from("purchase_registrations")
      .select("customer_name, customer_email")
      .eq("mercadopago_payment_id", paymentId)
      .single();

    if (purchaseError || !purchaseReg) {
      logStep("Nenhum registro de compra encontrado para envio de email", { error: purchaseError });
      return;
    }

    const pr: any = purchaseReg;
    const customerName = pr.customer_name || "cliente";
    const customerEmail = pr.customer_email as string | null;

    if (!customerEmail) {
      logStep("Registro de compra sem email - não é possível enviar notificação");
      return;
    }

    let subject: string;
    let description: string;

    if (reason === "timer") {
      subject = "Seu pagamento PIX foi cancelado por tempo excedido";
      description =
        "Seu código PIX expirou após 10 minutos sem confirmação de pagamento. O pagamento foi automaticamente cancelado.";
    } else if (reason === "user") {
      subject = "Você cancelou seu pagamento PIX";
      description =
        "Conforme solicitado, o pagamento PIX foi cancelado e o código gerado anteriormente não é mais válido.";
    } else {
      subject = "Pagamento PIX cancelado";
      description =
        "Seu pagamento PIX foi cancelado. Se você não reconhece esta ação, entre em contato com nosso suporte.";
    }

    await resend.emails.send({
      from: resendFromEmail,
      to: [customerEmail],
      subject,
      html: `
        <h1>Olá, ${customerName}!</h1>
        <p>${description}</p>
        <p>
          Caso queira tentar novamente, você pode gerar um novo pagamento PIX pelo painel do OneDrip.
        </p>
        <p style="margin-top:16px;font-size:12px;color:#666;">
          ID do pagamento Mercado Pago: <strong>${paymentId}</strong>
        </p>
      `,
    });

    logStep("Email de cancelamento PIX enviado com sucesso", { paymentId, reason });
  } catch (error) {
    logStep("Erro ao enviar email de cancelamento PIX", { error });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    const { payment_id, cancel_reason } = await req.json();

    if (!payment_id) {
      throw new Error("payment_id é obrigatório");
    }

    const reason: "user" | "timer" | "other" =
      cancel_reason === "user" || cancel_reason === "timer" ? cancel_reason : "other";

    logStep("Cancelando pagamento no Mercado Pago", { payment_id, reason });

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      }
    );

    const responseBody = await mpResponse.text();

    if (!mpResponse.ok) {
      logStep("Erro ao cancelar pagamento", {
        status: mpResponse.status,
        body: responseBody,
      });
      return new Response(
        JSON.stringify({
          error: `Erro ao cancelar pagamento: ${mpResponse.status}`,
          details: responseBody,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    logStep("Pagamento cancelado com sucesso", { body: responseBody });

    // Enviar email de cancelamento usando dados da compra
    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await sendCancellationEmail(supabaseAdmin, payment_id, reason);
    } catch (emailError) {
      logStep("Erro ao preparar envio de email de cancelamento", { emailError });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO na função de cancelamento", { message: errorMessage });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
