import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";

// ── Helpers ──────────────────────────────────────────────────────────

/** Deep-search a parsed JSON response for a QR code string */
function extractQr(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  for (const key of ["qrcode", "Qrcode", "QRCode", "code", "base64", "qr", "Qr", "QR"]) {
    const v = data[key];
    if (typeof v === "string" && v.length > 20) return v;
    if (v && typeof v === "object") {
      for (const sub of ["base64", "Base64", "code", "Code", "qrcode", "Qrcode", "QRCode", "qr", "Qr", "QR"]) {
        if (typeof v[sub] === "string" && v[sub].length > 20) return v[sub];
      }
    }
  }
  for (const value of Object.values(data)) {
    if (value && typeof value === "object") {
      const nested = extractQr(value);
      if (nested) return nested;
    }
  }
  return null;
}

/** Fetch all instances from Evolution GO */
async function fetchAllInstances(baseUrl: string, globalKey: string): Promise<any[]> {
  try {
    const res = await fetch(`${baseUrl}/instance/all`, {
      method: "GET",
      headers: { apikey: globalKey },
    });
    if (!res.ok) { await res.text(); return []; }
    const body = await res.json();
    return Array.isArray(body) ? body : (body?.instances || body?.data || []);
  } catch (e) {
    console.warn("[qr-connect] fetchAllInstances error:", String(e));
    return [];
  }
}

/** Resolve instance name and token from the list */
function findInstance(instances: any[], name: string): { name: string; token: string | null; status: string } | null {
  const target = instances.find((inst: any) => {
    const n = inst.name || inst.instanceName || inst.instance?.instanceName || "";
    return n.toLowerCase() === name.toLowerCase();
  });
  if (target) {
    return {
      name: target.name || target.instanceName || target.instance?.instanceName || name,
      token: target.token || target.apikey || target.api_key || null,
      status: target.status || target.connectionStatus || "unknown",
    };
  }
  return null;
}

/** Find ANY connected instance */
function findConnectedInstance(instances: any[]): { name: string; token: string | null; ownerJid: string | null } | null {
  for (const inst of instances) {
    const st = (inst.status || inst.connectionStatus || "").toLowerCase();
    if (st === "open" || st === "connected") {
      const name = inst.name || inst.instanceName || inst.instance?.instanceName || "";
      const ownerJid = inst.ownerJid || inst.owner || inst.instance?.ownerJid || null;
      return {
        name,
        token: inst.token || inst.apikey || inst.api_key || null,
        ownerJid,
      };
    }
  }
  return null;
}

/** Poll multiple QR endpoints until QR is available */
async function pollQr(baseUrl: string, instanceKey: string, instanceName?: string, maxAttempts = 15, delayMs = 2000): Promise<{ qr: string | null; alreadyLoggedIn: boolean }> {
  const endpoints = [
    `${baseUrl}/instance/qr`,
    `${baseUrl}/instance/qrcode`,
    ...(instanceName ? [
      `${baseUrl}/instance/qr/${instanceName}`,
      `${baseUrl}/instance/qrcode/${instanceName}`,
    ] : []),
  ];

  for (let i = 0; i < maxAttempts; i++) {
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers: { apikey: instanceKey },
        });
        const text = await res.text();
        if (i < 3) {
          console.log(`[qr-connect] Poll attempt ${i + 1} ${endpoint}: ${res.status} body=${text.slice(0, 300)}`);
        }

        // Detect "session already logged in" → instance is connected
        if (text.includes("already logged in") || text.includes("already connected")) {
          console.log(`[qr-connect] Instance already logged in (detected from QR endpoint)`);
          return { qr: null, alreadyLoggedIn: true };
        }

        if (res.ok && text.length > 10) {
          if (text.startsWith("data:image") || (text.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(text.trim()))) {
            console.log(`[qr-connect] QR obtained as raw image/base64 on attempt ${i + 1}`);
            return { qr: text.trim(), alreadyLoggedIn: false };
          }
          try {
            const data = JSON.parse(text);
            const qr = extractQr(data);
            if (qr) {
              console.log(`[qr-connect] QR obtained on attempt ${i + 1} from ${endpoint}`);
              return { qr, alreadyLoggedIn: false };
            }
          } catch { /* not json */ }
        }
      } catch { /* ignore */ }
    }
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return { qr: null, alreadyLoggedIn: false };
}

