import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-shopify-hmac-sha256, x-shopify-shop-domain, x-shopify-topic',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHOPIFY-WEBHOOK] ${step}${detailsStr}`);
};

async function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));
  
  return hashBase64 === hmacHeader;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const webhookSecret = Deno.env.get("SHOPIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("SHOPIFY_WEBHOOK_SECRET não configurado");
    }

    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
    const topic = req.headers.get("x-shopify-topic");
    const shopDomain = req.headers.get("x-shopify-shop-domain");

    logStep("Headers recebidos", { topic, shopDomain });

    const rawBody = await req.text();
    
    if (!hmacHeader || !(await verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret))) {
      logStep("Falha na verificação HMAC");
      return new Response(JSON.stringify({ error: "Webhook inválido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = JSON.parse(rawBody);
    logStep("Payload validado", { orderId: payload.id });

    if (topic === "orders/create" || topic === "orders/paid") {
      const orderId = payload.id.toString();
      const email = payload.email || payload.customer?.email;
      const totalPrice = parseFloat(payload.total_price);
      const lineItems = payload.line_items || [];

      logStep("Processando pedido", { orderId, email, totalPrice });

      if (!email) {
        throw new Error("Email do cliente não encontrado no pedido");
      }

      // Buscar usuário pelo email
      const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
      if (userError) throw userError;

      const user = userData.users.find(u => u.email === email);
      if (!user) {
        logStep("Usuário não encontrado", { email });
        throw new Error(`Usuário não encontrado para o email: ${email}`);
      }

      logStep("Usuário encontrado", { userId: user.id });

      // Determinar tipo de plano
      let planType = 'monthly';
      for (const item of lineItems) {
        const sku = item.sku || '';
        if (sku.includes('YEARLY')) {
          planType = 'yearly';
          break;
        }
      }

      // Criar ou atualizar pagamento
      const { error: paymentError } = await supabaseClient
        .from('payments')
        .upsert({
          user_id: user.id,
          shopify_order_id: orderId,
          shopify_checkout_id: payload.checkout_id?.toString(),
          amount: Math.round(totalPrice * 100),
          currency: payload.currency || 'BRL',
          status: topic === "orders/paid" ? 'completed' : 'processing',
          plan_type: planType,
          payment_method: 'shopify',
          completed_at: topic === "orders/paid" ? new Date().toISOString() : null,
          metadata: {
            order_number: payload.order_number,
            line_items: lineItems.map((item: any) => ({
              name: item.name,
              sku: item.sku,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }, {
          onConflict: 'shopify_order_id'
        });

      if (paymentError) {
        logStep("Erro ao salvar pagamento", { error: paymentError });
        throw paymentError;
      }

      logStep("Pagamento salvo com sucesso");

      // Se pago, ativar licença
      if (topic === "orders/paid") {
        const daysToAdd = planType === 'yearly' ? 365 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysToAdd);

        // Buscar ou criar licença
        const { data: existingLicense } = await supabaseClient
          .from('licenses')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (existingLicense) {
          // Estender licença existente
          const newExpiresAt = new Date(existingLicense.expires_at);
          newExpiresAt.setDate(newExpiresAt.getDate() + daysToAdd);

          const { error: updateError } = await supabaseClient
            .from('licenses')
            .update({
              expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingLicense.id);

          if (updateError) throw updateError;
          logStep("Licença estendida", { licenseId: existingLicense.id, newExpiry: newExpiresAt });
        } else {
          // Criar nova licença
          const licenseCode = `SHOP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
          
          const { error: createError } = await supabaseClient
            .from('licenses')
            .insert({
              user_id: user.id,
              code: licenseCode,
              is_active: true,
              activated_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              license_type: 'standard',
              metadata: {
                source: 'shopify',
                order_id: orderId,
                plan_type: planType
              }
            });

          if (createError) throw createError;
          logStep("Nova licença criada", { code: licenseCode, expiry: expiresAt });
        }
      }

      return new Response(JSON.stringify({ success: true, message: "Webhook processado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (topic === "orders/cancelled") {
      const orderId = payload.id.toString();
      
      // Atualizar status do pagamento
      const { error: updateError } = await supabaseClient
        .from('payments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('shopify_order_id', orderId);

      if (updateError) throw updateError;
      logStep("Pedido cancelado", { orderId });

      return new Response(JSON.stringify({ success: true, message: "Cancelamento processado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: "Tópico não suportado" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO no webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
