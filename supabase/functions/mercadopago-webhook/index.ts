import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-WEBHOOK] ${step}${detailsStr}`);
};

function calculateSmartExpiration(currentExpiresAt: string | null, daysToAdd: number, now: Date): string {
  let remainingDays = 0;

  if (currentExpiresAt) {
    const current = new Date(currentExpiresAt);
    const diffMs = current.getTime() - now.getTime();
    if (diffMs > 0) {
      remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  const safeDaysToAdd = daysToAdd > 0 ? daysToAdd : 1;
  const totalDays = remainingDays + safeDaysToAdd;

  const newExpiresAt = new Date(now);
  newExpiresAt.setDate(newExpiresAt.getDate() + totalDays);

  return newExpiresAt.toISOString();
}

// Função para gerar código de licença único (Formato 13 caracteres)
// Formato: DDDDDDXXXXXXX (6 dígitos para dias + 7 alfanuméricos)
async function generateUniqueLicenseCode(
  supabase: any,
  planType: string = "monthly",
  daysOverride?: number,
): Promise<string> {
  const baseDays = planType === "yearly" ? 365 : 30;
  const days = typeof daysOverride === "number" && daysOverride > 0 ? daysOverride : baseDays;
  const daysPrefix = days.toString().padStart(6, "0");

  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let attempts = 0;
  let code = "";
  let isUnique = false;

  while (!isUnique && attempts < 10) {
    let randomSuffix = "";
    for (let i = 0; i < 7; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = daysPrefix + randomSuffix;

    // Verificar se já existe
    const { data } = await supabase.from("licenses").select("id").eq("code", code).maybeSingle();

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

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "OneDrip <onboarding@resend.dev>";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function sendAdminPaymentNotification(params: {
  adminEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  planType: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string;
  paidAt: string;
  paymentIdMp: string;
  paymentIdInternal: string | null;
  purchaseRegistrationId: string | null;
  licenseId: string | null;
  licenseCode: string | null;
  licenseExpiresAt: string | null;
  isRenewal: boolean;
  deviceInfo?: {
    ip_address?: string;
    user_agent?: string;
    origin?: string | null;
    referer?: string | null;
  } | null;
}) {
  if (!resend) {
    logStep("RESEND_API_KEY não configurado - pulando email de admin");
    return;
  }

  logStep("Iniciando envio de email para admin", { adminEmail: params.adminEmail });

  const {
    adminEmail,
    customerName,
    customerEmail,
    customerPhone,
    planType,
    amount,
    currency,
    paymentStatus,
    paymentMethod,
    paidAt,
    paymentIdMp,
    paymentIdInternal,
    purchaseRegistrationId,
    licenseId,
    licenseCode,
    licenseExpiresAt,
    isRenewal,
    deviceInfo,
  } = params;

  const deviceBlock = deviceInfo
    ? `
      <p style="margin:4px 0;font-size:13px;">
        <strong>IP:</strong> ${deviceInfo.ip_address || "desconhecido"}
      </p>
      <p style="margin:4px 0;font-size:13px;">
        <strong>User-Agent:</strong> ${deviceInfo.user_agent || "desconhecido"}
      </p>
      <p style="margin:4px 0;font-size:13px;">
        <strong>Origin:</strong> ${deviceInfo.origin || "—"}
      </p>
      <p style="margin:4px 0;font-size:13px;">
        <strong>Referer:</strong> ${deviceInfo.referer || "—"}
      </p>
    `
    : `<p style="margin:4px 0;font-size:13px;">Dados de dispositivo não disponíveis.</p>`;

  const licenseBlock = `
    <p style="margin:4px 0;font-size:13px;">
      <strong>Código da licença:</strong> ${licenseCode || "—"}
    </p>
    <p style="margin:4px 0;font-size:13px;">
      <strong>ID da licença:</strong> ${licenseId || "—"}
    </p>
    <p style="margin:4px 0;font-size:13px;">
      <strong>Validade:</strong> ${licenseExpiresAt || "—"}
    </p>
    <p style="margin:4px 0;font-size:13px;">
      <strong>Tipo:</strong> ${isRenewal ? "RENOVAÇÃO" : "NOVA LICENÇA"}
    </p>
  `;

  const html = `
    <h1 style="font-size:18px;margin-bottom:8px;">Novo pagamento aprovado (PIX)</h1>
    <p style="font-size:13px;margin:0 0 16px 0;">
      Um pagamento foi aprovado e a licença foi processada automaticamente.
    </p>

    <h2 style="font-size:15px;margin:12px 0 6px 0;">Dados do Cliente</h2>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
      <p style="margin:4px 0;font-size:13px;"><strong>Nome:</strong> ${customerName}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Email:</strong> ${customerEmail}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Telefone:</strong> ${customerPhone || "—"}</p>
    </div>

    <h2 style="font-size:15px;margin:12px 0 6px 0;">Dados da Compra</h2>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
      <p style="margin:4px 0;font-size:13px;"><strong>Plano:</strong> ${planType}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Valor:</strong> ${currency} ${amount
        .toFixed(2)
        .replace(".", ",")}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Status:</strong> ${paymentStatus}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Método:</strong> ${paymentMethod}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>Pago em:</strong> ${paidAt}</p>
    </div>

    <h2 style="font-size:15px;margin:12px 0 6px 0;">IDS Internos</h2>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
      <p style="margin:4px 0;font-size:13px;"><strong>ID Mercado Pago:</strong> ${paymentIdMp}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>ID interno (payments):</strong> ${paymentIdInternal || "—"}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>ID purchase_registration:</strong> ${purchaseRegistrationId || "—"}</p>
      <p style="margin:4px 0;font-size:13px;"><strong>ID licença:</strong> ${licenseId || "—"}</p>
    </div>

    <h2 style="font-size:15px;margin:12px 0 6px 0;">Licença</h2>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
      ${licenseBlock}
    </div>

    <h2 style="font-size:15px;margin:12px 0 6px 0;">Dispositivo / IP</h2>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;">
      ${deviceBlock}
    </div>
  `;

  await resend.emails.send({
    from: resendFromEmail,
    to: [adminEmail],
    subject: `Pagamento aprovado - ${customerName} (${amount.toFixed(2).replace(".", ",")} ${currency})`,
    html,
  });

  console.log("[MP-WEBHOOK] Email de notificação de pagamento para admin enviado.");
}

async function sendWhatsAppNotification(params: { phone: string; message: string; instanceName?: string }) {
  // ✅ WAHA (provedor padrão)
  const wahaBaseUrl = Deno.env.get("WAHA_BASE_URL") || Deno.env.get("WAHA_URL") || "https://waha.kuky.help";
  const wahaApiKey = Deno.env.get("WAHA_API_KEY");
  // Aqui reutilizamos `evolution_instance_name` do painel como "session" do WAHA (compatibilidade)
  const session =
    (typeof params.instanceName === "string" && params.instanceName.trim() ? params.instanceName.trim() : "") ||
    Deno.env.get("WAHA_SESSION") ||
    "default";

  if (!wahaApiKey) {
    console.log("[MP-WEBHOOK] WAHA_API_KEY ausente - pulando notificação WhatsApp");
    return;
  }

  const buildChatCandidates = (digitsWithCountry: string) => {
    const candidates: string[] = [];
    // WAHA costuma usar @c.us, mas alguns ambientes aceitam @s.whatsapp.net
    candidates.push(`${digitsWithCountry}@c.us`);
    candidates.push(`${digitsWithCountry}@s.whatsapp.net`);
    candidates.push(digitsWithCountry);
    return Array.from(new Set(candidates.filter(Boolean)));
  };

  try {
    let cleanPhone = params.phone.replace(/\D/g, "");

    // Garantir prefixo 55 para números brasileiros (10 ou 11 dígitos) que não tenham o DDI
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      if (!cleanPhone.startsWith("55")) {
        cleanPhone = "55" + cleanPhone;
      }
    }

    // Se já vier com @ (grupo, jid etc), tentamos do jeito que está também
    const candidates = cleanPhone.includes("@") ? [cleanPhone] : buildChatCandidates(cleanPhone);

    for (const chatId of candidates) {
      const url = `${wahaBaseUrl.replace(/\/+$/, "")}/api/sendText?session=${encodeURIComponent(session)}`;

      console.log(`[MP-WEBHOOK] Tentando enviar WhatsApp via WAHA - {"chatId":"${chatId}","session":"${session}"}`);

      // Algumas versões do WAHA exigem `session` também no body
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": wahaApiKey,
        },
        body: JSON.stringify({ session, chatId, text: params.message }),
      });

      if (response.ok) {
        console.log(`[MP-WEBHOOK] WhatsApp enviado com sucesso via WAHA - {"chatId":"${chatId}"}`);
        return;
      }

      const errorText = await response.text();
      console.error(
        `[MP-WEBHOOK] Falha ao enviar WhatsApp via WAHA (${response.status}) - {"chatId":"${chatId}","body":${JSON.stringify(errorText)}}`,
      );
    }
  } catch (error) {
    console.error("[MP-WEBHOOK] Exceção ao enviar WhatsApp:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook recebido");

    // Extrair dados administrativos do request
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "N/A";
    const userAgent = req.headers.get("user-agent") || "N/A";

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    // Parse notification
    const notification = await req.json();
    logStep("Notificação parsed", notification);

    const { type, data } = notification;

    // Criar cliente Supabase com service role
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // Processar diferentes tipos de notificação
    if (type === "subscription_preapproval" || type === "preapproval") {
      // Buscar detalhes da assinatura
      const preapprovalId = data.id;
      logStep("Buscando detalhes da assinatura", { preapprovalId });

      const response = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

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
          completed_at: subscription.status === "authorized" ? new Date().toISOString() : null,
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

          const { error: licenseError } = await supabase.from("licenses").upsert(
            {
              user_id: userId,
              is_active: true,
              activated_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
            },
            {
              onConflict: "user_id",
            },
          );

          if (licenseError) {
            logStep("Erro ao ativar licença", { error: licenseError });
          } else {
            logStep("Licença ativada com sucesso");
          }
        }
      }
    }

    // Processar pagamento individual (PIX, cartão, etc.)
    if (type === "payment") {
      const paymentId = data.id;
      logStep("Processando pagamento", { paymentId });

      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pagamento: ${response.status}`);
      }

      const payment = await response.json();
      logStep("Pagamento obtido", { status: payment.status, payment_id: payment.id });

      // Buscar pagamento no banco pelo ID do Mercado Pago
      const { data: paymentRecord, error: fetchError } = await supabase
        .from("payments")
        .select("*")
        .eq("mercadopago_payment_id", payment.id.toString())
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = not found
        logStep("Erro ao buscar pagamento no banco", { error: fetchError });
      }

      // Atualizar ou criar registro de pagamento
      const paymentStatus = payment.status === "approved" ? "completed" : payment.status;
      const updateData: any = {
        status: paymentStatus,
        mercadopago_payment_id: payment.id.toString(),
        payment_method: payment.payment_method_id || "pix",
        completed_at: payment.status === "approved" ? new Date().toISOString() : null,
      };

      if (paymentRecord) {
        // Atualizar pagamento existente
        const { error: updateError } = await supabase
          .from("payments")
          .update(updateData)
          .eq("mercadopago_payment_id", payment.id.toString());

        if (updateError) {
          logStep("Erro ao atualizar pagamento", { error: updateError });
        } else {
          logStep("Pagamento atualizado no banco");
        }
      } else if (payment.external_reference && payment.external_reference.startsWith("guest_") === false) {
        // Criar novo registro se não existir e tiver referência de usuário
        const { error: insertError } = await supabase.from("payments").insert({
          user_id: payment.metadata?.user_id || payment.external_reference,
          ...updateData,
          amount: Math.round(payment.transaction_amount * 100),
          currency: payment.currency_id || "BRL",
          plan_type: payment.metadata?.plan_type || "monthly",
          metadata: payment.metadata || {},
        });

        if (insertError) {
          logStep("Erro ao criar pagamento no banco", { error: insertError });
        } else {
          logStep("Pagamento criado no banco");
        }
      }

      // Se aprovado, ativar ou renovar licença
      if (payment.status === "approved") {
        const userId = payment.metadata?.user_id || paymentRecord?.user_id;
        const planType = payment.metadata?.plan_type || paymentRecord?.plan_type || "monthly";
        const purchaseRegistrationId = payment.metadata?.purchase_registration_id;

        // Buscar purchase_registration pelo payment_id ou pelo ID do metadata
        let purchaseReg = null;
        if (purchaseRegistrationId) {
          const { data: regData } = await supabase
            .from("purchase_registrations")
            .select("*")
            .eq("id", purchaseRegistrationId)
            .single();
          purchaseReg = regData;
        } else {
          // Tentar buscar pelo mercadopago_payment_id
          const { data: regData } = await supabase
            .from("purchase_registrations")
            .select("*")
            .eq("mercadopago_payment_id", payment.id.toString())
            .single();
          purchaseReg = regData;
        }

        logStep("Purchase registration encontrado", {
          found: !!purchaseReg,
          id: purchaseReg?.id,
          email: purchaseReg?.customer_email,
        });

        // Buscar dias configurados para o plano na tabela subscription_plans
        let daysToAdd = 0;
        try {
          const { data: dbPlan } = await supabase
            .from("subscription_plans")
            .select("days")
            .eq("plan_type", planType)
            .maybeSingle();

          if (dbPlan?.days && dbPlan.days > 0) {
            daysToAdd = dbPlan.days;
          } else {
            daysToAdd = planType === "yearly" ? 365 : 30;
          }
        } catch (planError) {
          logStep("Erro ao buscar plano em subscription_plans, usando padrão", { error: String(planError) });
          daysToAdd = planType === "yearly" ? 365 : 30;
        }

        // Determinar user_id para a licença
        const licenseUserId = userId && userId !== "guest" ? userId : null;

        let licenseId: string | null = null;
        let licenseCode: string | null = null;
        let isRenewal = false;
        let licenseExpiresAt: string | null = null;

        // LÓGICA DE RENOVAÇÃO: Buscar licença existente do usuário
        if (licenseUserId) {
          const { data: existingLicense, error: licenseSearchError } = await supabase
            .from("licenses")
            .select("*")
            .eq("user_id", licenseUserId)
            .order("expires_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (licenseSearchError) {
            logStep("Erro ao buscar licença existente", { error: licenseSearchError });
          }

          if (existingLicense) {
            // RENOVAÇÃO: Licença existente encontrada
            isRenewal = true;
            licenseId = existingLicense.id;
            licenseCode = existingLicense.code;

            logStep("Licença existente encontrada, renovando", {
              license_id: licenseId,
              code: licenseCode,
              current_expires_at: existingLicense.expires_at,
            });

            const now = new Date();
            const newExpiresAtIso = calculateSmartExpiration(existingLicense.expires_at, daysToAdd, now);
            licenseExpiresAt = newExpiresAtIso;

            // Se a licença atual ainda for TRIAL, gerar um novo código definitivo
            let updatedCode = existingLicense.code as string | null;
            if (updatedCode && updatedCode.startsWith("TRIAL")) {
              updatedCode = await generateUniqueLicenseCode(supabase, planType, daysToAdd);
              licenseCode = updatedCode;

              logStep("Convertendo licença TRIAL em código definitivo na renovação (mercadopago-webhook)", {
                license_id: licenseId,
                old_code: existingLicense.code,
                new_code: updatedCode,
                days_added: daysToAdd,
              });
            }

            // Atualizar licença existente
            const { error: updateError } = await supabase
              .from("licenses")
              .update({
                ...(updatedCode ? { code: updatedCode } : {}),
                expires_at: newExpiresAtIso,
                is_active: true,
                updated_at: now.toISOString(),
                metadata: {
                  ...(existingLicense.metadata || {}),
                  last_renewal: now.toISOString(),
                  renewal_payment_id: payment.id,
                  days_added: daysToAdd,
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
              logStep("Erro ao renovar licença", { error: updateError });
              throw new Error(`Erro ao renovar licença: ${updateError.message}`);
            }

            logStep("Licença renovada com sucesso", {
              license_id: licenseId,
              new_expires_at: newExpiresAtIso,
              days_added: daysToAdd,
            });
          }
        }

        // Se não encontrou licença existente, criar nova
        if (!licenseId) {
          logStep("Nenhuma licença existente encontrada, criando nova", { user_id: licenseUserId });

          // Gerar código de licença único usando os dias configurados
          licenseCode = await generateUniqueLicenseCode(supabase, planType, daysToAdd);
          logStep("Código de licença gerado", { code: licenseCode });

          const now = new Date();
          const newExpiresAtIso = calculateSmartExpiration(null, daysToAdd, now);
          licenseExpiresAt = newExpiresAtIso;

          const { data: insertData, error: insertError } = await supabase
            .from("licenses")
            .insert({
              code: licenseCode,
              is_active: true,
              activated_at: licenseUserId ? now.toISOString() : null,
              expires_at: newExpiresAtIso,
              license_type: "professional",
              user_id: licenseUserId,
              metadata: {
                origin: "mercadopago_webhook",
                payment_id: payment.id,
                plan_type: planType,
                buyer_email: purchaseReg?.customer_email || payment.metadata?.customer_email,
                days_purchased: daysToAdd,
                created_via: "direct_insert_webhook",
              },
            })
            .select("id")
            .single();

          if (insertError) {
            logStep("Erro ao criar licença via INSERT direto", { error: insertError });
            throw new Error(`Erro ao inserir licença: ${insertError.message}`);
          } else {
            licenseId = insertData?.id || null;
            logStep("Licença criada via INSERT direto", {
              license_id: licenseId,
              code: licenseCode,
              user_id: licenseUserId,
            });
          }
        }

        // Atualizar purchase_registrations com código da licença
        if (purchaseReg && licenseId && licenseCode) {
          const { error: updateRegError } = await supabase
            .from("purchase_registrations")
            .update({
              license_code: licenseCode,
              license_id: licenseId,
              status: "completed",
            })
            .eq("id", purchaseReg.id);

          if (updateRegError) {
            logStep("Erro ao atualizar purchase_registration", { error: updateRegError });
          } else {
            logStep("Purchase registration atualizado", {
              is_renewal: isRenewal,
              license_code: licenseCode,
            });
          }

          const customerEmail = purchaseReg.customer_email || payment.metadata?.customer_email;
          const customerName = purchaseReg.customer_name || payment.metadata?.customer_name || "Cliente";

          // Enviar email com código da licença (só se for nova licença, não renovação)
          if (!isRenewal && customerEmail) {
            try {
              logStep("Enviando email com código da licença", { email: customerEmail });

              const { error: emailError } = await supabase.functions.invoke("send-license-email", {
                body: {
                  email: customerEmail,
                  name: customerName,
                  licenseCode: licenseCode,
                  planType: planType,
                },
              });

              if (emailError) {
                logStep("Erro ao enviar email de licença", { error: emailError });
              } else {
                logStep("Email de licença enviado com sucesso");

                // Atualizar purchase_registrations com status de email enviado
                await supabase
                  .from("purchase_registrations")
                  .update({
                    email_sent: true,
                    email_sent_at: new Date().toISOString(),
                  })
                  .eq("id", purchaseReg.id);
              }
            } catch (emailErr) {
              logStep("Erro ao chamar função de envio de email de licença", { error: emailErr });
            }
          } else if (isRenewal) {
            logStep("Renovação detectada, email de código não será enviado (licença já existe)");
          } else {
            logStep("Email do cliente não disponível para envio de código de licença");
          }

          // Sempre tentar enviar recibo de pagamento se tivermos email do cliente
          const paymentTypeId = payment.payment_type_id || payment.payment_method_id;
          const normalizedMethod =
            paymentTypeId === "account_money" || paymentTypeId === "credit_card"
              ? "card"
              : paymentTypeId === "bank_transfer" || paymentTypeId === "pix"
                ? "pix"
                : updateData.payment_method || "pix";

          if (customerEmail) {
            // Evitar recibo duplicado: checar se já foi enviado antes
            const alreadySentReceipt = (purchaseReg.metadata as any)?.receipt_sent === true;

            if (alreadySentReceipt) {
              logStep("Recibo de pagamento já havia sido enviado anteriormente, pulando envio duplicado", {
                purchase_registration_id: purchaseReg.id,
              });
            } else {
              const receiptCode = Math.floor(10000000 + Math.random() * 90000000).toString();

              const receiptPayload = {
                email: customerEmail,
                name: customerName,
                licenseCode,
                planType,
                isRenewal,
                amount: payment.transaction_amount,
                currency: payment.currency_id || "BRL",
                paymentMethod: normalizedMethod,
                paymentId: payment.id.toString(),
                status: payment.status,
                paidAt: payment.date_approved || new Date().toISOString(),
                receiptCode,
                // Contato
                customerPhone: purchaseReg.customer_phone || payment.metadata?.customer_phone || null,
                // Dados administrativos
                ipAddress,
                userAgent,
                deviceInfo: `Browser: ${userAgent}`,
                // Dados de login do usuário no momento da compra
                loginUserId: userId || null,
                loginEmail: purchaseReg.customer_email || null,
              };

              try {
                logStep("Enviando email de recibo de pagamento", {
                  email: customerEmail,
                  receiptCode,
                });

                const { error: receiptError } = await supabase.functions.invoke("send-payment-receipt-email", {
                  body: receiptPayload,
                });

                if (receiptError) {
                  logStep("Erro ao enviar recibo de pagamento", { error: receiptError });
                } else {
                  logStep("Recibo de pagamento enviado com sucesso");

                  // Marcar na purchase_registration que o recibo já foi enviado
                  const updatedMetadata = {
                    ...(purchaseReg.metadata || {}),
                    receipt_sent: true,
                  };

                  const { error: receiptFlagError } = await supabase
                    .from("purchase_registrations")
                    .update({ metadata: updatedMetadata })
                    .eq("id", purchaseReg.id);

                  if (receiptFlagError) {
                    logStep("Erro ao marcar recibo como enviado em purchase_registrations", {
                      error: receiptFlagError,
                    });
                  } else {
                    logStep("Flag de recibo_enviado registrada em purchase_registrations", {
                      purchase_registration_id: purchaseReg.id,
                    });
                  }
                }
              } catch (receiptErr) {
                logStep("Erro ao chamar função de recibo de pagamento", {
                  error: receiptErr,
                });
              }
            }
          } else {
            logStep("Email do cliente não disponível, recibo de pagamento não será enviado");
          }

          // Enviar notificação de pagamento para o admin (apenas PIX)
          try {
            const isPix = paymentTypeId === "bank_transfer" || paymentTypeId === "pix" || normalizedMethod === "pix";

            logStep("Verificando se deve enviar email de admin", {
              payment_type_id: paymentTypeId,
              payment_method_id: payment.payment_method_id,
              normalizedMethod,
              isPix,
            });

            if (isPix) {
              const deviceInfo =
                (purchaseReg?.metadata as any)?.device_info || (payment.metadata as any)?.device_info || null;

              const adminEmail = "kuky.png@gmail.com";

              logStep("Condição PIX verdadeira, preparando envio para admin", {
                adminEmail,
                hasDeviceInfo: !!deviceInfo,
              });

              if (adminEmail) {
                await sendAdminPaymentNotification({
                  adminEmail,
                  customerName,
                  customerEmail: customerEmail || "sem-email",
                  customerPhone: purchaseReg.customer_phone || payment.metadata?.customer_phone || null,
                  planType,
                  amount: payment.transaction_amount,
                  currency: payment.currency_id || "BRL",
                  paymentStatus: payment.status,
                  paymentMethod: normalizedMethod,
                  paidAt: payment.date_approved || new Date().toISOString(),
                  paymentIdMp: payment.id.toString(),
                  paymentIdInternal: paymentRecord?.id || null,
                  purchaseRegistrationId: purchaseReg.id,
                  licenseId,
                  licenseCode,
                  licenseExpiresAt,
                  isRenewal,
                  deviceInfo,
                });
              }
            }
          } catch (adminEmailError) {
            logStep("Erro ao enviar email de admin", { error: adminEmailError });
          }

          // --- NOTIFICAÇÕES WHATSAPP (RECIBO CLIENTE E ALERTA ADMIN) ---
          try {
            // 1. Buscar configurações do WhatsApp (Evolution)
            const { data: waSettings } = await supabase
              .from("whatsapp_zapi_settings")
              .select("admin_notification_phone, purchase_approved_template, buyer_notification_template, evolution_instance_name")
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            // Instância definida no painel (global). Fallback opcional: ENV.
            const activeInstanceName =
              waSettings?.evolution_instance_name ||
              Deno.env.get("EVOLUTION_INSTANCE_NAME") ||
              Deno.env.get("EVOLUTION_DEFAULT_INSTANCE");

            const formatPhoneBR = (raw: string | null | undefined): string => {
              const digits = (raw || "").replace(/\D/g, "");
              if (digits.length === 11) {
                return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
              }
              if (digits.length === 10) {
                return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
              }
              return raw || "";
            };

            const formatBrasiliaDateTime = (iso: string): string => {
              const d = new Date(iso);
              const date = new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }).format(d);
              const time = new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(d);
              return `${date} as ${time} (Brasília)`;
            };

            // Helper: substitui {{chave}} por vars[chave]
            const formatMessage = (template: string | null, vars: Record<string, string>) => {
              if (!template) return null;
              return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, key) => {
                const v = vars[key];
                return typeof v === "string" ? v : "";
              });
            };

            const paidAtIso = payment.date_approved || new Date().toISOString();

            const templateVars: Record<string, string> = {
              client_name: customerName,
              email: customerEmail || "",
              phone: formatPhoneBR(purchaseReg.customer_phone || (payment.metadata as any)?.customer_phone || null),
              amount: payment.transaction_amount.toFixed(2).replace(".", ","),
              plan_type: planType,
              plan_name: planType === "yearly" ? "Anual" : planType === "monthly" ? "Mensal" : planType,
              license_code: licenseCode || "Consultar email",
              mp_id: payment.id.toString(),
              status: payment.status,
              method: normalizedMethod,
              datetime_brt: formatBrasiliaDateTime(paidAtIso),
              validity: licenseExpiresAt ? new Date(licenseExpiresAt).toLocaleDateString("pt-BR") : "Consultar no sistema",
            };

            // 2. Enviar Recibo para o Cliente via WhatsApp
            const buyerPhone = purchaseReg.customer_phone || payment.metadata?.customer_phone;
            const buyerTemplate = waSettings?.buyer_notification_template || `*✅ Pagamento Confirmado!*

Olá *{{client_name}}*, seu pagamento foi aprovado!
Valor: R$ {{amount}}
Plano: {{plan_name}}
Licença: \`{{license_code}}\`

Obrigado!`;

            if (buyerPhone) {
              const buyerMessage = formatMessage(buyerTemplate, templateVars);
              
              if (buyerMessage) {
                 logStep("Enviando recibo WhatsApp para o comprador", { phone: buyerPhone });
                 await sendWhatsAppNotification({
                   phone: buyerPhone,
                   message: buyerMessage,
                   instanceName: activeInstanceName,
                 });
              }
            } else {
              logStep("Telefone do comprador não encontrado para enviar WhatsApp");
            }

            // 3. Enviar Alerta para Admins via WhatsApp
            const adminPhone = waSettings?.admin_notification_phone;
            const adminTemplate = waSettings?.purchase_approved_template || `*🚀 Nova Venda!*
Cliente: {{client_name}}
Valor: R$ {{amount}}
Plano: {{plan_name}}`;

            if (adminPhone) {
               const adminMessage = formatMessage(adminTemplate, templateVars);
               if (adminMessage) {
                 logStep("Enviando alerta WhatsApp para admin", { phone: adminPhone });
                 await sendWhatsAppNotification({
                   phone: adminPhone,
                   message: adminMessage,
                   instanceName: activeInstanceName,
                 });
               }
            }
          } catch (wsError) {
            logStep("Erro ao processar notificações de WhatsApp", { error: wsError });
          }
        } else {
          logStep("Purchase registration ou license_id não encontrado, não foi possível atualizar", {
            hasPurchaseReg: !!purchaseReg,
            hasLicenseId: !!licenseId,
            hasLicenseCode: !!licenseCode,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
