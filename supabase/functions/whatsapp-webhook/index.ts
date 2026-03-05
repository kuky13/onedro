import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function postToInternalFunction(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  functionName: string;
  payload: unknown;
}) {
  const response = await fetch(`${params.supabaseUrl}/functions/v1/${params.functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params.payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`[${params.functionName}] HTTP ${response.status}: ${responseText}`);
  }

  return responseText;
}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[whatsapp-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response("Misconfigured", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: any = null;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[whatsapp-webhook] Invalid JSON body", e);
      return new Response("Invalid JSON", { status: 200, headers: corsHeaders });
    }

    // Evolution API v2 envia eventos em UPPERCASE (ex: MESSAGES_UPSERT)
    const event = body?.event || body?.type;
    const rawInstance =
      body?.instance ??
      body?.instanceName ??
      body?.data?.instance ??
      body?.data?.instanceName ??
      body?.instanceId ??
      body?.data?.instanceId;

    const instanceName =
      typeof rawInstance === "string"
        ? rawInstance
        : rawInstance?.instanceName || rawInstance?.name || rawInstance?.instance || rawInstance?.id;

    if (!instanceName) {
      console.log("[whatsapp-webhook] Ignored: no instance in payload");
      return new Response("No instance", { status: 200, headers: corsHeaders });
    }

    let { data: instData, error: instErr } = await supabase
      .from("whatsapp_instances")
      .select("user_id, ai_enabled, instance_name")
      .eq("instance_name", instanceName)
      .single();

    // Fallback: Tentar buscar pelo instance_id se não achar pelo nome
    if (!instData) {
      const { data: instById } = await supabase
        .from("whatsapp_instances")
        .select("user_id, ai_enabled, instance_name")
        .eq("instance_id", instanceName)
        .single();
      instData = instById ?? null;
    }

    // Fallback adicional para o fluxo WAHA/SuperAdmin que usa whatsapp_zapi_settings
    if (!instData) {
      const { data: activeSettings, error: settingsErr } = await supabase
        .from("whatsapp_zapi_settings")
        .select("owner_id, waha_session, evolution_instance_name")
        .eq("is_active", true)
        .or(`waha_session.eq.${instanceName},evolution_instance_name.eq.${instanceName}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSettings?.owner_id) {
        instData = {
          user_id: activeSettings.owner_id,
          ai_enabled: true,
          instance_name:
            activeSettings.waha_session || activeSettings.evolution_instance_name || instanceName,
        };
      } else if (settingsErr) {
        console.log("[whatsapp-webhook] settings fallback error:", settingsErr);
      }
    }

    if (!instData) {
      console.log(`[whatsapp-webhook] Instance not found for '${instanceName}' (event=${event ?? "n/a"})`);
      if (instErr) console.log("[whatsapp-webhook] instance lookup error:", instErr);
      return new Response("Instance not found", { status: 200, headers: corsHeaders });
    }

    // Use canonical instance name from DB for broadcasting
    const broadcastInstanceName = instData.instance_name;

    const isMessageEvent = event === "MESSAGES_UPSERT" || event === "messages.upsert";
    const isTestEvent = event === "test_webhook";

    let message: any = null;

    if (isMessageEvent) {
      // Evolution/Baileys podem entregar a mensagem em formatos diferentes.
      // Precisamos SEMPRE tentar chegar num objeto que tenha .key.

      // Prioridade 1: body.data já é a mensagem completa (tem key)
      if (body?.data?.key) message = body.data;
      // Prioridade 2: body.message na raiz tem key
      else if (body?.message?.key) message = body.message;
      // Prioridade 3: Array de mensagens em body.data
      else if (Array.isArray(body?.data) && body.data[0]?.key) message = body.data[0];
      // Prioridade 4: message dentro de data
      else if (body?.data?.message?.key) message = body.data.message;
      // Prioridade 5: data.messages (muito comum para contatos privados)
      else if (Array.isArray(body?.data?.messages) && body.data.messages[0]?.key) message = body.data.messages[0];
      // Prioridade 6: data.messages.records (variações)
      else if (Array.isArray(body?.data?.messages?.records) && body.data.messages.records[0]?.key) message = body.data.messages.records[0];
      // Fallback (ainda assim vai gerar hasKey=false, mas mantém observabilidade)
      else message = body?.data?.message ?? body?.message ?? body?.data ?? body;
    }

    const remoteJid = message?.key?.remoteJid || message?.remoteJid || message?.jid;
    const hasKey = Boolean(message?.key?.id || message?.key);

    const payloadToSend = isMessageEvent
      ? { event, instanceName: broadcastInstanceName, message: message ?? null, data: body?.data ?? body }
      : { event, instanceName: broadcastInstanceName, data: body?.data ?? body };

    console.log(
      `[whatsapp-webhook] Event=${event} instance=${broadcastInstanceName} (raw=${instanceName}) user=${instData.user_id} hasKey=${hasKey} remoteJid=${remoteJid ?? "n/a"}`
    );

    const channelName = `instance-${broadcastInstanceName}`;

    // 1) Broadcast test signal
    if (isTestEvent) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "test_webhook",
        payload: { success: true, timestamp: Date.now() },
      });
    }

    // 2) Broadcast generic event
    await supabase.channel(channelName).send({
      type: "broadcast",
      event: "whatsapp_event",
      payload: payloadToSend,
    });

    // 3) Message-specific broadcast + AI triage
    if (isMessageEvent) {
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "new_message",
        payload: message,
      });

      // Send to CRM pipeline (persist + optional auto-reply)
      // We always call whatsapp-context; it will decide if it should reply based on per-instance settings.
      const downstreamPayload = {
        ...body,
        instance: typeof body?.instance === "string" ? body.instance : broadcastInstanceName,
        instanceName: broadcastInstanceName,
        instanceId: broadcastInstanceName,
      };

      const downstreamCalls = await Promise.allSettled([
        postToInternalFunction({
          supabaseUrl,
          serviceRoleKey,
          functionName: "whatsapp-context",
          payload: downstreamPayload,
        }),
        postToInternalFunction({
          supabaseUrl,
          serviceRoleKey,
          functionName: "whatsapp-zapi-orcamentos",
          payload: downstreamPayload,
        }),
      ]);

      downstreamCalls.forEach((result, index) => {
        if (result.status === "rejected") {
          const target = index === 0 ? "whatsapp-context" : "whatsapp-zapi-orcamentos";
          console.error(`[whatsapp-webhook] ${target} error:`, result.reason);
        }
      });
    }

    // Connection status updates – keep whatsapp_instances in sync
    const isConnectionEvent = event === "CONNECTION_UPDATE" || event === "connection.update";
    if (isConnectionEvent) {
      const stateRaw = body?.data?.state ?? body?.data?.instance?.state ?? body?.state ?? "";
      const mappedStatus = (stateRaw === "open" || stateRaw === "connected") ? "open" : "disconnected";

      const updatePayload: Record<string, unknown> = {
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      };

      if (mappedStatus === "open") {
        updatePayload.connected_at = new Date().toISOString();
        // Try to extract the connected phone number from the event payload
        const ownerJid = body?.data?.ownerJid ?? body?.data?.instance?.owner ?? body?.data?.wid ?? "";
        if (ownerJid) {
          updatePayload.connected_phone = String(ownerJid).replace(/@.*$/, "").replace(/\D/g, "");
        }
      }

      await supabase
        .from("whatsapp_instances")
        .update(updatePayload)
        .eq("instance_name", broadcastInstanceName);

      // Also keep legacy whatsapp_settings in sync
      await supabase
        .from("whatsapp_settings")
        .update({ is_active: mappedStatus === "open" })
        .eq("owner_id", instData.user_id);

      console.log(`[whatsapp-webhook] CONNECTION_UPDATE instance=${broadcastInstanceName} state=${stateRaw} → ${mappedStatus}`);
    }

    // Presence updates
    if (event === "PRESENCE_UPDATE" || event === "presence.update") {
      const presenceData = body?.data || body;
      await supabase.channel(channelName).send({
        type: "broadcast",
        event: "whatsapp_presence",
        payload: { instanceName: broadcastInstanceName, data: presenceData },
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("[whatsapp-webhook] Fatal error:", e);
    // Always return 200 to Evolution to avoid retries storms
    return new Response("Error", { status: 200, headers: corsHeaders });
  }
});
