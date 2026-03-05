import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, storeId, analyzedItems } = await req.json();

    if (action === "analyze") {
      if (!storeId) {
        return new Response(JSON.stringify({ error: "storeId required for analyze" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // 1. Fetch ALL budgets with pagination (Supabase limits to 1000 per query)
      let allBudgets: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        const { data: chunk, error: bErr } = await supabaseAdmin
          .from("budgets")
          .select("id, sequential_number, device_type, device_model, total_price, cash_price, installment_price, installments, part_quality, warranty_months, issue, custom_services, status, created_at")
          .eq("owner_id", user.id)
          .is("deleted_at", null)
          .gt("total_price", 0)
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (bErr) throw bErr;
        if (!chunk || chunk.length === 0) break;
        allBudgets = allBudgets.concat(chunk);
        if (chunk.length < pageSize) break;
        page++;
      }

      const budgets = allBudgets;

      if (budgets.length === 0) {
        return new Response(
          JSON.stringify({ items: [], message: "Nenhum orçamento encontrado." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Build a compact representation for AI
      const budgetSummaries = budgets.map(b => ({
        id: b.id,
        seq: b.sequential_number,
        device_type: b.device_type,
        device_model: b.device_model,
        total_price: b.total_price,
        cash_price: b.cash_price,
        installment_price: b.installment_price,
        installments: b.installments,
        quality: b.part_quality,
        warranty_months: b.warranty_months,
        issue: b.issue,
        custom_services: b.custom_services,
      }));

      // 3. Call Lovable AI with tool calling for structured output
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const systemPrompt = `Você é um especialista em assistência técnica de celulares. Analise os orçamentos abaixo e extraia informações estruturadas.

Para cada orçamento, identifique:
- brand: A marca real do dispositivo (Apple, Samsung, Xiaomi, Motorola, LG, Huawei, etc). Use o device_type e device_model para identificar. Ex: "iPhone 13" → "Apple", "Galaxy A12" → "Samsung", "Redmi Note 11" → "Xiaomi", "Moto G10" → "Motorola". Se device_type já for a marca, use-o.
- model: O modelo limpo/normalizado (ex: "iPhone 13 Pro Max", "Galaxy S23 Ultra")
- service_category: Categoria do serviço baseado em issue/custom_services/context. Categorias possíveis: "Troca de Tela", "Troca de Bateria", "Troca de Câmera", "Conector de Carga", "Alto-Falante", "Reparo de Placa", "Software/Sistema", "Botões", "Carcaça/Vidro Traseiro", "Outro"
- service_name: Nome descritivo do serviço (ex: "Troca de Tela Original", "Troca de Bateria Compatível")
- cash_price_reais: Preço à vista em reais (converta de centavos dividindo por 100). Use cash_price se disponível, senão total_price.
- credit_card_total_reais: Preço TOTAL no cartão de crédito em reais. Calcule: (installment_price / 100) * installments. Este é o valor que o cliente paga no total se parcelar. Se installment_price não existir, use 0.
- max_installments: Número de parcelas
- quality: Qualidade da peça (Original, Premium, Compatível, Padrão)
- warranty_days: Garantia em dias (warranty_months * 30, default 90)
- budget_id: ID do orçamento original

IMPORTANTE:
- Preços estão em CENTAVOS, divida por 100 para reais
- O campo installment_price já é o valor de UMA parcela em centavos. O total no cartão = (installment_price * installments) / 100
- Agrupe orçamentos duplicados (mesmo modelo + mesma qualidade) e use o mais recente
- Se não conseguir identificar a marca, use "Outros"
- Se não conseguir identificar o serviço, use "Troca de Tela" como padrão (é o mais comum)`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Analise estes ${budgetSummaries.length} orçamentos e retorne os dados estruturados:\n\n${JSON.stringify(budgetSummaries)}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "catalog_services",
                description: "Retorna a lista de serviços catalogados a partir dos orçamentos analisados",
                parameters: {
                  type: "object",
                  properties: {
                    services: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          budget_id: { type: "string", description: "ID do orçamento original" },
                          brand: { type: "string", description: "Marca do dispositivo (Apple, Samsung, etc)" },
                          model: { type: "string", description: "Modelo normalizado do dispositivo" },
                          service_category: { type: "string", description: "Categoria do serviço" },
                          service_name: { type: "string", description: "Nome descritivo do serviço" },
                          cash_price_reais: { type: "number", description: "Preço à vista em reais" },
                          credit_card_total_reais: { type: "number", description: "Preço TOTAL no cartão de crédito em reais (parcela × quantidade de parcelas)" },
                          max_installments: { type: "number", description: "Número máximo de parcelas" },
                          quality: { type: "string", description: "Qualidade da peça" },
                          warranty_days: { type: "number", description: "Garantia em dias" },
                        },
                        required: ["budget_id", "brand", "model", "service_category", "service_name", "cash_price_reais", "quality", "warranty_days"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["services"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "catalog_services" } },
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI analysis failed");
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall || toolCall.function.name !== "catalog_services") {
        throw new Error("AI did not return structured data");
      }

      const parsed = JSON.parse(toolCall.function.arguments);
      const aiItems = parsed.services || [];

      // 4. Cross-reference with existing catalog
      const { data: existingBrands } = await supabaseAdmin
        .from("store_brands").select("id, name").eq("store_id", storeId);
      const brandLookup = new Map((existingBrands || []).map(b => [b.name.toLowerCase().trim(), b.id]));

      const { data: existingDevices } = await supabaseAdmin
        .from("store_devices").select("id, name, brand_id").eq("store_id", storeId);
      const deviceLookup = new Map((existingDevices || []).map(d => [`${d.brand_id}__${d.name.toLowerCase().trim()}`, d.id]));

      const { data: existingServices } = await supabaseAdmin
        .from("store_services").select("id, device_id, name, category, price, installment_price, max_installments, warranty_days").eq("store_id", storeId);

      // Build a lookup: deviceId__serviceName -> service data
      const serviceLookup = new Map((existingServices || []).map(s => [
        `${s.device_id}__${s.name.toLowerCase().trim()}`,
        s
      ]));

      const items = aiItems.map((item: any) => {
        const brandId = brandLookup.get(item.brand.toLowerCase().trim());
        const deviceId = brandId ? deviceLookup.get(`${brandId}__${item.model.toLowerCase().trim()}`) : null;

        if (!deviceId) {
          return { ...item, sync_status: "new", changes: [] };
        }

        const existing = serviceLookup.get(`${deviceId}__${item.service_name.toLowerCase().trim()}`);
        if (!existing) {
          return { ...item, sync_status: "new", changes: [] };
        }

        // Compare values
        const changes: string[] = [];
        const tolerance = 0.01;
        if (Math.abs((existing.price || 0) - item.cash_price_reais) > tolerance) {
          changes.push(`Preço à vista: ${existing.price} → ${item.cash_price_reais}`);
        }
        if (Math.abs((existing.installment_price || 0) - (item.credit_card_total_reais || 0)) > tolerance) {
          changes.push(`Preço cartão: ${existing.installment_price} → ${item.credit_card_total_reais || 0}`);
        }
        if ((existing.warranty_days || 0) !== (item.warranty_days || 0)) {
          changes.push(`Garantia: ${existing.warranty_days}d → ${item.warranty_days}d`);
        }
        if ((existing.max_installments || 1) !== (item.max_installments || 1)) {
          changes.push(`Parcelas: ${existing.max_installments}x → ${item.max_installments}x`);
        }

        if (changes.length === 0) {
          return { ...item, sync_status: "unchanged", changes: [] };
        }

        return { ...item, sync_status: "updated", changes };
      });

      // Stats
      const newCount = items.filter((i: any) => i.sync_status === "new").length;
      const updatedCount = items.filter((i: any) => i.sync_status === "updated").length;
      const unchangedCount = items.filter((i: any) => i.sync_status === "unchanged").length;

      return new Response(
        JSON.stringify({
          items,
          total_budgets: budgets.length,
          stats: { new: newCount, updated: updatedCount, unchanged: unchangedCount },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "apply") {
      if (!storeId || !analyzedItems || !Array.isArray(analyzedItems)) {
        return new Response(JSON.stringify({ error: "storeId and analyzedItems required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pre-fetch existing data
      const { data: existingBrands } = await supabaseAdmin
        .from("store_brands").select("id, name").eq("store_id", storeId);
      const brandMap = new Map((existingBrands || []).map(b => [b.name.toLowerCase().trim(), b.id]));

      const { data: existingDevices } = await supabaseAdmin
        .from("store_devices").select("id, name, brand_id").eq("store_id", storeId);
      const deviceMap = new Map((existingDevices || []).map(d => [`${d.brand_id}__${d.name.toLowerCase().trim()}`, d.id]));

      const { data: existingServices } = await supabaseAdmin
        .from("store_services").select("id, device_id, name").eq("store_id", storeId);
      const serviceMap = new Map((existingServices || []).map(s => [`${s.device_id}__${s.name.toLowerCase().trim()}`, s.id]));

      async function getOrCreateBrand(name: string): Promise<string> {
        const key = name.toLowerCase().trim();
        if (brandMap.has(key)) return brandMap.get(key)!;
        const { data, error } = await supabaseAdmin
          .from("store_brands").insert({ store_id: storeId, name: name.trim() }).select("id").single();
        if (error) throw error;
        brandMap.set(key, data.id);
        return data.id;
      }

      async function getOrCreateDevice(brandId: string, name: string): Promise<string> {
        const key = `${brandId}__${name.toLowerCase().trim()}`;
        if (deviceMap.has(key)) return deviceMap.get(key)!;
        const { data, error } = await supabaseAdmin
          .from("store_devices").insert({ store_id: storeId, brand_id: brandId, name: name.trim() }).select("id").single();
        if (error) throw error;
        deviceMap.set(key, data.id);
        return data.id;
      }

      const results: { model: string; service: string; action: string }[] = [];

      for (const item of analyzedItems) {
        try {
          const brandId = await getOrCreateBrand(item.brand);
          const deviceId = await getOrCreateDevice(brandId, item.model);

          const svcKey = `${deviceId}__${item.service_name.toLowerCase().trim()}`;
          const existingId = serviceMap.get(svcKey);

          const serviceData = {
            name: item.service_name,
            category: item.service_category,
            price: item.cash_price_reais,
            installment_price: item.credit_card_total_reais || 0,
            max_installments: item.max_installments || 1,
            warranty_days: item.warranty_days,
            estimated_time_minutes: 60,
            interest_rate: 0,
          };

          if (existingId) {
            await supabaseAdmin.from("store_services").update(serviceData).eq("id", existingId);
            results.push({ model: item.model, service: item.service_name, action: "updated" });
          } else {
            const { error: svcErr } = await supabaseAdmin.from("store_services").insert({
              store_id: storeId,
              device_id: deviceId,
              ...serviceData,
            });
            if (svcErr) {
              results.push({ model: item.model, service: item.service_name, action: "error" });
              continue;
            }
            results.push({ model: item.model, service: item.service_name, action: "created" });
          }
        } catch (e) {
          console.error(`Error applying ${item.model}:`, e);
          results.push({ model: item.model, service: item.service_name, action: "error" });
        }
      }

      return new Response(
        JSON.stringify({ results, total: analyzedItems.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-budgets error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
