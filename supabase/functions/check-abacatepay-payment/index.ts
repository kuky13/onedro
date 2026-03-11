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
      // 1. Find the Purchase Registration
      const { data: purchaseReg } = await supabaseAdmin
        .from("purchase_registrations")
        .select("*")
        .or(`metadata->>abacatepay_id.eq.${paymentId},mercadopago_payment_id.eq.${paymentId}`)
        .maybeSingle();

      if (purchaseReg) {
        customerData = {
          name: purchaseReg.customer_name,
          email: purchaseReg.customer_email
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

            if (existingLicense) {
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

            // Send WhatsApp notifications (buyer + admin)
            try {
              await sendWhatsAppNotifications(supabaseAdmin, {
                customerName: purchaseReg.customer_name,
                customerPhone: purchaseReg.customer_phone,
                licenseCode,
                planType,
                amount: data.data.amount,
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
