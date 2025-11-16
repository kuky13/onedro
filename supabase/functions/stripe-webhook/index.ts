import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Webhook signature ou secret ausente", { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        // Atualizar pagamento
        await supabaseAdmin
          .from("payments")
          .update({
            stripe_payment_intent_id: session.payment_intent,
            status: "succeeded",
            payment_method: session.payment_method_types?.[0],
            metadata: session.metadata,
          })
          .eq("stripe_session_id", session.id);

        // Ativar licença do usuário
        const userId = session.metadata?.user_id;
        if (userId) {
          const { data: license } = await supabaseAdmin
            .from("licenses")
            .select("*")
            .eq("user_id", userId)
            .eq("is_active", true)
            .single();

          if (license) {
            // Renovar licença existente
            const newExpiresAt = new Date();
            newExpiresAt.setMonth(
              newExpiresAt.getMonth() + 
              (session.metadata?.plan_type === "yearly" ? 12 : 1)
            );

            await supabaseAdmin
              .from("licenses")
              .update({
                expires_at: newExpiresAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", license.id);
          } else {
            // Criar nova licença
            const expiresAt = new Date();
            expiresAt.setMonth(
              expiresAt.getMonth() + 
              (session.metadata?.plan_type === "yearly" ? 12 : 1)
            );

            await supabaseAdmin.from("licenses").insert({
              user_id: userId,
              is_active: true,
              expires_at: expiresAt.toISOString(),
              license_type: "professional",
            });
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        
        await supabaseAdmin
          .from("payments")
          .update({
            status: "succeeded",
            metadata: paymentIntent.metadata,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        
        await supabaseAdmin
          .from("payments")
          .update({
            status: "failed",
          })
          .eq("stripe_payment_intent_id", paymentIntent.id);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});