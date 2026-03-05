import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: "supabase_misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { owner_id, conversation_id, user_message, ai_mode: _ai_mode, instance_id } = await req.json();

    if (!owner_id || !conversation_id || !user_message) {
      return new Response(JSON.stringify({ ok: false, error: "missing_required_fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Temporário: Drippy SEMPRE ativa (ignora modelos e desliga/liga)
    const mode = "drippy";

    // Fetch recent messages for context (últimas 20 mensagens para memória permanente)
    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(20);

    const conversationHistory = (messages ?? [])
      .reverse()
      .map((m: { direction: string; content: string }) => ({
        role: m.direction === "in" ? "user" : "assistant",
        content: m.content,
      }));

    // Fetch IA personalization config for this owner
    const { data: iaConfig } = await supabase
      .from("ia_configs")
      .select("ai_name, personality, welcome_message, away_message, web_search_enabled, active_topics, custom_knowledge")
      .eq("owner_id", owner_id)
      .maybeSingle();

    // Fetch company_info for this owner (to inject into AI context)
    const { data: companyInfo } = await supabase
      .from("company_info")
      .select("name, address, whatsapp_phone, email, business_hours, description")
      .eq("owner_id", owner_id)
      .maybeSingle();

    let aiReply = iaConfig?.away_message ?? "eu não consegui entender o comando irei passar para um atendente nesse instante";

    if (mode === "drippy") {
      // Build personalization context for chat-ai
      const personalizationContext = iaConfig ? {
        ai_name: iaConfig.ai_name ?? "Drippy",
        personality: iaConfig.personality ?? "friendly",
        welcome_message: iaConfig.welcome_message,
        active_topics: iaConfig.active_topics,
        custom_knowledge: iaConfig.custom_knowledge,
        web_search_enabled: iaConfig.web_search_enabled,
        company_info: companyInfo || null,
      } : (companyInfo ? { company_info: companyInfo } : null);

      // Use the existing Drippy brain (chat-ai) in internal mode
      const { data: chatData, error: chatErr } = await supabase.functions.invoke("chat-ai", {
        body: {
          owner_id,
          message: user_message,
          conversationId: `whatsapp:${conversation_id}`,
          messageHistory: [...conversationHistory, { role: "user", content: user_message }].slice(-21),
          source: "whatsapp",
          ia_config: personalizationContext,
        },
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (chatErr) {
        console.error("[whatsapp-ai-reply] chat-ai internal error:", chatErr);
        return new Response(JSON.stringify({ ok: false, error: "chat_ai_error", details: chatErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      aiReply = chatData?.reply ?? aiReply;

      // === HANDOFF DETECTION ===
      // If the AI response ends with [HANDOFF], strip it and pause AI for human takeover
      if (aiReply.includes("[HANDOFF]")) {
        aiReply = aiReply.replace(/\s*\[HANDOFF\]\s*/g, "").trim();
        console.log("[whatsapp-ai-reply] 🔄 HANDOFF detected — pausing AI for human takeover");

        // Set ai_paused = true on the conversation
        const { error: pauseErr } = await supabase
          .from("whatsapp_conversations")
          .update({ ai_paused: true })
          .eq("id", conversation_id);

        if (pauseErr) {
          console.error("[whatsapp-ai-reply] Failed to pause AI:", pauseErr.message);
        } else {
          console.log("[whatsapp-ai-reply] ✅ AI paused successfully for conversation:", conversation_id);
        }
      }
    }

    // Save assistant message to DB
    await supabase.from("whatsapp_messages").insert({
      owner_id,
      conversation_id,
      direction: "out",
      content: aiReply,
      agent_id: null,
    });

    // Resolve Evolution connection settings
    // Per-user config has priority, then project secrets, then legacy global evolution_config.
    const { data: userEvoCfg } = await supabase
      .from("user_evolution_config")
      .select("api_url, api_key")
      .eq("owner_id", owner_id)
      .maybeSingle();

    const { data: evoCfg } = await supabase
      .from("evolution_config")
      .select("api_url, global_api_key")
      .maybeSingle();

    const { apiUrl: evolutionApiUrl, apiKeys: evolutionApiKeys } = resolveEvolutionConfig({
      userApiUrl: userEvoCfg?.api_url,
      userApiKey: userEvoCfg?.api_key,
      globalApiUrl: evoCfg?.api_url,
      globalApiKey: evoCfg?.global_api_key,
    });

    if (!evolutionApiUrl || evolutionApiKeys.length === 0) {
      console.warn("[whatsapp-ai-reply] Missing Evolution config (user config, secret, or legacy global config)");
      return new Response(
        JSON.stringify({ ok: true, ai_reply: aiReply, sent_to_whatsapp: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const effectiveInstanceId =
      typeof instance_id === "string" && instance_id.trim()
        ? instance_id.trim()
        : null;

    if (!effectiveInstanceId) {
      console.warn("[whatsapp-ai-reply] Missing instance_id for send (owner):", owner_id);
      return new Response(
        JSON.stringify({ ok: true, ai_reply: aiReply, sent_to_whatsapp: false, error: "missing_instance_id" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get phone and remote_jid from conversation
    const { data: conv, error: convErr } = await supabase
      .from("whatsapp_conversations")
      .select("phone_number, remote_jid, remote_jid_alt")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convErr) {
      console.error("[whatsapp-ai-reply] Error fetching conversation:", convErr);
    }

    const remoteJidFromDb = conv?.remote_jid;
    const remoteJidAlt = conv?.remote_jid_alt; // Real phone JID for LID contacts
    // For LID contacts, prefer the resolved real phone from remote_jid_alt
    const phone = (remoteJidAlt && remoteJidAlt.includes("@s.whatsapp.net"))
      ? remoteJidAlt.replace(/@.*$/, "").replace(/\D/g, "")
      : conv?.phone_number;

    // Get pushName from the latest inbound message raw_payload for LID matching
    const { data: lastInMsg } = await supabase
      .from("whatsapp_messages")
      .select("raw_payload")
      .eq("conversation_id", conversation_id)
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const contactPushName =
      lastInMsg?.raw_payload?.data?.pushName ??
      lastInMsg?.raw_payload?.data?.message?.pushName ??
      lastInMsg?.raw_payload?.pushName ??
      null;
    if (!phone) {
      console.warn("[whatsapp-ai-reply] Phone not found for conversation:", conversation_id);
      return new Response(
        JSON.stringify({ ok: true, ai_reply: aiReply, sent_to_whatsapp: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sendUrl = `${evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${effectiveInstanceId}`;

    // For LID contacts, use the full LID JID as the send target.
    // The Evolution API can route messages using the LID identifier directly.
    // IMPORTANT: Do NOT use "sender" field — it contains the OWNER's phone, not the contact's.
    const isLidContact = typeof remoteJidFromDb === "string" && remoteJidFromDb.includes("@lid");
    let numberToSend = phone.replace(/@.*$/, "").replace(/\D/g, "");

    if (isLidContact) {
      // Priority 1: Use remoteJidAlt if it's a real phone (not the owner's)
      if (remoteJidAlt && typeof remoteJidAlt === "string" && remoteJidAlt.includes("@s.whatsapp.net")) {
        numberToSend = remoteJidAlt.replace(/@.*$/, "").replace(/\D/g, "");
        console.log("[whatsapp-ai-reply] LID resolved via stored remoteJidAlt:", numberToSend);
      } else {
        // Priority 2: Try to resolve via Evolution API /chat/findContacts
        let resolved = false;
        try {
          const findUrl = `${evolutionApiUrl.replace(/\/$/, "")}/chat/findContacts/${effectiveInstanceId}`;
          for (const apiKey of evolutionApiKeys) {
            const findRes = await fetch(findUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: apiKey,
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({ where: { id: remoteJidFromDb } }),
            });
            if (findRes.ok) {
              const findData = await findRes.json();
              const contacts = Array.isArray(findData) ? findData : [findData];
              console.log("[whatsapp-ai-reply] findContacts returned", contacts.length, "contacts, matching pushName:", contactPushName);

              // Strategy 1: Match by pushName
              if (contactPushName && typeof contactPushName === "string") {
                for (const c of contacts) {
                  if (c?.pushName === contactPushName && typeof c?.remoteJid === "string" && c.remoteJid.includes("@s.whatsapp.net")) {
                    numberToSend = c.remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
                    resolved = true;
                    await supabase.from("whatsapp_conversations").update({ remote_jid_alt: c.remoteJid }).eq("id", conversation_id);
                    console.log("[whatsapp-ai-reply] LID resolved via pushName match:", numberToSend);
                    break;
                  }
                }
              }

              // Strategy 2: Single result with real JID
              if (!resolved && contacts.length === 1) {
                const c = contacts[0];
                if (typeof c?.remoteJid === "string" && c.remoteJid.includes("@s.whatsapp.net")) {
                  numberToSend = c.remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
                  resolved = true;
                  await supabase.from("whatsapp_conversations").update({ remote_jid_alt: c.remoteJid }).eq("id", conversation_id);
                  console.log("[whatsapp-ai-reply] LID resolved via single findContacts:", numberToSend);
                }
              }

              if (resolved) break;
            }
          }
        } catch (e) {
          console.warn("[whatsapp-ai-reply] findContacts error:", String(e));
        }

        if (!resolved) {
          numberToSend = remoteJidFromDb!;
          console.log("[whatsapp-ai-reply] LID contact: sending via full LID JID (fallback):", numberToSend);
        }
      }
    }

    console.log("[whatsapp-ai-reply] Resolved send target:", { phone, remoteJidFromDb, remoteJidAlt, isLidContact, numberToSend });

    // === IA MAIS HUMANA: Read receipt + Composing + Delay proporcional ===
    const evoBaseUrl = evolutionApiUrl.replace(/\/$/, "");
    const firstApiKey = evolutionApiKeys[0];

    // 1. Marcar mensagem como lida (read receipt / check azul) — fire-and-forget
    try {
      await fetch(`${evoBaseUrl}/chat/updatePresence/${effectiveInstanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: firstApiKey,
          Authorization: `Bearer ${firstApiKey}`,
        },
        body: JSON.stringify({ number: numberToSend, presence: "reading" }),
      });
      console.log("[whatsapp-ai-reply] Read receipt sent");
    } catch (e) {
      console.warn("[whatsapp-ai-reply] Read receipt failed:", String(e));
    }

    // 2. Mostrar "digitando..." — fire-and-forget
    try {
      await fetch(`${evoBaseUrl}/chat/updatePresence/${effectiveInstanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: firstApiKey,
          Authorization: `Bearer ${firstApiKey}`,
        },
        body: JSON.stringify({ number: numberToSend, presence: "composing" }),
      });
      console.log("[whatsapp-ai-reply] Composing presence sent");
    } catch (e) {
      console.warn("[whatsapp-ai-reply] Composing presence failed:", String(e));
    }

    // 3. Delay proporcional ao tamanho da resposta (simula digitação humana)
    const baseDelayMs = 1500;
    const perCharMs = 30;
    const maxDelayMs = 12000;
    const jitterMs = Math.floor(Math.random() * 500) + 300; // 300-800ms
    const typingDelayMs = Math.min(maxDelayMs, baseDelayMs + aiReply.length * perCharMs + jitterMs);
    console.log(`[whatsapp-ai-reply] Typing delay: ${typingDelayMs}ms for ${aiReply.length} chars`);
    await new Promise((r) => setTimeout(r, typingDelayMs));

    console.log("[whatsapp-ai-reply] Sending Evolution message", {
      owner_id,
      conversation_id,
      instance_id: effectiveInstanceId,
      url: sendUrl,
    });

    let sentToWhatsApp = false;
    let evolutionError: unknown = null;
    let lastStatus: number | null = null;
    let lastErrTxt = "";

    for (const evolutionApiKey of evolutionApiKeys) {
      const sendRes = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Evolution deployments variam: alguns esperam `apikey`, outros Bearer.
          // Enviamos os 3 formatos para maximizar compatibilidade.
          apikey: evolutionApiKey,
          Authorization: `Bearer ${evolutionApiKey}`,
          "x-api-key": evolutionApiKey,
        },
        body: JSON.stringify({
          number: numberToSend,
          text: aiReply,
          delay: 1000,
        }),
      });

      if (sendRes.ok) {
        const successBody = await sendRes.text();
        console.log("[whatsapp-ai-reply] Evolution send SUCCESS:", sendRes.status, successBody);
        sentToWhatsApp = true;
        evolutionError = null;
        break;
      }

      lastStatus = sendRes.status;
      lastErrTxt = await sendRes.text();
      const isUnauthorized = sendRes.status === 401 || lastErrTxt.toLowerCase().includes("unauthorized");
      console.error("[whatsapp-ai-reply] Evolution send error:", sendRes.status, lastErrTxt);

      if (!isUnauthorized) break; // não é erro de credencial, não adianta trocar a key

      // If Evolution reports connection is closed, mark the instance as inactive so UI can prompt reconnection.
      const errStr = typeof lastErrTxt === "string" ? lastErrTxt : "";
      const looksLikeConnectionClosed =
        sendRes.status === 400 &&
        (errStr.includes("Connection Closed") || errStr.includes("connection closed"));

      if (looksLikeConnectionClosed) {
        try {
          await supabase
            .from("whatsapp_settings")
            .update({ is_active: false })
            .eq("owner_id", owner_id);
        } catch (e) {
          console.warn("[whatsapp-ai-reply] Failed to flip is_active=false:", String(e));
        }
      }
    }

    if (!sentToWhatsApp) {
      try {
        evolutionError = JSON.parse(lastErrTxt);
      } catch {
        evolutionError = lastErrTxt || (lastStatus ? `Erro ${lastStatus}` : "Erro ao enviar");
      }
    } else {
      // Fazer o frontend "ver" a mensagem imediatamente (mesmo se o webhook demorar)
      try {
        const remoteJid = isLidContact ? remoteJidFromDb : (phone.includes("@") ? phone : `${phone}@s.whatsapp.net`);
         const payload = {
          key: { remoteJid, fromMe: true, id: crypto.randomUUID() },
          message: { conversation: aiReply },
          messageTimestamp: Math.floor(Date.now() / 1000),
          pushName: "IA",
        };

        await supabase.channel(`instance-${effectiveInstanceId}`).send({
          type: "broadcast",
          event: "new_message",
          payload,
        });
      } catch (e) {
        console.warn("[whatsapp-ai-reply] Broadcast skipped:", String(e));
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        ai_reply: aiReply,
        sent_to_whatsapp: sentToWhatsApp,
        evolution_error: sentToWhatsApp ? null : evolutionError,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("[whatsapp-ai-reply] Fatal error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
