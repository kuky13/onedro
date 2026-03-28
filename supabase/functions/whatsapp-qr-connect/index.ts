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

/** Resolve the instance-specific token from GET /instance/all */
async function resolveInstanceToken(
  baseUrl: string,
  globalKey: string,
  instanceName: string
): Promise<{ token: string | null; instanceId: string | null }> {
  try {
    const res = await fetch(`${baseUrl}/instance/all`, {
      method: "GET",
      headers: { apikey: globalKey },
    });
    if (!res.ok) { await res.text(); return { token: null, instanceId: null }; }
    const body = await res.json();
    const instances = Array.isArray(body) ? body : (body?.instances || body?.data || []);
    const target = instances.find((inst: any) => {
      const n = inst.name || inst.instanceName || inst.instance?.instanceName || "";
      return n.toLowerCase() === instanceName.toLowerCase();
    });
    if (target) {
      return {
        token: target.token || target.apikey || target.api_key || null,
        instanceId: target.id || null,
      };
    }
  } catch (e) {
    console.warn("[qr-connect] resolveInstanceToken error:", String(e));
  }
  return { token: null, instanceId: null };
}

/** Poll multiple QR endpoints until QR is available */
async function pollQr(baseUrl: string, instanceKey: string, instanceName?: string, maxAttempts = 15, delayMs = 2000): Promise<string | null> {
  // Try multiple endpoint patterns used by different Evolution GO versions
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
        if (res.ok && text.length > 10) {
          // Check if response is a data URI or base64 image directly
          if (text.startsWith("data:image") || (text.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(text.trim()))) {
            console.log(`[qr-connect] QR obtained as raw image/base64 on attempt ${i + 1}`);
            return text.trim();
          }
          try {
            const data = JSON.parse(text);
            const qr = extractQr(data);
            if (qr) {
              console.log(`[qr-connect] QR obtained on attempt ${i + 1} from ${endpoint}`);
              return qr;
            }
          } catch { /* not json, already checked raw */ }
        }
      } catch { /* ignore network errors */ }
    }
    if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