/** Sync instance as connected in DB */
async function markConnected(
  supabase: any,
  ownerId: string,
  instanceName: string,
  connectedPhone: string | null,
) {
  console.log(`[qr-connect] Marking "${instanceName}" as connected for user ${ownerId}`);

  await supabase
    .from("whatsapp_settings")
    .upsert({
      owner_id: ownerId,
      evolution_instance_id: instanceName,
      is_active: true,
    }, { onConflict: "owner_id" });

  try {
    await supabase
      .from("whatsapp_instances")
      .upsert({
        user_id: ownerId,
        instance_name: instanceName,
        instance_id: instanceName,
        status: "open",
        ai_enabled: true,
        ai_mode: "drippy",
        ai_agent_id: null,
        connected_at: new Date().toISOString(),
        ...(connectedPhone ? { connected_phone: connectedPhone } : {}),
      } as any, { onConflict: "user_id,instance_name" });
  } catch (e) {
    console.warn("[qr-connect] whatsapp_instances upsert:", String(e));
  }
}

// ── Main Handler ─────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ownerId = user.id;

    // ── Resolve Evolution config ──
    const { data: existing } = await supabase
      .from("whatsapp_settings")
      .select("evolution_instance_id, evolution_api_url, is_active")
      .eq("owner_id", ownerId)
      .maybeSingle();

    const { data: userEvoCfg } = await supabase
      .from("user_evolution_config")
      .select("api_url, api_key")
      .eq("owner_id", ownerId)
      .maybeSingle();

    const { data: globalCfg } = await supabase
      .from("evolution_config")
      .select("api_url, global_api_key")
      .maybeSingle();

    const { apiUrl: baseUrl, apiKey: evolutionApiKey } = resolveEvolutionConfig({
      userApiUrl: userEvoCfg?.api_url ?? existing?.evolution_api_url,
      userApiKey: userEvoCfg?.api_key,
      globalApiUrl: globalCfg?.api_url,
      globalApiKey: globalCfg?.global_api_key,
    });

    if (!baseUrl || !evolutionApiKey) {
      return new Response(JSON.stringify({ ok: false, error: "missing_evolution_config" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[qr-connect] baseUrl=${baseUrl}, owner=${ownerId}`);

    // ══════════════════════════════════════════════════════════════════
    // STEP 1: Fetch ALL instances and check if ANY is already connected
    // ══════════════════════════════════════════════════════════════════
    const allInstances = await fetchAllInstances(baseUrl, evolutionApiKey);
    console.log(`[qr-connect] Found ${allInstances.length} instances in Evolution GO`);

    const connectedInst = findConnectedInstance(allInstances);
    if (connectedInst && connectedInst.name) {
      const phone = connectedInst.ownerJid ? connectedInst.ownerJid.replace(/@.*$/, "").replace(/\D/g, "") : null;
      console.log(`[qr-connect] Already connected instance found: "${connectedInst.name}" phone=${phone}`);

      await markConnected(supabase, ownerId, connectedInst.name, phone);

      // Setup webhook for the connected instance
      const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
      await setupWebhookAndIa(supabase, baseUrl, connectedInst.token || evolutionApiKey, connectedInst.name, ownerId, webhookUrl);

      return new Response(JSON.stringify({
        ok: true,
        already_connected: true,
        instance_id: connectedInst.name,
        connected_phone: phone,
        state: "open",
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 2: No connected instance → try to use existing DB instance name or create new
    // ══════════════════════════════════════════════════════════════════
    const stableSuffix = ownerId.replace(/-/g, "").slice(0, 12);

    const { data: existingInst } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let instanceName = existing?.evolution_instance_id || existingInst?.instance_name || `onedrip_${stableSuffix}`;

    // Check if this instance exists in Evolution GO
    const existingEvolution = findInstance(allInstances, instanceName);

    if (existingEvolution?.token) {
      console.log(`[qr-connect] Instance "${instanceName}" exists in Evolution GO, status: ${existingEvolution.status}`);

      // Upsert DB records
      await supabase.from("whatsapp_settings")
        .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });

      // Connect
      try {
        const connectRes = await fetch(`${baseUrl}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: existingEvolution.token },
          body: JSON.stringify({ immediate: true }),
        });
        const connectBody = await connectRes.text();
        console.log(`[qr-connect] POST /instance/connect: ${connectRes.status} ${connectBody.slice(0, 200)}`);

        if (connectRes.ok) {
          try {
            const qr = extractQr(JSON.parse(connectBody));
            if (qr) {
              const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
              await setupWebhookAndIa(supabase, baseUrl, existingEvolution.token, instanceName, ownerId, webhookUrl);
              return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch { /* not json */ }
        }
      } catch (e) {
        console.warn(`[qr-connect] connect call failed:`, String(e));
      }

      // Poll for QR (also detects "already logged in")
      const { qr, alreadyLoggedIn } = await pollQr(baseUrl, existingEvolution.token, instanceName);

      if (alreadyLoggedIn) {
        await markConnected(supabase, ownerId, instanceName, null);
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
        await setupWebhookAndIa(supabase, baseUrl, existingEvolution.token, instanceName, ownerId, webhookUrl);
        return new Response(JSON.stringify({ ok: true, already_connected: true, instance_id: instanceName, state: "open" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (qr) {
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
        await setupWebhookAndIa(supabase, baseUrl, existingEvolution.token, instanceName, ownerId, webhookUrl);
        return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 3: Instance doesn't exist → create it
    // ══════════════════════════════════════════════════════════════════
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

    const createBody = { name: instanceName, token: newToken };
    console.log(`[qr-connect] Creating instance: ${JSON.stringify(createBody)}`);

    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
      body: JSON.stringify(createBody),
    });
    const createText = await createRes.text();
    console.log(`[qr-connect] Create response: ${createRes.status} ${createText.slice(0, 300)}`);

    let createdToken = newToken;

    if (!createRes.ok) {
      console.warn(`[qr-connect] Create failed (${createRes.status})`);
      // Try resolving existing instance token
      const refreshed = await fetchAllInstances(baseUrl, evolutionApiKey);
      const resolved = findInstance(refreshed, instanceName);
      if (resolved?.token) {
        createdToken = resolved.token;
      } else {
        return new Response(JSON.stringify({ ok: false, error: "instance_create_failed", detail: `${createRes.status}: ${createText.slice(0, 200)}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      try {
        const createData = JSON.parse(createText);
        const d = createData?.data ?? createData;
        createdToken = d?.token ?? createData?.instance?.token ?? newToken;

        const qr = extractQr(createData);
        if (qr) {
          await supabase.from("whatsapp_settings")
            .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });
          await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
          return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* not json */ }
    }

    // Upsert DB
    await supabase.from("whatsapp_settings")
      .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });

    try {
      await supabase.from("whatsapp_instances")
        .upsert({
          user_id: ownerId, instance_name: instanceName, instance_id: instanceName,
          status: "created", ai_enabled: true, ai_mode: "drippy", ai_agent_id: null,
        } as any, { onConflict: "user_id,instance_name" });
    } catch { /* ignore */ }

    // Connect
    console.log(`[qr-connect] Calling POST /instance/connect with token ...${createdToken.slice(-6)}`);
    try {
      const connectRes = await fetch(`${baseUrl}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: createdToken },
        body: JSON.stringify({ immediate: true }),
      });
      const connectText = await connectRes.text();
      console.log(`[qr-connect] Connect: ${connectRes.status} ${connectText.slice(0, 200)}`);
      if (connectRes.ok) {
        try {
          const qr = extractQr(JSON.parse(connectText));
          if (qr) {
            await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
            return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch { /* not json */ }
      }
    } catch (e) {
      console.warn(`[qr-connect] Connect failed:`, String(e));
    }

    // Poll QR
    const { qr, alreadyLoggedIn } = await pollQr(baseUrl, createdToken, instanceName);

    if (alreadyLoggedIn) {
      await markConnected(supabase, ownerId, instanceName, null);
      await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
      return new Response(JSON.stringify({ ok: true, already_connected: true, instance_id: instanceName, state: "open" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (qr) {
      await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
      return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.error(`[qr-connect] QR not available for "${instanceName}" after all attempts`);
    return new Response(JSON.stringify({ ok: false, error: "qr_code_missing", instance: instanceName }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("[qr-connect] Fatal error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Post-QR setup: webhook + IA config ──────────────────────────────

async function setupWebhookAndIa(
  supabase: any,
  baseUrl: string,
  instanceKey: string,
  instanceName: string,
  ownerId: string,
  webhookUrl: string,
) {
  const webhookEvents = [
    "MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED",
    "MESSAGES_UPDATE", "PRESENCE_UPDATE",
    "messages.upsert", "connection.update", "qrcode.updated",
    "messages.update", "presence.update",
  ];

  try {
    const res = await fetch(`${baseUrl}/webhook/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: instanceKey },
      body: JSON.stringify({ url: webhookUrl, enabled: true, byEvents: true, events: webhookEvents }),
    });
    if (res.ok) {
      console.log("[qr-connect] Webhook set OK");
    } else {
      await res.text();
    }
  } catch { /* ignore */ }

  try {
    const { data: existingIaCfg } = await supabase
      .from("ia_configs")
      .select("id")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (!existingIaCfg) {
      await supabase.from("ia_configs").insert({
        owner_id: ownerId,
        ai_name: "Assistente IA",
        personality: "Seja profissional, educado e objetivo. Responda em português brasileiro.",
        welcome_message: "Olá! Sou o assistente virtual. Como posso ajudá-lo?",
        away_message: "No momento estou indisponível. Retornarei em breve!",
        web_search_enabled: false,
      });
      console.log("[qr-connect] Auto-created ia_configs for user", ownerId);
    }
  } catch (e) {
    console.warn("[qr-connect] ia_configs auto-create skipped:", String(e));
  }
}
