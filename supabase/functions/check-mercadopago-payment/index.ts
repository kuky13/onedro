import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MP-CHECK-PAYMENT] ${step}${detailsStr}`);
};

// Função para gerar código de licença único (Formato 13 caracteres)
// Formato: DDDDDDXXXXXXX (6 dígitos para dias + 7 alfanuméricos)
async function generateUniqueLicenseCode(supabase: any, planType: string = 'monthly', daysOverride?: number): Promise<string> {
  const days = typeof daysOverride === 'number' && daysOverride > 0
    ? daysOverride
    : (planType === 'yearly' ? 365 : 30);
  const daysPrefix = days.toString().padStart(6, '0');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  let code = '';
  let isUnique = false;

  while (!isUnique && attempts < 10) {
    let randomSuffix = '';
    for (let i = 0; i < 7; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = daysPrefix + randomSuffix;
    
    // Verificar se já existe
    const { data } = await supabase
      .from('licenses')
      .select('id')
      .eq('code', code)
      .maybeSingle();
      
    if (!data) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Não foi possível gerar um código de licença único após várias tentativas");
  }

  return code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Função iniciada");

    // Extrair dados administrativos do request
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "N/A";
    const userAgent = req.headers.get("user-agent") || "N/A";

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    const { payment_id } = await req.json();
    
    // Configurar headers CORS para permitir qualquer origem
    const responseHeaders = {
       ...corsHeaders,
       "Access-Control-Allow-Origin": "*",
       "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (!payment_id) {
      throw new Error("payment_id é obrigatório");
    }

    logStep("Buscando status do pagamento", { payment_id });

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment_id}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Erro ao buscar pagamento", { status: response.status, error: errorText });
      throw new Error(`Erro ao buscar pagamento: ${response.status}`);
    }

    const payment = await response.json();
    logStep("Pagamento obtido", { status: payment.status });

    // Se aprovado, buscar ou gerar a licença
    let licenseCode = null;
    let purchaseRegistration = null;

    if (payment.status === "approved") {
      logStep("Pagamento aprovado, verificando licença...");
      
      // Criar cliente Supabase
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      // 1. Tentar buscar licença existente
      // Primeiro tenta pelo ID do pagamento do Mercado Pago
      const { data: regData } = await supabase
        .from("purchase_registrations")
        .select("license_code, id, customer_email, customer_name, customer_phone, user_id, plan_type, metadata")
        .eq("mercadopago_payment_id", payment.id.toString())
        .maybeSingle();

      if (regData?.license_code) {
        licenseCode = regData.license_code;
        purchaseRegistration = regData;
        logStep("Licença encontrada em purchase_registrations", { code: licenseCode });
      } else {
        // Se não achou pelo payment_id, tenta pelo metadata
        const purchaseRegId = payment.metadata?.purchase_registration_id;
        if (purchaseRegId) {
            const { data: regDataById } = await supabase
              .from("purchase_registrations")
              .select("license_code, id, customer_email, customer_name, customer_phone, user_id, plan_type, metadata")
            .eq("id", purchaseRegId)
            .maybeSingle();
            
          if (regDataById?.license_code) {
            licenseCode = regDataById.license_code;
            purchaseRegistration = regDataById;
            logStep("Licença encontrada via ID do metadata", { code: licenseCode });
          } else if (regDataById) {
             purchaseRegistration = regDataById;
          }
        }
      }

      // 1.5 Verificar se já existe licença com este payment_id no metadata (Evitar duplicidade)
      if (!licenseCode) {
        const { data: existingLicense } = await supabase
          .from('licenses')
          .select('code, id')
          .contains('metadata', { payment_id: payment.id })
          .maybeSingle();
          
        if (existingLicense) {
          licenseCode = existingLicense.code;
          logStep("Licença encontrada via metadata->payment_id", { code: licenseCode });
          
          // Se tiver purchaseRegistration mas sem link, vincular agora
          if (purchaseRegistration && !purchaseRegistration.license_code) {
             await supabase
              .from("purchase_registrations")
              .update({
                license_code: licenseCode,
                license_id: existingLicense.id,
                status: "completed",
                mercadopago_payment_id: payment.id.toString(),
                updated_at: new Date().toISOString()
              })
              .eq("id", purchaseRegistration.id);
              
             logStep("purchase_registrations vinculado à licença existente");
          }
        }
      }

      // 2. Se não encontrou licença, verificar se precisa renovar ou criar nova
      if (!licenseCode) {
        logStep("Licença não encontrada. Verificando renovação ou criando nova (Fallback)...");
        
        // Dados para a licença
        const userId = payment.metadata?.user_id || purchaseRegistration?.user_id;
        const planType = payment.metadata?.plan_type || purchaseRegistration?.plan_type || "monthly";

        // Buscar dias configurados para o plano na tabela subscription_plans
        let days = 0;
        try {
          const { data: dbPlan } = await supabase
            .from("subscription_plans")
            .select("days")
            .eq("plan_type", planType)
            .maybeSingle();

          days = dbPlan?.days ?? (planType === "yearly" ? 365 : 30);
        } catch (planError) {
          logStep("Erro ao buscar plano em subscription_plans, usando padrão", { error: String(planError) });
          days = planType === "yearly" ? 365 : 30;
        }

        // Determinar user_id para a licença
        const licenseUserId = (userId && userId !== "guest") ? userId : null;
        
        let licenseId = null;
        let isRenewal = false;

        // LÓGICA DE RENOVAÇÃO: Buscar licença existente do usuário (apenas se ativa)
        if (licenseUserId) {
          const { data: existingLicense, error: licenseSearchError } = await supabase
            .from("licenses")
            .select("*")
            .eq("user_id", licenseUserId)
            .eq("is_active", true) // Garantir que só pega licença ativa
            .order("expires_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (licenseSearchError) {
            logStep("Erro ao buscar licença existente no fallback", { error: licenseSearchError });
          }

          if (existingLicense) {
            // RENOVAÇÃO: Licença existente encontrada e ativa
            isRenewal = true;
            licenseId = existingLicense.id;
            licenseCode = existingLicense.code;
            
            logStep("Licença existente encontrada no fallback, renovando", { 
              license_id: licenseId,
              code: licenseCode,
              current_expires_at: existingLicense.expires_at
            });

            // Nova regra "Smart Sum": soma dias restantes + dias comprados a partir de agora
            const now = new Date();
            
            let remainingDays = 0;
            if (existingLicense.expires_at) {
              const currentExpiresAt = new Date(existingLicense.expires_at);
              const diffMs = currentExpiresAt.getTime() - now.getTime();
              if (diffMs > 0) {
                remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              }
            }
            
            const totalDays = remainingDays + days;
            
            const newExpiresAt = new Date(now);
            newExpiresAt.setDate(newExpiresAt.getDate() + totalDays);

            // Se a licença atual ainda for TRIAL, gerar um novo código definitivo
            let updatedCode = existingLicense.code as string | null;
            if (updatedCode && updatedCode.startsWith("TRIAL")) {
              updatedCode = await generateUniqueLicenseCode(supabase, planType, totalDays);
              licenseCode = updatedCode;

              logStep("Convertendo licença TRIAL em código definitivo na renovação (check-mercadopago-payment)", {
                license_id: licenseId,
                old_code: existingLicense.code,
                new_code: updatedCode,
                total_days: totalDays,
              });
            }

            // Atualizar licença existente
            const { error: updateError } = await supabase
              .from("licenses")
              .update({
                ...(updatedCode ? { code: updatedCode } : {}),
                expires_at: newExpiresAt.toISOString(),
                is_active: true,
                updated_at: now.toISOString(),
                metadata: {
                  ...(existingLicense.metadata || {}),
                  last_renewal: now.toISOString(),
                  renewal_payment_id: payment.id,
                  days_added: days,
                  total_renewals: ((existingLicense.metadata as any)?.total_renewals || 0) + 1,
                  ...(updatedCode && existingLicense.code?.startsWith("TRIAL")
                    ? {
                        converted_from_trial: true,
                        previous_trial_code: existingLicense.code,
                      }
                    : {}),
                },
              })
              .eq("id", licenseId);

            if (updateError) {
              logStep("Erro ao renovar licença no fallback", { error: updateError });
              // Continuar para tentar criar nova se renovação falhar
              licenseCode = null;
              licenseId = null;
              isRenewal = false;
            } else {
              logStep("Licença renovada com sucesso no fallback", {
                license_id: licenseId,
                new_expires_at: newExpiresAt.toISOString(),
                days_added: days,
              });
            }
          }
        }

        // Se não encontrou licença existente ou renovação falhou, criar nova
        if (!licenseCode) {
          try {
            licenseCode = await generateUniqueLicenseCode(supabase, planType, days);
            logStep("Novo código gerado (formato 13d)", { code: licenseCode });

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            // Inserir Licença DIRETAMENTE na tabela
            const { data: insertData, error: insertError } = await supabase
              .from("licenses")
              .insert({
                code: licenseCode,
                is_active: true,
                activated_at: licenseUserId ? new Date().toISOString() : null,
                expires_at: expiresAt.toISOString(),
                license_type: "premium",
                user_id: licenseUserId,
                metadata: {
                  origin: "mercadopago_payment",
                  payment_id: payment.id,
                  plan_type: planType,
                  buyer_email: purchaseRegistration?.customer_email || payment.metadata?.customer_email,
                  days_purchased: days,
                  created_via: "direct_insert_check"
                }
              })
              .select("id")
              .single();

            if (insertError) {
              logStep("Erro ao inserir licença diretamente", insertError);
              
              // Tentar recuperar novamente: Talvez tenha falhado porque acabou de ser criada (race condition)
              const { data: retryLicense } = await supabase
                .from('licenses')
                .select('code')
                .contains('metadata', { payment_id: payment.id })
                .maybeSingle();
                
              if (retryLicense) {
                 licenseCode = retryLicense.code;
                 logStep("Recuperado após erro: Licença encontrada", { code: licenseCode });
              } else {
                 licenseCode = null;
                 console.error("FALHA CRÍTICA NA GERAÇÃO DE LICENÇA:", JSON.stringify(insertError));
              }
            } else {
              licenseId = insertData?.id;
              logStep("Licença criada via INSERT direto", { licenseId });
            }
          } catch (genError) {
            logStep("Erro ao gerar/inserir licença", { error: genError });
            licenseCode = null;
          }
        }

        // Atualizar purchase_registrations
        if (purchaseRegistration && licenseId && licenseCode) {
           await supabase
            .from("purchase_registrations")
            .update({
              license_code: licenseCode,
              license_id: licenseId,
              status: "completed",
              mercadopago_payment_id: payment.id.toString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", purchaseRegistration.id);
            
           logStep("purchase_registrations atualizado via Fallback", { is_renewal: isRenewal });
           
           if (!isRenewal) {
             const customerEmail = purchaseRegistration.customer_email || payment.metadata?.customer_email;
             const customerName = purchaseRegistration.customer_name || payment.metadata?.customer_name;
             
             if (customerEmail && licenseCode) {
               try {
                 const { data, error } = await supabase.functions.invoke("send-license-email", {
                   body: {
                     email: customerEmail,
                     name: customerName,
                     licenseCode: licenseCode,
                     planType: planType,
                   },
                 });
 
                 if (error) {
                   logStep("Erro ao chamar send-license-email", { error });
                 } else {
                   logStep("send-license-email chamado com sucesso", { response: data });
                 }
               } catch (invokeError) {
                 logStep("Exceção ao chamar send-license-email", { error: String(invokeError) });
               }
             }
           } else {
             logStep("Renovação detectada no fallback, email não será enviado");
           }
 
            // ⚠️ IMPORTANTE: O recibo é enviado pelo webhook do Mercado Pago (mercadopago-webhook).
            // Esta função é chamada pelo frontend para polling; enviar recibo aqui gera duplicidade.
            // Mantemos apenas a geração/retorno do license_code.
        }
      }
    }

    const status = payment.status === "approved" ? "completed" : payment.status;

    return new Response(
      JSON.stringify({ 
        status: status,
        approved: payment.status === "approved",
        payment_status: payment.status,
        license_code: licenseCode,
        customer_data: purchaseRegistration ? {
          name: purchaseRegistration.customer_name,
          email: purchaseRegistration.customer_email
        } : null
      }),
      {
        headers: { ...responseHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERRO", { message: errorMessage });

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: "error",
        approved: false,
      }),
      {
        headers: { ...corsHeaders, "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
