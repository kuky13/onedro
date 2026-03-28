import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";

// ── Helpers ──────────────────────────────────────────────────────────

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

function findConnectedInstance(instances: any[]): { name: string; token: string | null; ownerJid: string | null } | null {
  for (const inst of instances) {
    const isConnected = normalizeIsConnected(inst);
    if (isConnected) {
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

/**
 * Normalize connection status from ANY shape the Evolution GO might return.
 * Returns true if the instance appears connected.
 */
function normalizeIsConnected(data: any): boolean {
  if (!data || typeof data !== "object") return false;

  // Direct boolean flags
  if (data.connected === true) return true;
  if (data.isOpen === true) return true;

  // String status fields - check multiple possible locations
  const candidates = [
    data.state,
    data.status,
    data.connectionStatus,
    data.instance?.state,
    data.instance?.status,
    data.instance?.connectionStatus,
    data.data?.state,
    data.data?.status,
    data.data?.connectionStatus,
    data.connection?.state,
    data.connection?.status,
  ];

  for (const val of candidates) {
    if (typeof val === "string") {
      const lower = val.toLowerCase();
      if (lower === "open" || lower === "connected" || lower === "online" || lower === "authenticated") {
        return true;
      }
    }
  }

  return false;
}

/** Extract phone/ownerJid from various response shapes */
function extractPhone(data: any): string | null {
  const candidates = [
    data.ownerJid, data.owner, data.instance?.ownerJid,
    data.data?.ownerJid, data.connection?.ownerJid,
    data.me?.id, data.wid?._serialized,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.length > 5) {
      return val.replace(/@.*$/, "").replace(/\D/g, "");
    }
  }
  return null;
}

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

async function markConnected(
  supabase: any,
  ownerId: string,
  instanceName: string,
  connectedPhone: string | null,
) {
  console.log(`[qr-connect] Marking "${instanceName}" as connected for user ${ownerId}, phone=${connectedPhone}`);

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

/** Auto-create ia_configs if missing */
async function ensureIaConfig(supabase: any, ownerId: string) {
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

/**
 * ROBUST status check: tries multiple endpoints with instance token,
 * then falls back to /instance/all with global key.
 */
async function checkAndSyncStatus(
  supabase: any,
  baseUrl: string,
  evolutionApiKey: string,
  ownerId: string,
  instanceName?: string,
): Promise<{ connected: boolean; instance_name: string | null; phone: string | null }> {

  // 1. Fetch all instances to resolve instance token
  const allInstances = await fetchAllInstances(baseUrl, evolutionApiKey);
  console.log(`[qr-connect] check_status: ${allInstances.length} instances found`);

  // 2. If we have a specific instance name, try dedicated status endpoints with its token
  if (instanceName) {
    const inst = findInstance(allInstances, instanceName);
    const token = inst?.token || evolutionApiKey;
    
    console.log(`[qr-connect] check_status: instance "${instanceName}" found=${!!inst}, token=${token ? "yes" : "no"}, listStatus="${inst?.status}"`);

    // 2a. Check if /instance/all already shows connected
    if (inst && normalizeIsConnected(inst)) {
      const phone = extractPhone(inst);
      console.log(`[qr-connect] check_status: CONNECTED via /instance/all, phone=${phone}`);
      await markConnected(supabase, ownerId, inst.name, phone);
      return { connected: true, instance_name: inst.name, phone };
    }

    // 2b. Try GET /instance/status with instance token
    const statusEndpoints = [
      `${baseUrl}/instance/status`,
      `${baseUrl}/instance/status/${instanceName}`,
      `${baseUrl}/instance/connectionState`,
      `${baseUrl}/instance/connectionState/${instanceName}`,
    ];

    for (const endpoint of statusEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: "GET",
          headers: { apikey: token },
        });
        if (res.ok) {
          const text = await res.text();
          console.log(`[qr-connect] check_status: ${endpoint} → ${res.status} ${text.slice(0, 300)}`);
          try {
            const data = JSON.parse(text);
            if (normalizeIsConnected(data)) {
              const phone = extractPhone(data);
              console.log(`[qr-connect] check_status: CONNECTED via ${endpoint}, phone=${phone}`);
              await markConnected(supabase, ownerId, instanceName, phone);
              return { connected: true, instance_name: instanceName, phone };
            }
          } catch { /* not json */ }

          // Check for raw "open" or "connected" in response
          const lower = text.toLowerCase();
          if (lower.includes('"open"') || lower.includes('"connected"') || lower.includes('"authenticated"')) {
            console.log(`[qr-connect] check_status: CONNECTED via text match from ${endpoint}`);
            await markConnected(supabase, ownerId, instanceName, null);
            return { connected: true, instance_name: instanceName, phone: null };
          }
        } else {
          // Don't log 404s to reduce noise
          if (res.status !== 404) {
            const text = await res.text();
            console.log(`[qr-connect] check_status: ${endpoint} → ${res.status} ${text.slice(0, 200)}`);
          } else {
            await res.text(); // consume body
          }
        }
      } catch { /* ignore network errors for individual endpoints */ }
    }
  }

  // 3. Fallback: check any connected instance from the full list
  const connectedInst = findConnectedInstance(allInstances);
  if (connectedInst && connectedInst.name) {
    const phone = connectedInst.ownerJid ? connectedInst.ownerJid.replace(/@.*$/, "").replace(/\D/g, "") : null;
    console.log(`[qr-connect] check_status: found OTHER connected instance "${connectedInst.name}", phone=${phone}`);
    await markConnected(supabase, ownerId, connectedInst.name, phone);
    return { connected: true, instance_name: connectedInst.name, phone };
  }

  console.log(`[qr-connect] check_status: NOT connected`);
  return { connected: false, instance_name: null, phone: null };
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

    // ── Parse body ──
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body is ok */ }

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

    // ══════════════════════════════════════════════════════════════════
    // ACTION: check_status — lightweight status check for frontend polling
    // ══════════════════════════════════════════════════════════════════
    if (body.action === "check_status") {
      const instanceName = body.instance_name || existing?.evolution_instance_id;
      console.log(`[qr-connect] check_status for "${instanceName}"`);
      
      const result = await checkAndSyncStatus(supabase, baseUrl, evolutionApiKey, ownerId, instanceName);
      
      return new Response(JSON.stringify({
        ok: true,
        connected: result.connected,
        instance_name: result.instance_name,
        connected_phone: result.phone,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      await ensureIaConfig(supabase, ownerId);

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
    // STEP 2: No connected instance → try existing or create new
    // ══════════════════════════════════════════════════════════════════
    const stableSuffix = ownerId.replace(/-/g, "").slice(0, 12);

    const { data: existingInst } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const instanceName = existing?.evolution_instance_id || existingInst?.instance_name || `onedrip_${stableSuffix}`;

    const existingEvolution = findInstance(allInstances, instanceName);
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

    // Build connect body WITH webhookUrl (Evolution GO configures webhook here)
    const connectBody = {
      immediate: true,
      webhookUrl,
      subscribe: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPDATE"],
    };

    if (existingEvolution?.token) {
      console.log(`[qr-connect] Instance "${instanceName}" exists in Evolution GO, status: ${existingEvolution.status}`);

      await supabase.from("whatsapp_settings")
        .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });

      // Connect with webhookUrl
      try {
        const connectRes = await fetch(`${baseUrl}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: existingEvolution.token },
          body: JSON.stringify(connectBody),
        });
        const connectText = await connectRes.text();
        console.log(`[qr-connect] POST /instance/connect: ${connectRes.status} ${connectText.slice(0, 200)}`);

        if (connectRes.ok) {
          try {
            const qr = extractQr(JSON.parse(connectText));
            if (qr) {
              await ensureIaConfig(supabase, ownerId);
              return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch { /* not json */ }
        }
      } catch (e) {
        console.warn(`[qr-connect] connect call failed:`, String(e));
      }

      const { qr, alreadyLoggedIn } = await pollQr(baseUrl, existingEvolution.token, instanceName);

      if (alreadyLoggedIn) {
        await markConnected(supabase, ownerId, instanceName, null);
        await ensureIaConfig(supabase, ownerId);
        return new Response(JSON.stringify({ ok: true, already_connected: true, instance_id: instanceName, state: "open" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (qr) {
        await ensureIaConfig(supabase, ownerId);
        return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 3: Instance doesn't exist → create it
    // ══════════════════════════════════════════════════════════════════
    const newToken = crypto.randomUUID().replace(/-/g, "");
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
      const refreshed = await fetchAllInstances(baseUrl, evolutionApiKey);
      const resolved = findInstance(refreshed, instanceName);
      if (resolved?.token) {
        createdToken = resolved.token;
      } else {
        return new Response(JSON.stringify({
          ok: false, error: "create_failed", create_status: createRes.status,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else {
      try {
        const parsed = JSON.parse(createText);
        if (parsed.token) createdToken = parsed.token;
        if (parsed.instance?.token) createdToken = parsed.instance.token;
      } catch { /* keep newToken */ }
    }

    // Save to DB immediately
    await supabase.from("whatsapp_settings")
      .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });

    try {
      await supabase.from("whatsapp_instances")
        .upsert({
          user_id: ownerId,
          instance_name: instanceName,
          instance_id: instanceName,
          status: "created",
          ai_enabled: true,
          ai_mode: "drippy",
        } as any, { onConflict: "user_id,instance_name" });
    } catch (e) {
      console.warn("[qr-connect] instances upsert:", String(e));
    }

    // Connect with webhookUrl
    try {
      const connectRes = await fetch(`${baseUrl}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: createdToken },
        body: JSON.stringify(connectBody),
      });
      const connectText = await connectRes.text();
      console.log(`[qr-connect] POST /instance/connect (new): ${connectRes.status} ${connectText.slice(0, 200)}`);

      if (connectRes.ok) {
        try {
          const qr = extractQr(JSON.parse(connectText));
          if (qr) {
            await ensureIaConfig(supabase, ownerId);
            return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
              status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch { /* not json */ }
      }
    } catch (e) {
      console.warn(`[qr-connect] connect (new) failed:`, String(e));
    }

    // Poll for QR
    const { qr, alreadyLoggedIn } = await pollQr(baseUrl, createdToken, instanceName);

    if (alreadyLoggedIn) {
      await markConnected(supabase, ownerId, instanceName, null);
      await ensureIaConfig(supabase, ownerId);
      return new Response(JSON.stringify({ ok: true, already_connected: true, instance_id: instanceName, state: "open" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (qr) {
      await ensureIaConfig(supabase, ownerId);
      return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: false, error: "qr_code_missing", instance: instanceName,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[qr-connect] Unhandled error:", err);
    return new Response(JSON.stringify({ ok: false, error: "internal_error", message: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
