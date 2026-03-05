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
    logStep("Função iniciada", { 
      method: req.method, 
      url: req.url,
      hasBody: !!req.body 
    });

    // Validar ambiente
    let env;
    try {
      env = validateEnvironment();
      logStep("Ambiente validado", { 
        hasUrl: !!env.SUPABASE_URL, 
        hasAnonKey: !!env.SUPABASE_ANON_KEY, 
        hasToken: !!env.MERCADOPAGO_ACCESS_TOKEN,
        tokenPrefix: env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 15) || "não configurado",
        tokenLength: env.MERCADOPAGO_ACCESS_TOKEN?.length || 0
      });
    } catch (envError) {
      const envErrorMsg = envError instanceof Error ? envError.message : String(envError);
      logStep("ERRO na validação de ambiente", { error: envErrorMsg });
      return new Response(
        JSON.stringify({ 
          error: envErrorMsg,
          details: "Configure as variáveis de ambiente no Supabase Dashboard > Settings > Edge Functions > Secrets"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    // Capturar informações de IP e dispositivo do cliente
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress =
      forwardedFor?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = req.headers.get("user-agent") || "unknown";
    const deviceInfo = {
      ip_address: ipAddress,
      user_agent: userAgent,
      origin: req.headers.get("origin") || null,
      referer: req.headers.get("referer") || null,
    };

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      logStep("Request body parsed", requestBody);
    } catch (parseError) {
      const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      logStep("ERRO ao fazer parse do body", { error: parseErrorMsg });
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar requisição",
          details: parseErrorMsg
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { planId, planType, isAuthenticated, paymentMethod, customerName, customerEmail, customerPhone, purchaseRegistrationId } = requestBody;
    logStep("Dados extraídos do body", { planId, planType, isAuthenticated, paymentMethod, hasCustomerData: !!(customerName && customerEmail && customerPhone), hasPurchaseRegId: !!purchaseRegistrationId });

    if (!planId || !planType) {
      throw new Error("planId e planType são obrigatórios");
    }

    const usePix = paymentMethod === "pix";

    // Validar dados de contato (obrigatórios para todos os métodos agora)
    if (!customerName || !customerEmail || !customerPhone) {
      throw new Error("Nome, email e telefone são obrigatórios para processar o pagamento");
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    // Criar cliente com service role para inserir em purchase_registrations
    const supabaseAdmin = createClient(
      env.SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // AUTENTICAÇÃO OBRIGATÓRIA - Buscar usuário autenticado
    if (!isAuthenticated) {
      throw new Error("Autenticação obrigatória: você precisa estar logado para realizar uma compra");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Token de autenticação não fornecido. Faça login e tente novamente.");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      throw new Error(`Erro de autenticação: ${userError?.message || "Usuário não encontrado"}`);
    }

    const userEmail = userData.user.email;
    const userId = userData.user.id;
    
    if (!userId) {
      throw new Error("ID do usuário não encontrado. Faça login novamente.");
    }

    logStep("Usuário autenticado", { userId, email: userEmail });

    // Buscar planos do banco de dados para segurança
    const { data: dbPlan, error: dbPlanError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("plan_type", planType)
      .eq("active", true)
      .single();

    if (dbPlanError || !dbPlan) {
      logStep("Erro ao buscar plano do banco", { error: dbPlanError });
      // Fallback seguro ou erro
      throw new Error(`Plano não encontrado ou inativo: ${planType}`);
    }

    const selectedPlan = {
      title: dbPlan.name,
      description: dbPlan.description || `Plano ${dbPlan.name}`,
      unit_price: Number(dbPlan.price)
    };

    logStep("Plano selecionado (DB)", selectedPlan);

    const origin = req.headers.get("origin") || "https://onedrip.com.br";
    const supabaseUrl = env.SUPABASE_URL;
    const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`;

    if (usePix) {
      // Criar pagamento PIX único
      logStep("Criando pagamento PIX", { plan: selectedPlan });

      // Se purchaseRegistrationId já foi fornecido (salvo no frontend), usar ele
      // Caso contrário, criar novo registro (compatibilidade com código antigo)
      let finalPurchaseRegistrationId: string | null = purchaseRegistrationId || null;
      
      if (!finalPurchaseRegistrationId) {
        // Criar novo registro se não foi fornecido
        try {
          const { data: purchaseReg, error: purchaseRegError } = await supabaseAdmin
            .from("purchase_registrations")
            .insert({
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              plan_type: planType,
              plan_id: planId,
              amount: selectedPlan.unit_price,
              currency: "BRL",
              payment_method: "pix",
              status: "pending",
              user_id: userId, // Sempre definido agora que auth é obrigatória
              metadata: {
                user_id: userId,
                plan_type: planType,
                plan_id: planId,
                device_info: deviceInfo,
              }
            })
            .select("id")
            .single();

          if (purchaseRegError) {
            logStep("Erro ao salvar purchase_registration", { error: purchaseRegError });
            throw new Error(`Erro ao salvar dados de compra: ${purchaseRegError.message}`);
          }

          finalPurchaseRegistrationId = purchaseReg?.id || null;
          logStep("Purchase registration criado", { id: finalPurchaseRegistrationId });
        } catch (error) {
          logStep("ERRO ao criar purchase_registration", { error });
          throw error;
        }
      } else {
        logStep("Usando purchase_registration existente", { id: finalPurchaseRegistrationId });
      }

      const expirationDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos a partir de agora

      const pixPaymentData = {
        transaction_amount: selectedPlan.unit_price, // API aceita em reais (não centavos)
        description: selectedPlan.title,
        payment_method_id: "pix",
        payer: {
          email: customerEmail || userEmail || "guest@onedrip.com.br",
        },
        external_reference: userId, // Sempre definido agora que auth é obrigatória
        metadata: {
          user_id: userId || "guest",
          plan_type: planType,
          plan_id: planId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          purchase_registration_id: finalPurchaseRegistrationId,
          device_info: deviceInfo,
        },
        notification_url: webhookUrl,
        date_of_expiration: expirationDate.toISOString(),
      };

      logStep("Dados do pagamento PIX preparados", { 
        amount: pixPaymentData.transaction_amount,
        hasToken: !!env.MERCADOPAGO_ACCESS_TOKEN,
        tokenLength: env.MERCADOPAGO_ACCESS_TOKEN?.length || 0,
        tokenPrefix: env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 15) || "não configurado",
        paymentDataKeys: Object.keys(pixPaymentData)
      });

      logStep("Chamando API do Mercado Pago...", { 
        url: "https://api.mercadopago.com/v1/payments",
        hasAuthHeader: !!env.MERCADOPAGO_ACCESS_TOKEN
      });

      // Gerar chave de idempotência única
      const idempotencyKey = crypto.randomUUID();
      
      let mpResponse;
      try {
        mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify(pixPaymentData)
        });
        logStep("Resposta do Mercado Pago recebida", { 
          status: mpResponse.status, 
          ok: mpResponse.ok, 
          statusText: mpResponse.statusText 
        });
      } catch (fetchError) {
        const fetchErrorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        logStep("ERRO ao fazer fetch para API do Mercado Pago", { error: fetchErrorMsg });
        throw new Error(`Erro de rede ao chamar Mercado Pago: ${fetchErrorMsg}`);
      }

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        logStep("Erro na API do Mercado Pago (PIX)", { 
          status: mpResponse.status, 
          statusText: mpResponse.statusText,
          error: errorText,
          errorLength: errorText.length
        });
        throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
      }

      let mpData;
      try {
        mpData = await mpResponse.json();
        logStep("Pagamento PIX criado com sucesso", { 
          id: mpData.id, 
          status: mpData.status,
          hasQrCode: !!mpData.point_of_interaction?.transaction_data?.qr_code,
          hasQrCodeBase64: !!mpData.point_of_interaction?.transaction_data?.qr_code_base64,
          pointOfInteraction: mpData.point_of_interaction ? "existe" : "não existe"
        });
      } catch (jsonError) {
        const jsonErrorMsg = jsonError instanceof Error ? jsonError.message : String(jsonError);
        logStep("ERRO ao fazer parse da resposta JSON do Mercado Pago", { error: jsonErrorMsg });
        throw new Error(`Erro ao processar resposta do Mercado Pago: ${jsonErrorMsg}`);
      }

      // Extrair dados do QR Code
      const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || "";
      const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";

      if (!qrCode) {
        throw new Error("QR Code não foi retornado pelo Mercado Pago");
      }

      // Atualizar purchase_registrations com o ID do pagamento do Mercado Pago
      if (finalPurchaseRegistrationId) {
        const { error: updateError } = await supabaseAdmin
          .from("purchase_registrations")
          .update({
            mercadopago_payment_id: mpData.id.toString(),
          })
          .eq("id", finalPurchaseRegistrationId);

        if (updateError) {
          logStep("Aviso: Erro ao atualizar purchase_registration com payment_id", { error: updateError });
        } else {
          logStep("Purchase registration atualizado com payment_id");
        }
      }

      // Registrar pagamento pendente no banco (se usuário autenticado)
      if (userId) {
        const { data: paymentData, error: insertError } = await supabaseAdmin
          .from("payments")
          .insert({
            user_id: userId,
            mercadopago_payment_id: mpData.id.toString(),
            amount: Math.round(selectedPlan.unit_price * 100), // Converter para centavos
            currency: "BRL",
            status: "pending",
            plan_type: planType,
            payment_method: "pix",
            metadata: {
              plan_id: planId,
              plan_type: planType,
              purchase_registration_id: finalPurchaseRegistrationId,
            }
          })
          .select("id")
          .single();

        if (insertError) {
          logStep("Aviso: Erro ao registrar pagamento no banco", { error: insertError });
        } else {
          logStep("Pagamento registrado no banco");
          
          // Atualizar purchase_registrations com payment_id
          if (finalPurchaseRegistrationId && paymentData?.id) {
            await supabaseAdmin
              .from("purchase_registrations")
              .update({ payment_id: paymentData.id })
              .eq("id", finalPurchaseRegistrationId);
          }
        }
      }

      return new Response(
        JSON.stringify({
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          payment_id: mpData.id.toString(),
          ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      // Criar checkout preference para redirecionamento
      logStep("Criando checkout preference", { plan: selectedPlan });

      // Se purchaseRegistrationId já foi fornecido (salvo no frontend), usar ele
      // Caso contrário, criar novo registro
      let finalPurchaseRegistrationId: string | null = purchaseRegistrationId || null;
      
      if (!finalPurchaseRegistrationId) {
        // Criar novo registro se não foi fornecido
        try {
          const { data: purchaseReg, error: purchaseRegError } = await supabaseAdmin
            .from("purchase_registrations")
            .insert({
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              plan_type: planType,
              plan_id: planId,
              amount: selectedPlan.unit_price,
              currency: "BRL",
              payment_method: "redirect",
              status: "pending",
              user_id: userId, // Sempre definido agora que auth é obrigatória
              metadata: {
                user_id: userId,
                plan_type: planType,
                plan_id: planId,
                device_info: deviceInfo,
              }
            })
            .select("id")
            .single();

          if (purchaseRegError) {
            logStep("Erro ao salvar purchase_registration", { error: purchaseRegError });
            throw new Error(`Erro ao salvar dados de compra: ${purchaseRegError.message}`);
          }

          finalPurchaseRegistrationId = purchaseReg?.id || null;
          logStep("Purchase registration criado", { id: finalPurchaseRegistrationId });
        } catch (error) {
          logStep("ERRO ao criar purchase_registration", { error });
          throw error;
        }
      } else {
        logStep("Usando purchase_registration existente", { id: finalPurchaseRegistrationId });
      }

      const preferenceData = {
        items: [
          {
            title: selectedPlan.title,
            description: selectedPlan.description,
            quantity: 1,
            unit_price: selectedPlan.unit_price,
            currency_id: "BRL",
          }
        ],
        payer: {
          email: customerEmail || userEmail || "guest@onedrip.com.br",
        },
        back_urls: {
          success: `${origin}/purchase-success`,
          failure: `${origin}/plans`,
          pending: `${origin}/purchase-success`,
        },
        auto_return: "approved",
        external_reference: userId, // Sempre definido agora que auth é obrigatória
        metadata: {
          user_id: userId || "guest",
          plan_type: planType,
          plan_id: planId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          purchase_registration_id: finalPurchaseRegistrationId,
          device_info: deviceInfo,
        },
        notification_url: webhookUrl,
      };

      const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(preferenceData)
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        logStep("Erro na API do Mercado Pago (Checkout)", { status: mpResponse.status, error: errorText });
        throw new Error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
      }

      const mpData = await mpResponse.json();
      logStep("Checkout preference criada com sucesso", { id: mpData.id });

      // Registrar pagamento pendente no banco (se usuário autenticado)
      if (userId) {
        const { data: paymentRecord, error: insertError } = await supabaseClient
          .from("payments")
          .insert({
            user_id: userId,
            amount: Math.round(selectedPlan.unit_price * 100), // Converter para centavos
            currency: "BRL",
            status: "pending",
            plan_type: planType,
            metadata: {
              preference_id: mpData.id,
              plan_id: planId,
              plan_type: planType,
            }
          })
          .select("id")
          .single();

        if (insertError) {
          logStep("Aviso: Erro ao registrar pagamento no banco", { error: insertError });
        } else {
          logStep("Pagamento registrado no banco");
          
          // Atualizar purchase_registrations com payment_id
          if (finalPurchaseRegistrationId && paymentRecord?.id) {
            await supabaseAdmin
              .from("purchase_registrations")
              .update({ payment_id: paymentRecord.id })
              .eq("id", finalPurchaseRegistrationId);
          }
        }
      }

      // Retornar URL de checkout
      const checkoutUrl = mpData.init_point || mpData.sandbox_init_point;
      
      if (!checkoutUrl) {
        throw new Error("URL de checkout não foi retornada pelo Mercado Pago");
      }

      logStep("URL de checkout gerada", { url: checkoutUrl });

      return new Response(
        JSON.stringify({ url: checkoutUrl, preference_id: mpData.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorType = error?.constructor?.name || "Unknown";
    
    // Log detalhado do erro
    logStep("ERRO GERAL CAPTURADO", { 
      message: errorMessage,
      stack: errorStack,
      type: errorType,
      errorObject: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error)
    });

    // Retornar erro detalhado para facilitar debug
    const errorResponse = { 
      error: errorMessage,
      errorType: errorType,
      details: "Verifique os logs da função no Supabase Dashboard para mais informações",
      stack: errorStack ? errorStack.substring(0, 1000) : undefined, // Aumentar limite do stack
      timestamp: new Date().toISOString()
    };

    logStep("Retornando resposta de erro", { 
      statusCode: 500,
      errorResponse: JSON.stringify(errorResponse).substring(0, 500)
    });

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}).catch((startupError) => {
  // Capturar erros na inicialização da função
  console.error("[MP-CHECKOUT] ERRO CRÍTICO na inicialização:", startupError);
  return new Response(
    JSON.stringify({ 
      error: "Erro crítico na inicialização da função",
      details: startupError instanceof Error ? startupError.message : String(startupError),
      timestamp: new Date().toISOString()
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    }
  );
});