/** Check instance connection status */
async function checkStatus(baseUrl: string, key: string): Promise<{ state: string; ownerJid: string | null }> {
  try {
    const res = await fetch(`${baseUrl}/instance/status`, {
      method: "GET",
      headers: { apikey: key },
    });
    if (res.ok) {
      const d = await res.json();
      const state = d?.instance?.state ?? d?.state ?? d?.data?.state ?? "unknown";
      const ownerJid = d?.instance?.ownerJid ?? d?.ownerJid ?? null;
      return { state, ownerJid };
    }
    await res.text();
  } catch { /* ignore */ }
  return { state: "unknown", ownerJid: null };
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

    // ── Determine instance name ──
    const stableSuffix = ownerId.replace(/-/g, "").slice(0, 12);

    // Check whatsapp_instances too
    const { data: existingInst } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const instanceName = existing?.evolution_instance_id || existingInst?.instance_name || `onedrip_${stableSuffix}`;

    // ── Upsert whatsapp_settings early (to prevent duplicate creates on repeated clicks) ──
    await supabase
      .from("whatsapp_settings")
      .upsert({ owner_id: ownerId, evolution_api_url: baseUrl, evolution_instance_id: instanceName, is_active: false }, { onConflict: "owner_id" });

    // ── Upsert whatsapp_instances ──
    try {
      await supabase
        .from("whatsapp_instances")
        .upsert({
          user_id: ownerId,
          instance_name: instanceName,
          instance_id: instanceName,
          status: "created",
          ai_enabled: true,
          ai_mode: "drippy",
          ai_agent_id: null,
        } as any, { onConflict: "user_id,instance_name" });
    } catch (e) {
      console.warn("[qr-connect] whatsapp_instances upsert skipped:", String(e));
    }

    // ── Try to resolve an existing instance token ──
    let { token: instanceToken } = await resolveInstanceToken(baseUrl, evolutionApiKey, instanceName);
    let effectiveKey = instanceToken || evolutionApiKey;

    // ── Check if already connected ──
    if (instanceToken) {
      const { state, ownerJid } = await checkStatus(baseUrl, instanceToken);
      console.log(`[qr-connect] Instance "${instanceName}" status: ${state}`);

      if (state === "open" || state === "connected") {
        await supabase.from("whatsapp_settings").update({ is_active: true }).eq("owner_id", ownerId);
        const connectedPhone = ownerJid ? ownerJid.replace(/@.*$/, "") : null;
        try {
          await supabase.from("whatsapp_instances").update({
            status: "open",
            ai_enabled: true,
            ai_mode: "drippy",
            connected_at: new Date().toISOString(),
            ...(connectedPhone ? { connected_phone: connectedPhone } : {}),
          }).eq("user_id", ownerId).eq("instance_name", instanceName);
        } catch { /* ignore */ }

        return new Response(JSON.stringify({ ok: true, already_connected: true, instance_id: instanceName, state }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Instance exists but not connected → connect + get QR ──
      console.log(`[qr-connect] Instance exists but not connected, calling connect...`);

      // POST /instance/connect triggers the QR generation in Evolution GO
      try {
        const connectRes = await fetch(`${baseUrl}/instance/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: instanceToken },
          body: JSON.stringify({ immediate: true }),
        });
        const connectBody = await connectRes.text();
        console.log(`[qr-connect] POST /instance/connect: ${connectRes.status} ${connectBody.slice(0, 200)}`);

        // Check if connect response itself contains a QR
        if (connectRes.ok) {
          try {
            const qr = extractQr(JSON.parse(connectBody));
            if (qr) {
              return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
                status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch { /* not json */ }
        }
      } catch (e) {
        console.warn(`[qr-connect] connect call failed:`, String(e));
      }

      // Poll GET /instance/qr
      const qr = await pollQr(baseUrl, instanceToken, instanceName);
      if (qr) {
        return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Instance doesn't exist in Evolution → create it ──
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
      // Instance may already exist (name conflict) — resolve token
      console.warn(`[qr-connect] Create failed (${createRes.status}), trying to resolve existing instance...`);
      const resolved = await resolveInstanceToken(baseUrl, evolutionApiKey, instanceName);
      if (resolved.token) {
        createdToken = resolved.token;
      } else {
        // Try creating with a unique name
        const retryName = `onedrip_${stableSuffix}_${Math.random().toString(36).slice(2, 7)}`;
        const retryToken = crypto.randomUUID().replace(/-/g, "");
        const retryRes = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
          body: JSON.stringify({ name: retryName, token: retryToken }),
        });
        const retryText = await retryRes.text();
        console.log(`[qr-connect] Retry create "${retryName}": ${retryRes.status} ${retryText.slice(0, 200)}`);

        if (!retryRes.ok) {
          return new Response(JSON.stringify({
            ok: false, error: "instance_create_failed",
            detail: `Original: ${createRes.status}, Retry: ${retryRes.status}`,
          }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Update instance name everywhere
        await supabase.from("whatsapp_settings").update({ evolution_instance_id: retryName }).eq("owner_id", ownerId);
        try {
          await supabase.from("whatsapp_instances").upsert({
            user_id: ownerId, instance_name: retryName, instance_id: retryName,
            status: "created", ai_enabled: true, ai_mode: "drippy", ai_agent_id: null,
          } as any, { onConflict: "user_id,instance_name" });
        } catch { /* ignore */ }

        createdToken = retryToken;
        // Use retryName for the rest
        // Connect + QR
        try {
          await fetch(`${baseUrl}/instance/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: retryToken },
            body: JSON.stringify({ immediate: true }),
          });
        } catch { /* ignore */ }

        const qr = await pollQr(baseUrl, retryToken, retryName);
        if (qr) {
          return new Response(JSON.stringify({ ok: true, instance_id: retryName, qr_code: qr }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ ok: false, error: "qr_code_missing", instance: retryName }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Parse create response for token/QR
      try {
        const createData = JSON.parse(createText);
        const d = createData?.data ?? createData;
        createdToken = d?.token ?? createData?.instance?.token ?? newToken;

        const qr = extractQr(createData);
        if (qr) {
          await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
          return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch { /* not json */ }
    }

    // ── Connect the newly created/existing instance ──
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

    // ── Poll for QR ──
    const qr = await pollQr(baseUrl, createdToken, instanceName);
    if (qr) {
      await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
      return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qr }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Final fallback: try global key for QR ──
    const qrFallback = await pollQr(baseUrl, evolutionApiKey, instanceName, 5, 1500);
    if (qrFallback) {
      await setupWebhookAndIa(supabase, baseUrl, createdToken, instanceName, ownerId, webhookUrl);
      return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qrFallback }), {
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

  // Try to set webhook via Evolution GO endpoint
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

  // Auto-create IA config defaults if not exists
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
