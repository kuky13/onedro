import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ABACATEPAY_API_URL = "https://api.abacatepay.com/v1";

// --- Helper Functions ---
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

async function generateUniqueLicenseCode(supabase: any, planType: string = "monthly", daysOverride?: number): Promise<string> {
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
    const { data } = await supabase.from("licenses").select("id").eq("code", code).maybeSingle();
    if (!data) isUnique = true;
    attempts++;
  }
  if (!isUnique) throw new Error("Unable to generate unique license code");
  return code;
}

async function sendWahaMessage(phone: string, message: string, wahaBaseUrl: string, wahaApiKey: string, session: string) {
  let cleanPhone = phone.replace(/\D/g, "");
  if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith("55")) {
    cleanPhone = "55" + cleanPhone;
  }
  const chatId = `${cleanPhone}@c.us`;
  const url = `${wahaBaseUrl.replace(/\/+$/, "")}/api/sendText?session=${encodeURIComponent(session)}`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": wahaApiKey },
    body: JSON.stringify({ session, chatId, text: message }),
  });
  console.log(`WAHA response for ${cleanPhone}: ${res.status}`);
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function sendWhatsAppNotifications(supabaseAdmin: any, params: {
  customerName: string; 
  customerPhone: string; 
  customerEmail: string;
  licenseCode: string; 
  planType: string; 
  amount?: number;
  paymentId: string;
  paymentMethod: string;
  status: string;
  customerTaxId?: string; // Added optional
}) {
  const wahaBaseUrl = Deno.env.get("WAHA_BASE_URL");
  const wahaApiKey = Deno.env.get("WAHA_API_KEY");

  if (!wahaBaseUrl || !wahaApiKey) {
    console.log("WAHA secrets not configured, skipping WhatsApp notifications");
    return;
  }

  const { data: settings } = await supabaseAdmin
    .from("whatsapp_zapi_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const session = settings?.waha_session || Deno.env.get("WAHA_SESSION") || "default";
  
  const nowBRT = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const amountFormatted = params.amount ? (params.amount / 100).toFixed(2) : "0.00";
  const planName = params.planType === "yearly" ? "Anual" : "Mensal";

  const templateVars: Record<string, string> = {
    // Compatibilidade com variáveis antigas
    nome: params.customerName,
    licenca: params.licenseCode,
    plano: params.planType,
    valor: `R$ ${amountFormatted}`,
    
    // Novas variáveis
    client_name: params.customerName,
    email: params.customerEmail,
    phone: params.customerPhone,
    cpf: params.customerTaxId || "N/A",
    customer_tax_id: params.customerTaxId || "N/A",
    amount: amountFormatted,
    plan_type: params.planType,
    plan_name: planName,
    license_code: params.licenseCode,
    mp_id: params.paymentId, // Mantido mp_id para compatibilidade com template, mas é AbacatePay ID
    status: params.status,
    method: params.paymentMethod,
    datetime_brt: nowBRT,
    validity: params.planType === "yearly" ? "1 Ano" : "30 Dias"
  };

  // Notify BUYER
  try {
    if (params.customerPhone) {
      const buyerTemplate = settings?.buyer_notification_template
        || `*✅ Pagamento Confirmado!*\n\nObrigado {{client_name}}!\nSua licença: *{{license_code}}*\nPlano: {{plan_name}}`;
      const buyerMsg = applyTemplate(buyerTemplate, templateVars);
      await sendWahaMessage(params.customerPhone, buyerMsg, wahaBaseUrl, wahaApiKey, session);
    }
  } catch (e) {
    console.error("WhatsApp Buyer Error:", e);
  }

  // Notify ADMIN
  try {
    const adminPhone = settings?.admin_notification_phone;
    if (adminPhone) {
      const adminTemplate = settings?.purchase_approved_template
        || `*💰 Nova venda!*\n\nCliente: {{client_name}}\nPlano: {{plan_name}}\nValor: R$ {{amount}}\nLicença: {{license_code}}`;
      const adminMsg = applyTemplate(adminTemplate, templateVars);
      await sendWahaMessage(adminPhone, adminMsg, wahaBaseUrl, wahaApiKey, session);
    }
  } catch (e) {
    console.error("WhatsApp Admin Error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentId } = await req.json();

    const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "ABACATEPAY_API_TOKEN"];
    for (const key of requiredEnv) {
      if (!Deno.env.get(key)) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Fallback if SERVICE_ROLE_KEY is missing
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseKey;
    const abacatePayToken = Deno.env.get("ABACATEPAY_API_TOKEN")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    console.log(`Checking payment status for: ${paymentId}`);

    let endpoint = "";
    if (paymentId.startsWith("bill_")) {
      endpoint = `${ABACATEPAY_API_URL}/billing/get?id=${paymentId}`;
    } else {
      endpoint = `${ABACATEPAY_API_URL}/pixQrCode/check?id=${paymentId}`;
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${abacatePayToken}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AbacatePay Check Error:", errorText);
      throw new Error(`AbacatePay API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const status = data.data.status; // "PENDING", "PAID", "EXPIRED"

    let licenseCode = null;
    let customerData = null;

    if (status === "PAID") {
      // 1. Find the Purchase Registration - two sequential queries to avoid broken JSONB OR syntax
      let purchaseReg: any = null;

      const { data: regByPaymentId } = await supabaseAdmin
        .from("purchase_registrations")
        .select("*")
        .eq("mercadopago_payment_id", paymentId)
        .maybeSingle();
      purchaseReg = regByPaymentId;

      if (!purchaseReg) {
        const { data: regByMeta } = await supabaseAdmin
          .from("purchase_registrations")
          .select("*")
          .eq("metadata->>abacatepay_id", paymentId)
          .maybeSingle();
        purchaseReg = regByMeta;
      }

      if (purchaseReg) {
        customerData = {
          name: purchaseReg.customer_name,
          email: purchaseReg.customer_email,
          tax_id: purchaseReg.customer_tax_id
        };

        // 2. Check if license already exists
        if (purchaseReg.license_code) {
          licenseCode = purchaseReg.license_code;
        } else {
          // 3. SELF-HEALING: Generate license if missing
          console.log("Payment is PAID but no license found. Generating now...");
          
          try {
            const userId = purchaseReg.user_id;
            const planType = purchaseReg.plan_type || "monthly";
            const daysToAdd = planType === "yearly" ? 365 : 30;
            const now = new Date();

            // Check for existing license to renew
            const { data: existingLicense } = await supabaseAdmin
               .from("licenses")
               .select("*")
               .eq("user_id", userId)
               .order("expires_at", { ascending: false })
               .limit(1)
               .maybeSingle();

            let isRenewal = false;
            if (existingLicense) {
               isRenewal = true;
               const newExpiresAt = calculateSmartExpiration(existingLicense.expires_at, daysToAdd, now);
               licenseCode = existingLicense.code;
               
               await supabaseAdmin.from("licenses").update({
                  expires_at: newExpiresAt,
                  is_active: true,
                  updated_at: now.toISOString(),
                  metadata: {
                     ...existingLicense.metadata,
                     last_renewal: now.toISOString(),
                     renewal_provider: "abacatepay_check",
                     renewal_payment_id: paymentId
                  }
               }).eq("id", existingLicense.id);
            } else {
               licenseCode = await generateUniqueLicenseCode(supabaseAdmin, planType, daysToAdd);
               const newExpiresAt = calculateSmartExpiration(null, daysToAdd, now);
               
               await supabaseAdmin.from("licenses").insert({
                  code: licenseCode,
                  is_active: true,
                  activated_at: now.toISOString(),
                  expires_at: newExpiresAt,
                  license_type: "professional",
                  user_id: userId,
                  metadata: {
                     origin: "abacatepay_check",
                     payment_id: paymentId,
                     plan_type: planType
                  }
               });
            }

            // Update Purchase Registration
            await supabaseAdmin.from("purchase_registrations").update({
               status: "completed",
               license_code: licenseCode,
               mercadopago_payment_id: paymentId,
               updated_at: now.toISOString()
            }).eq("id", purchaseReg.id);

            // Create Payment Record
            const { data: existingPayment } = await supabaseAdmin
               .from("payments")
               .select("id")
               .eq("mercadopago_payment_id", paymentId)
               .maybeSingle();

            if (!existingPayment) {
               await supabaseAdmin.from("payments").insert({
                  user_id: userId,
                  mercadopago_payment_id: paymentId,
                  amount: data.data.amount,
                  currency: "BRL",
                  status: "completed",
                  plan_type: planType,
                  payment_method: "PIX", // Assuming PIX if checked here usually
                  completed_at: now.toISOString(),
                  metadata: {
                     provider: "abacatepay",
                     abacatepay_id: paymentId,
                     source: "check_status_fallback"
                  }
               });
            }

            console.log("Self-healing successful. License generated:", licenseCode);

            // Send Email Receipt
            try {
              console.log("Sending email receipt via check-status...");
              const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-payment-receipt-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceRoleKey}`
                },
                body: JSON.stringify({
                  email: purchaseReg.customer_email,
                  name: purchaseReg.customer_name,
                  amount: data.data.amount / 100,
                  currency: "BRL",
                  paymentMethod: "pix",
                  paymentId: paymentId,
                  status: "approved",
                  paidAt: now.toISOString(),
                  receiptCode: paymentId.slice(-8).toUpperCase(),
                  planType: planType,
                  licenseCode: licenseCode,
                  isRenewal: isRenewal,
                  customerPhone: purchaseReg.customer_phone
                })
              });
              
              if (!emailRes.ok) {
                 console.error("Failed to send email receipt:", await emailRes.text());
              } else {
                 console.log("Email receipt sent successfully.");
              }
            } catch (emailErr) {
              console.error("Email notification error in self-healing:", emailErr);
            }

            // Send WhatsApp notifications (buyer + admin)
            try {
              await sendWhatsAppNotifications(supabaseAdmin, {
                customerName: purchaseReg.customer_name,
                customerPhone: purchaseReg.customer_phone,
                customerEmail: purchaseReg.customer_email,
                customerTaxId: purchaseReg.customer_tax_id, // Added
                licenseCode,
                planType,
                amount: data.data.amount,
                paymentId: paymentId,
                paymentMethod: "PIX",
                status: "Aprovado"
              });
            } catch (whatsappErr) {
              console.error("WhatsApp notification error in self-healing:", whatsappErr);
            }

          } catch (genError) {
            console.error("Error generating license in check-status:", genError);
            // Don't fail the request, just return what we have (status PAID, no license)
            // The frontend will keep polling or show contact support.
          }
        }
      }
    }

    return new Response(JSON.stringify({
      data: {
        status,
        license_code: licenseCode,
        customer_data: customerData
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error checking payment:", error);
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
