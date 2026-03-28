import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = String(input);
  // common WhatsApp formats
  const cleaned = s
    .replace(/@s\.whatsapp\.net$/i, "")
    .replace(/@g\.us$/i, "")
    .replace(/@lid$/i, "")
    .replace(/\D/g, "");
  return cleaned.length ? cleaned : null;
}

function extractInstanceId(body: any): string | null {
  const raw =
    body?.instanceId ??
    body?.instance_id ??
    body?.instanceName ??
    body?.instance_name ??
    body?.instance ??
    body?.data?.instanceId ??
    body?.data?.instance_id ??
    body?.data?.instanceName ??
    body?.data?.instance_name ??
    body?.data?.instance;

  if (!raw) return null;
  if (typeof raw === "string") return raw;
  return raw?.id || raw?.name || raw?.instanceName || raw?.instance || null;
}

function extractMessageText(body: any): string | null {
  // accept explicit
  if (typeof body?.message_text === "string") return body.message_text;
  if (typeof body?.text === "string") return body.text;

  // Most Evolution payloads: message is usually in body.data.message
  const msg = body?.data?.message ?? body?.message ?? body?.data;

  // Text
  const conversation = msg?.message?.conversation ?? msg?.conversation;
  if (typeof conversation === "string" && conversation.trim()) return conversation;

  const extendedText = msg?.message?.extendedTextMessage?.text ?? msg?.extendedTextMessage?.text;
  if (typeof extendedText === "string" && extendedText.trim()) return extendedText;

  // Media captions
  const imageCaption = msg?.imageMessage?.caption ?? msg?.message?.imageMessage?.caption;
  if (typeof imageCaption === "string" && imageCaption.trim()) return imageCaption;

  const videoCaption = msg?.videoMessage?.caption ?? msg?.message?.videoMessage?.caption;
  if (typeof videoCaption === "string" && videoCaption.trim()) return videoCaption;

  const documentCaption = msg?.documentMessage?.caption ?? msg?.message?.documentMessage?.caption;
  if (typeof documentCaption === "string" && documentCaption.trim()) return documentCaption;

  // Button/list replies
  const buttonsText = msg?.buttonsResponseMessage?.selectedDisplayText;
  if (typeof buttonsText === "string" && buttonsText.trim()) return buttonsText;

  const listTitle = msg?.listResponseMessage?.title;
  if (typeof listTitle === "string" && listTitle.trim()) return listTitle;

  return null;
}

function isOutgoingFromMe(body: any): boolean {
  // messages.upsert payload usually has: data.key.fromMe
  const fromMe = body?.data?.key?.fromMe ?? body?.data?.message?.key?.fromMe ?? body?.key?.fromMe;
  return Boolean(fromMe);
}

function isMessageEvent(body: any): boolean {
  const ev = String(body?.event ?? body?.data?.event ?? "");
  // Accept both legacy dot-case and upper-case
  return ev.toLowerCase() === "messages.upsert" || ev.toUpperCase() === "MESSAGES_UPSERT";
}

