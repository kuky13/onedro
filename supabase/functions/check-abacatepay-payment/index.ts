import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ABACATEPAY_API_URL = "https://api.abacatepay.com/v1";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const abacatePayToken = Deno.env.get("ABACATEPAY_API_TOKEN")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Checking payment status for: ${paymentId}`);

    // Determine if it's a Billing ID (bill_) or Pix ID (pix_ or char_?)
    // The create response for PIX returns "pix_char_..." or just "pix_...".
    // The create response for Billing returns "bill_...".
    
    let endpoint = "";
    if (paymentId.startsWith("bill_")) {
      endpoint = `${ABACATEPAY_API_URL}/billing/get?id=${paymentId}`;
    } else {
      // Assuming PIX QR Code check endpoint
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
      // Check if license is generated in DB
      // We look up purchase_registrations by abacatepay_id (stored in metadata or mercadopago_payment_id)
      
      const { data: purchaseReg } = await supabaseAdmin
        .from("purchase_registrations")
        .select("license_code, customer_name, customer_email")
        .or(`metadata->>abacatepay_id.eq.${paymentId},mercadopago_payment_id.eq.${paymentId}`)
        .maybeSingle();

      if (purchaseReg) {
        licenseCode = purchaseReg.license_code;
        customerData = {
          name: purchaseReg.customer_name,
          email: purchaseReg.customer_email
        };
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

  } catch (error) {
    console.error("Error checking payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
