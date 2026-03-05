import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { userId, storeId, dryRun } = await req.json();

    if (!userId || !storeId) {
      return new Response(
        JSON.stringify({ error: "userId and storeId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch all budgets
    const { data: budgets, error: bErr } = await supabaseAdmin
      .from("budgets")
      .select("id, device_type, device_model, total_price, cash_price, installment_price, installments, part_quality, warranty_months")
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .gt("total_price", 0)
      .order("created_at", { ascending: true });

    if (bErr) throw bErr;

    // 2. Deduplicate by device_model + part_quality
    const uniqueMap = new Map<string, typeof budgets[0]>();
    for (const b of budgets) {
      const key = `${b.device_model}__${b.part_quality || "Padrão"}`;
      uniqueMap.set(key, b);
    }
    const uniqueBudgets = Array.from(uniqueMap.values());

    if (dryRun) {
      const results = uniqueBudgets.map(b => ({
        budget_id: b.id, device: b.device_model,
        quality: b.part_quality || "Padrão", action: "would_create",
      }));
      return new Response(
        JSON.stringify({ total_budgets: budgets.length, unique: uniqueBudgets.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Pre-fetch existing brands and devices for this store
    const { data: existingBrands } = await supabaseAdmin
      .from("store_brands").select("id, name").eq("store_id", storeId);
    const brandMap = new Map((existingBrands || []).map(b => [b.name.toLowerCase().trim(), b.id]));

    const { data: existingDevices } = await supabaseAdmin
      .from("store_devices").select("id, name, brand_id").eq("store_id", storeId);
    const deviceMap = new Map((existingDevices || []).map(d => [`${d.brand_id}__${d.name.toLowerCase().trim()}`, d.id]));

    const { data: existingServices } = await supabaseAdmin
      .from("store_services").select("id, device_id, category").eq("store_id", storeId);
    const serviceMap = new Map((existingServices || []).map(s => [`${s.device_id}__${(s.category || "").toLowerCase().trim()}`, s.id]));

    // Helper to get or create brand
    async function getBrandId(name: string): Promise<string> {
      const key = name.toLowerCase().trim();
      if (brandMap.has(key)) return brandMap.get(key)!;
      const { data, error } = await supabaseAdmin
        .from("store_brands").insert({ store_id: storeId, name: name.trim() }).select("id").single();
      if (error) throw error;
      brandMap.set(key, data.id);
      return data.id;
    }

    async function getDeviceId(brandId: string, name: string): Promise<string> {
      const key = `${brandId}__${name.toLowerCase().trim()}`;
      if (deviceMap.has(key)) return deviceMap.get(key)!;
      const { data, error } = await supabaseAdmin
        .from("store_devices").insert({ store_id: storeId, brand_id: brandId, name: name.trim() }).select("id").single();
      if (error) throw error;
      deviceMap.set(key, data.id);
      return data.id;
    }

    const results: { device: string; quality: string; action: string }[] = [];

    // 4. Process sequentially but with cached lookups
    for (const b of uniqueBudgets) {
      const brandName = b.device_type || "Smartphone";
      const quality = b.part_quality || "Padrão";

      try {
        const brandId = await getBrandId(brandName);
        const deviceId = await getDeviceId(brandId, b.device_model);

        const cashPriceReais = (b.cash_price || b.total_price) / 100;
        const installmentPriceReais = (b.installment_price || 0) / 100;
        const installmentTotal = installmentPriceReais * (b.installments || 1);
        const warrantyDays = (b.warranty_months || 3) * 30;

        const svcKey = `${deviceId}__${quality.toLowerCase().trim()}`;
        const existingId = serviceMap.get(svcKey);

        if (existingId) {
          await supabaseAdmin.from("store_services").update({
            name: `Troca de Tela ${quality}`, price: cashPriceReais,
            installment_price: installmentTotal, max_installments: b.installments || 1,
            warranty_days: warrantyDays,
          }).eq("id", existingId);
          results.push({ device: b.device_model, quality, action: "updated" });
        } else {
          const { data: newSvc, error: svcErr } = await supabaseAdmin.from("store_services").insert({
            store_id: storeId, device_id: deviceId, name: `Troca de Tela ${quality}`,
            category: quality, price: cashPriceReais, installment_price: installmentTotal,
            max_installments: b.installments || 1, warranty_days: warrantyDays,
            estimated_time_minutes: 60, interest_rate: 0,
          }).select("id").single();

          if (svcErr) {
            results.push({ device: b.device_model, quality, action: "error" });
            continue;
          }
          serviceMap.set(svcKey, newSvc.id);
          results.push({ device: b.device_model, quality, action: "created" });
        }
      } catch (e) {
        console.error(`Error processing ${b.device_model} ${quality}:`, e);
        results.push({ device: b.device_model, quality, action: "error" });
      }
    }

    return new Response(
      JSON.stringify({ total_budgets: budgets.length, unique_services: uniqueBudgets.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-budgets-to-store error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