function extractRemoteJid(body: any): string | null {
  // Evolution payloads vary a lot; try several common locations
  const candidates = [
    body?.remoteJid,
    body?.data?.remoteJid,
    body?.data?.key?.remoteJid,
    body?.data?.key?.remoteJidAlt,
    body?.data?.message?.key?.remoteJid,
    body?.message?.key?.remoteJid,
    body?.sender,
    // Sometimes data is an array (e.g. chats.upsert)
    ...(Array.isArray(body?.data)
      ? body.data.flatMap((d: any) => [d?.remoteJid, d?.key?.remoteJid, d?.sender, d?.from])
      : []),
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

function extractExternalMessageId(body: any): string | null {
  const candidates = [
    body?.data?.key?.id,
    body?.data?.message?.key?.id,
    body?.key?.id,
    body?.data?.id,
    body?.id,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[whatsapp-context] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const instanceId = extractInstanceId(body);

    // audit first (owner may be resolved later)
    const auditInsert = await supabase
      .from("whatsapp_webhook_events")
      .insert({
        owner_id: null,
        source: String(body?.source ?? "evolution"),
        event_type: body?.event ? String(body.event) : null,
        phone_number: normalizePhone(body?.phone_number ?? extractRemoteJid(body)),
        request_id: requestId,
        payload: body,
        status: "received",
      })
      .select("id")
      .maybeSingle();

    const auditId = auditInsert.data?.id ?? null;

    // Resolve owner by instance
    let ownerId: string | null = null;
    let instanceActive = false;
    let canonicalInstanceName: string | null = null;

    if (instanceId) {
      // Preferred: resolve via whatsapp_instances (works for multi-instância e evita dependência de whatsapp_settings)
      // instanceId pode ser tanto instance_name (string) quanto instance_id (UUID) dependendo do caller.
      const { data: instByName } = await supabase
        .from("whatsapp_instances")
        .select("user_id, instance_name, instance_id")
        .eq("instance_name", instanceId)
        .maybeSingle();

      const { data: instById } = instByName
        ? { data: null }
        : await supabase
            .from("whatsapp_instances")
            .select("user_id, instance_name, instance_id")
            .eq("instance_id", instanceId)
            .maybeSingle();

      const inst = instByName ?? instById ?? null;
      if (inst?.user_id) ownerId = inst.user_id;
      canonicalInstanceName = inst?.instance_name ?? null;

      const { data: s } = await supabase
        .from("whatsapp_settings")
        .select("owner_id, is_active")
        .eq("evolution_instance_id", instanceId)
        .maybeSingle();

      // whatsapp_settings é legado/single-instance; ainda usamos para is_active quando bater.
      if (s?.owner_id) ownerId = s.owner_id;
      instanceActive = Boolean(s?.is_active);

      // Se não bateu por instanceId bruto, tenta também pelo instance_name canônico
      if (!instanceActive && canonicalInstanceName && canonicalInstanceName !== instanceId) {
        const { data: s2 } = await supabase
          .from("whatsapp_settings")
          .select("owner_id, is_active")
          .eq("evolution_instance_id", canonicalInstanceName)
          .maybeSingle();
        if (s2?.owner_id && !ownerId) ownerId = s2.owner_id;
        if (typeof s2?.is_active === "boolean") instanceActive = Boolean(s2.is_active);
      }
    }

    // Allow explicit owner override (use carefully)
    if (!ownerId && typeof body?.owner_id === "string") ownerId = body.owner_id;

    if (!ownerId) {
      if (auditId) {
        await supabase
          .from("whatsapp_webhook_events")
          .update({ status: "ignored", error_message: "owner_not_resolved", processed_at: new Date().toISOString() })
          .eq("id", auditId);
      }

      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "owner_not_resolved" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CONNECTION_UPDATE events are what tells us the QR was scanned and the session is connected.
    // IMPORTANT: we must handle this even when whatsapp_settings.is_active is currently false.
    const eventType = String(body?.event ?? body?.data?.event ?? "");
    const eventTypeUpper = eventType.toUpperCase();

    const isConnectionUpdate =
      eventTypeUpper === "CONNECTION_UPDATE" ||
      eventTypeUpper === "CONNECTION.UPDATE" ||
      eventTypeUpper.includes("CONNECTION");

    if (isConnectionUpdate && instanceId) {
      const state =
        body?.data?.state ??
        body?.data?.instance?.state ??
        body?.instance?.state ??
        body?.state ??
        body?.data?.connection?.state ??
        body?.data?.instance?.connectionState ??
        null;

      const statusReason = body?.data?.statusReason ?? body?.statusReason ?? null;

      const normalized = typeof state === "string" ? state.toLowerCase() : "unknown";

      // Avoid flapping is_active on transient states (Evolution can emit connecting/close while reconnecting).
      // - open/connected => active
      // - close/disconnected => inactive ONLY when it's a definitive close (not transient 428)
      // - otherwise keep current value
      const isOpen = normalized === "open" || normalized === "connected";
      const isClosed = normalized === "close" || normalized === "closed" || normalized === "disconnected";
      const transientClose = isClosed && String(statusReason ?? "") === "428";

      const nextActive = isOpen ? true : transientClose ? instanceActive : isClosed ? false : instanceActive;

      await supabase
        .from("whatsapp_settings")
        .update({ is_active: nextActive })
        .eq("owner_id", ownerId);

      if (auditId) {
        await supabase
          .from("whatsapp_webhook_events")
          .update({ owner_id: ownerId, status: "processed", processed_at: new Date().toISOString(), error_message: null })
          .eq("id", auditId);
      }

      return new Response(
        JSON.stringify({ ok: true, owner_id: ownerId, instance_id: instanceId, state, status_reason: statusReason, is_active: nextActive }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For non-connection events, we normally only process if the instance is active.
    // However, some Evolution deployments do not emit a CONNECTION_UPDATE event reliably.
    // In that case, receiving non-QR events (like messages/contacts/chats/presence) is a strong
    // signal that the session is already connected — so we auto-activate it.
    if (!instanceActive && instanceId) {
      const eventLower = eventType.toLowerCase();
      const isQrRelated = eventLower.includes("qrcode") || eventLower.includes("qr");

      if (!isQrRelated) {
        await supabase.from("whatsapp_settings").update({ is_active: true }).eq("owner_id", ownerId);
        instanceActive = true;
      }
    }

    if (!instanceActive) {
      if (auditId) {
        await supabase
          .from("whatsapp_webhook_events")
          .update({ owner_id: ownerId, status: "ignored", error_message: "instance_inactive", processed_at: new Date().toISOString() })
          .eq("id", auditId);
      }

      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "instance_inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize phone — for LID contacts, the real phone is in `sender`, not `remoteJid`
    const rawJidCandidate = extractRemoteJid(body);
    const isLidJid = typeof rawJidCandidate === "string" && rawJidCandidate.includes("@lid");

    // Extract pushName from webhook for LID matching
    const pushName = body?.data?.pushName ?? body?.data?.message?.pushName ?? body?.pushName ?? null;

    // `sender` field contains the real phone (e.g. 5564...@s.whatsapp.net) even for LID contacts
    const senderField = body?.sender ?? body?.data?.sender ?? body?.data?.participant ?? null;
    const senderPhone = typeof senderField === "string" ? normalizePhone(senderField) : null;

    // For LID contacts, the `sender` field contains the CONNECTED instance's number (owner),
    // NOT the contact's real number. So we must NOT use sender as the contact phone.
    // Instead, use the LID numeric part as a stable identifier for the contact.
    // For normal (non-LID) contacts, remoteJid contains the real phone number.
    const phone = normalizePhone(body?.phone_number) ?? normalizePhone(rawJidCandidate);

    if (!phone) {
      if (auditId) {
        await supabase
          .from("whatsapp_webhook_events")
          .update({ owner_id: ownerId, status: "error", error_message: "phone_not_found", processed_at: new Date().toISOString() })
          .eq("id", auditId);
      }

      return new Response(JSON.stringify({ ok: false, error: "phone_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process message-related events for CRM persistence.
    // Other webhook events (presence, contacts, chats, etc.) can carry phone identifiers but are not messages.
    if (!isMessageEvent(body)) {
      if (auditId) {
        await supabase
          .from("whatsapp_webhook_events")
          .update({ owner_id: ownerId, status: "processed", processed_at: new Date().toISOString(), error_message: null })
          .eq("id", auditId);
      }

      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "non_message_event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert conversation (race-safe)
    const nowIso = new Date().toISOString();

    const rawJid = extractRemoteJid(body) ?? (phone.includes("@") ? phone : `${phone}@s.whatsapp.net`);

    // Extract real phone JID for LID contacts
    // IMPORTANT: The "sender" field is the OWNER's phone, NOT the contact's.
    // Only use remoteJidAlt if it explicitly contains a different @s.whatsapp.net JID.
    const remoteJidAlt: string | null =
      body?.data?.key?.remoteJidAlt ??
      body?.data?.remoteJidAlt ??
      body?.message?.key?.remoteJidAlt ??
      null;

    let bestAltJid: string | null = null;

    if (isLidJid && remoteJidAlt && typeof remoteJidAlt === "string" && remoteJidAlt.includes("@s.whatsapp.net")) {
      bestAltJid = remoteJidAlt;
      console.log("[whatsapp-context] LID contact resolved via remoteJidAlt:", bestAltJid);
    }

    // If LID contact and no alt JID found in payload, try to resolve via Evolution API
    if (isLidJid && !bestAltJid) {
      console.log("[whatsapp-context] LID contact, attempting Evolution API resolution for:", rawJid);

      // Fetch Evolution config to call their API
      const { data: userEvoCfg } = await supabase
        .from("user_evolution_config")
        .select("api_url, api_key")
        .eq("owner_id", ownerId)
        .maybeSingle();

      const { data: evoCfg } = await supabase
        .from("evolution_config")
        .select("api_url, global_api_key")
        .maybeSingle();

      const { apiUrl: evoApiUrl, apiKey: evoApiKey } = resolveEvolutionConfig({
        userApiUrl: userEvoCfg?.api_url,
        userApiKey: userEvoCfg?.api_key,
        globalApiUrl: evoCfg?.api_url,
        globalApiKey: evoCfg?.global_api_key,
      });
      const resolveInstance = canonicalInstanceName ?? instanceId;

      if (evoApiUrl && evoApiKey && resolveInstance) {
        try {
          // Try /chat/findContacts to resolve LID to real phone
          const findUrl = `${evoApiUrl.replace(/\/$/, "")}/chat/findContacts/${resolveInstance}`;
          const findRes = await fetch(findUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evoApiKey,
              Authorization: `Bearer ${evoApiKey}`,
            },
            body: JSON.stringify({ where: { id: rawJidCandidate } }),
          });

          if (findRes.ok) {
            const findData = await findRes.json();
            const contacts = Array.isArray(findData) ? findData : [findData];
            console.log("[whatsapp-context] findContacts returned", contacts.length, "contacts, matching pushName:", pushName);

            // Strategy 1: Match by pushName (most reliable for LID contacts)
            if (pushName && typeof pushName === "string") {
              for (const c of contacts) {
                if (c?.pushName === pushName && typeof c?.remoteJid === "string" && c.remoteJid.includes("@s.whatsapp.net")) {
                  bestAltJid = c.remoteJid;
                  console.log("[whatsapp-context] LID resolved via pushName match:", bestAltJid);
                  break;
                }
              }
            }

            // Strategy 2: If no pushName match, look for any contact with real JID that matches the LID
            if (!bestAltJid) {
              for (const c of contacts) {
                const candidateJid = c?.remoteJid ?? c?.id ?? c?.jid;
                if (typeof candidateJid === "string" && candidateJid.includes("@s.whatsapp.net")) {
                  // Only use if it was a filtered response (single result)
                  if (contacts.length === 1) {
                    bestAltJid = candidateJid;
                    console.log("[whatsapp-context] LID resolved via single findContacts result:", bestAltJid);
                  }
                  break;
                }
              }
            }
          } else {
            console.warn("[whatsapp-context] findContacts failed:", findRes.status, await findRes.text());
          }
        } catch (e) {
          console.warn("[whatsapp-context] Evolution API resolution error:", String(e));
        }
      }

      if (!bestAltJid) {
        console.log("[whatsapp-context] LID contact could not be resolved, will use LID JID directly:", rawJid);
      }
    }

    const upsertPayload: Record<string, unknown> = {
      owner_id: ownerId,
      phone_number: phone,
      status: "open",
      last_message_at: nowIso,
      remote_jid: rawJid,
    };

    // Store the alt JID (only if it's a real phone, not the owner's)
    if (bestAltJid) {
      upsertPayload.remote_jid_alt = bestAltJid;
    }
    // Clear wrong alt JID if previously stored incorrectly
    if (isLidJid && !bestAltJid) {
      upsertPayload.remote_jid_alt = null;
    }

    const { data: upsertedConv, error: upsertError } = await supabase
      .from("whatsapp_conversations")
      .upsert(upsertPayload, { onConflict: "owner_id,phone_number" })
      .select("id")
      .single();

    if (upsertError) throw upsertError;

    const conversationId = upsertedConv.id;

    const messageText = extractMessageText(body);
    const externalMessageId = extractExternalMessageId(body);
    const remoteJid = rawJid;

    const isInbound = isMessageEvent(body) && !isOutgoingFromMe(body);

    // Always persist a message row (even for media without caption), otherwise Atendimento fica vazio.
    const msg = body?.data?.message ?? body?.message ?? body?.data;
    const hasImage = Boolean(msg?.imageMessage ?? msg?.message?.imageMessage);
    const hasVideo = Boolean(msg?.videoMessage ?? msg?.message?.videoMessage);
    const hasAudio = Boolean(msg?.audioMessage ?? msg?.message?.audioMessage);
    const hasDocument = Boolean(msg?.documentMessage ?? msg?.message?.documentMessage);

    const fallbackContent =
      hasImage ? "📷 Imagem" :
      hasVideo ? "🎥 Vídeo" :
      hasAudio ? "🎤 Áudio" :
      hasDocument ? "📄 Documento" :
      "Nova mensagem";

    const contentToSave = messageText ?? fallbackContent;

    // Only reply to real inbound messages that have meaningful text (caption counts) and are not duplicates
    const shouldReply = Boolean(messageText) && isInbound;

    // If Evolution retries webhooks, we can receive the same inbound message more than once.
    // We dedupe by external_id when present to avoid sending 2 AI replies.
    let isDuplicateInbound = false;

    if (externalMessageId) {
      // IMPORTANT: Postgres upsert requires a non-partial unique constraint. Our unique index on
      // (owner_id, external_id) is partial (WHERE external_id IS NOT NULL), so PostgREST upsert
      // can fail with 42P10. We do a safe insert and treat 23505 as duplicate.
      const { data: inserted, error: insertErr } = await supabase
        .from("whatsapp_messages")
        .insert({
          owner_id: ownerId,
          conversation_id: conversationId,
          direction: isInbound ? "in" : "out",
          content: contentToSave,
          raw_payload: body,
          external_id: externalMessageId,
        })
        .select("id")
        .maybeSingle();

      if (insertErr) {
        // 23505 = unique_violation
        if (String((insertErr as any)?.code ?? "") === "23505") {
          if (shouldReply) isDuplicateInbound = true;
        } else {
          throw insertErr;
        }
      } else {
        // inserted ok
        void inserted;
      }
    } else {
      const { error: msgErr } = await supabase.from("whatsapp_messages").insert({
        owner_id: ownerId,
        conversation_id: conversationId,
        direction: isInbound ? "in" : "out",
        content: contentToSave,
        raw_payload: body,
        external_id: null,
      });
      if (msgErr) throw msgErr;
    }

    // Make the frontend see the inbound message immediately (WebChat listens to new_message)
    try {
      const payload = {
        key: { remoteJid, fromMe: !isInbound, id: externalMessageId ?? crypto.randomUUID() },
        message: { conversation: contentToSave },
        messageTimestamp: Math.floor(Date.now() / 1000),
      };

      if (instanceId) {
        await supabase.channel(`instance-${instanceId}`).send({
          type: "broadcast",
          event: "new_message",
          payload,
        });
      }
    } catch (e) {
      console.warn("[whatsapp-context] Broadcast skipped:", String(e));
    }

     if (shouldReply && messageText && !isDuplicateInbound) {
      // Check if AI is paused for this conversation (human handoff)
      const { data: convCheck } = await supabase
        .from("whatsapp_conversations")
        .select("ai_paused")
        .eq("id", conversationId)
        .maybeSingle();

      if (convCheck?.ai_paused) {
        console.log("[whatsapp-context] AI paused for conversation (human handoff):", conversationId);
        // Skip AI reply — human is handling this conversation
      } else {
      // Determine per-instance AI mode
      let instanceCfg: any = null;
      if (instanceId) {
        const { data: byName } = await supabase
          .from("whatsapp_instances")
          .select("ai_enabled, ai_mode, ai_agent_id")
          .eq("instance_name", instanceId)
          .maybeSingle();
        instanceCfg = byName ?? null;

        if (!instanceCfg) {
          const { data: byId } = await supabase
            .from("whatsapp_instances")
            .select("ai_enabled, ai_mode, ai_agent_id")
            .eq("instance_id", instanceId)
            .maybeSingle();
          instanceCfg = byId ?? null;
        }
      }

      // Respeitar config de IA por instância (ai_enabled, ai_mode, ai_agent_id)
      const aiEnabled = instanceCfg ? instanceCfg.ai_enabled !== false : true;

      if (!aiEnabled) {
        console.log("[whatsapp-context] AI disabled for instance:", instanceId, "— skipping reply");
      } else {
        // Always send using the canonical instance_name (Evolution expects instanceName in the URL)
        const sendInstanceId = canonicalInstanceName ?? instanceId;
        const aiMode = instanceCfg?.ai_mode ?? "drippy";
        const aiAgentId = instanceCfg?.ai_agent_id ?? null;

        fetch(`${supabaseUrl}/functions/v1/whatsapp-ai-reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            owner_id: ownerId,
            conversation_id: conversationId,
            instance_id: sendInstanceId,
            user_message: messageText,
            ai_mode: aiMode,
            ai_agent_id: aiAgentId,
          }),
        }).catch((err) => console.error("[whatsapp-context] AI reply trigger failed:", err));
      }
      } // end else (ai not paused)
    }

    if (auditId) {
      await supabase
        .from("whatsapp_webhook_events")
        .update({
          owner_id: ownerId,
          conversation_id: conversationId,
          status: "processed",
          processed_at: nowIso,
          error_message: null,
        })
        .eq("id", auditId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        owner_id: ownerId,
        conversation_id: conversationId,
        phone_number: phone,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[whatsapp-context] Fatal error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
