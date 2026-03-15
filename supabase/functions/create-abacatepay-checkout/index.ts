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
    const {
      amount, // In cents
      description,
      customerName,
      customerEmail,
      customerPhone,
      customerTaxId,
      paymentMethod, // PIX or CARD (for billing)
      frequency, // ONE_TIME or MULTIPLE_PAYMENTS
      type, // 'pix' (direct qr code) or 'billing' (checkout page)
      returnUrl,
      completionUrl,
      isAuthenticated,
      purchaseRegistrationId
    } = await req.json();

    const gatewayItemDescription = "Prestação de serviço de suporte técnico e configuração de sistemas";

    const requiredEnv = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "ABACATEPAY_API_TOKEN"];
    for (const key of requiredEnv) {
      if (!Deno.env.get(key)) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const abacatePayToken = Deno.env.get("ABACATEPAY_API_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    // const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    // Fallback if SERVICE_ROLE_KEY is missing (it shouldn't be, but...)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || supabaseKey;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Authentication check
    if (isAuthenticated) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("Missing Authorization header");
      const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (userError || !user) throw new Error("Unauthorized user");
    }

    // Prepare customer object
    let customer = undefined;
    
    // Only include customer if taxId looks somewhat valid (not default 000...)
    // Or if we have actual data.
    if (customerTaxId && customerTaxId !== "000.000.000-00") {
      customer = {
        name: customerName || "Cliente",
        email: customerEmail || "email@example.com",
        cellphone: customerPhone || "(11) 99999-9999",
        taxId: customerTaxId
      };
    }

    let result;
    let endpoint;
    let payload;

    if (type === 'pix') {
      endpoint = `${ABACATEPAY_API_URL}/pixQrCode/create`;
      payload = {
        amount,
        description: gatewayItemDescription,
        // Only include customer if defined
        ...(customer ? { customer } : {}),
        metadata: {
          purchaseRegistrationId
        }
      };
    } else {
      // Billing (Checkout Page)
      endpoint = `${ABACATEPAY_API_URL}/billing/create`;
      payload = {
        frequency: frequency || "ONE_TIME",
        methods: ["PIX", "CARD"],
        products: [
          {
            externalId: purchaseRegistrationId || "prod-default",
            name: gatewayItemDescription,
            quantity: 1,
            price: amount,
            description: gatewayItemDescription
          }
        ],
        returnUrl: returnUrl || `${req.headers.get("origin")}/plans`,
        completionUrl: completionUrl || `${req.headers.get("origin")}/purchase-success`,
        // Only include customer if defined
        ...(customer ? { customer } : {}),
        metadata: {
          purchaseRegistrationId
        }
      };
    }

    console.log(`Calling AbacatePay: ${endpoint}`, JSON.stringify(payload));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${abacatePayToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AbacatePay Error:", errorText);
      throw new Error(`AbacatePay API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AbacatePay Response:", JSON.stringify(data));

    // Update database logic (simplified for now, mimicking existing logic)
    if (isAuthenticated && purchaseRegistrationId) {
       // Update purchase_registration with AbacatePay ID (using mercadopago_payment_id col for compatibility)
       
       const abacateId = data.data.id;
       
       try {
         await supabaseAdmin.from("purchase_registrations").update({
           mercadopago_payment_id: abacateId,
         }).eq("id", purchaseRegistrationId);
       } catch (dbError) {
         console.error("Database Update Error (Non-critical):", dbError);
         // Continue even if DB update fails, as we return the QR code
       }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({ error: errMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
