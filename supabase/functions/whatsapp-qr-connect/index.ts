import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: "misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerId = user.id;

    // Reuse an existing instance name for this owner (even if not connected yet)
    const { data: existing } = await supabase
      .from("whatsapp_settings")
      .select("evolution_instance_id, evolution_api_url, is_active")
      .eq("owner_id", ownerId)
      .maybeSingle();

    // Prefer per-user Evolution config, then project secrets, then legacy global config.
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
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If we already have an instance name stored, always reuse it.
    if (existing?.evolution_instance_id) {
      const instanceName = existing.evolution_instance_id;

      // Resolve the instance-specific token for Evolution GO
      let instanceToken: string | null = null;
      try {
        const allRes = await fetch(`${baseUrl}/instance/all`, {
          method: "GET",
          headers: { apikey: evolutionApiKey, Authorization: `Bearer ${evolutionApiKey}` },
        });
        if (allRes.ok) {
          const allData = await allRes.json();
          const instances = Array.isArray(allData) ? allData : (allData?.instances || allData?.data || []);
          const target = instances.find((inst: any) => {
            const name = inst.name || inst.instanceName || inst.instance?.instanceName || "";
            return name.toLowerCase() === instanceName.toLowerCase();
          });
          if (target) {
            instanceToken = target.token || target.apikey || target.api_key || null;
            console.log(`[whatsapp-qr-connect] Resolved token for "${instanceName}": ...${instanceToken?.slice(-6)}`);
          }
        }
      } catch (e) {
        console.warn("[whatsapp-qr-connect] Could not resolve instance token:", String(e));
      }

      const effectiveKey = instanceToken || evolutionApiKey;

      // Ensure the multi-instance table has a row for this instance (so Atendimento works consistently)
      try {
        await supabase
          .from("whatsapp_instances")
          .upsert(
            {
              user_id: ownerId,
              instance_name: instanceName,
              instance_id: instanceName,
              status: existing?.is_active ? "open" : "created",
              ai_enabled: true,
              ai_mode: "drippy",
              ai_agent_id: null,
            } as any,
            { onConflict: "user_id,instance_name" }
          );
      } catch (e) {
        console.warn("[whatsapp-qr-connect] whatsapp_instances upsert skipped:", String(e));
      }

      // Check connection status
      let statusRes: Response;
      statusRes = await fetch(`${baseUrl}/instance/status`, { method: "GET", headers: { apikey: effectiveKey } });
      if (!statusRes.ok) {
        statusRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { method: "GET", headers: { apikey: effectiveKey } });
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const state = statusData?.instance?.state ?? statusData?.state ?? "unknown";

        if (state === "open" || state === "connected") {
          await supabase.from("whatsapp_settings").update({ is_active: true }).eq("owner_id", ownerId);

          // Bug 4 fix: extract connected phone from ownerJid
          const ownerJid = statusData?.instance?.ownerJid ?? statusData?.ownerJid ?? null;
          const connectedPhone = ownerJid ? ownerJid.replace(/@.*$/, "") : null;

          // Bug 3 fix: Keep whatsapp_instances status in sync
          try {
            await supabase
              .from("whatsapp_instances")
              .update({
                status: "open",
                ai_enabled: true,
                ai_mode: "drippy",
                connected_at: new Date().toISOString(),
                ...(connectedPhone ? { connected_phone: connectedPhone } : {}),
              })
              .eq("user_id", ownerId)
              .eq("instance_name", instanceName);
          } catch {
            // ignore
          }

          return new Response(
            JSON.stringify({
              ok: true,
              already_connected: true,
              instance_id: instanceName,
              state,
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Not connected: fetch a fresh QR code
      // Evolution GO: POST /instance/connect with body
      // Evolution v2: GET /instance/connect/{instanceName}
      let qrRes = await fetch(`${baseUrl}/instance/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: effectiveKey },
        body: JSON.stringify({ instanceName }),
      });
      if (!qrRes.ok) {
        qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers: { apikey: effectiveKey },
        });
      }

      if (qrRes.ok) {
        const qrData = await qrRes.json();
        const qrCode = qrData?.qrcode?.base64 ?? qrData?.code ?? qrData?.base64 ?? null;

        if (qrCode) {
          // Ensure we keep it marked as not connected while waiting scan
          await supabase.from("whatsapp_settings").update({ is_active: false }).eq("owner_id", ownerId);

          try {
            await supabase
              .from("whatsapp_instances")
              .update({ status: "created", ai_enabled: true, ai_mode: "drippy" })
              .eq("user_id", ownerId)
              .eq("instance_name", instanceName);
          } catch {
            // ignore
          }

          return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qrCode }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // If Evolution no longer has that instance (deleted manually), we fall through and recreate.
    }

    // ── Check whatsapp_instances for an existing instance to reuse ──
    const { data: existingInst } = await supabase
      .from("whatsapp_instances")
      .select("instance_name, status")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Reuse the existing instance name if we have one, otherwise create a deterministic one
    const stableSuffix = ownerId.replace(/-/g, "").slice(0, 12);
    const instanceName = existingInst?.instance_name ?? `onedrip_${stableSuffix}`;

    // Persist the instance name BEFORE creating it to avoid generating multiple instances on repeated clicks.
    await supabase
      .from("whatsapp_settings")
      .upsert(
        {
          owner_id: ownerId,
          evolution_api_url: baseUrl,
          evolution_instance_id: instanceName,
          is_active: false,
        },
        { onConflict: "owner_id" }
      );

    // Also register it in whatsapp_instances so Atendimento can pick it up.
    try {
      await supabase
        .from("whatsapp_instances")
        .upsert(
          {
            user_id: ownerId,
            instance_name: instanceName,
            instance_id: instanceName,
            status: "created",
            ai_enabled: true,
            ai_mode: "drippy",
            ai_agent_id: null,
          } as any,
          { onConflict: "user_id,instance_name" }
        );
    } catch (e) {
      console.warn("[whatsapp-qr-connect] whatsapp_instances initial upsert skipped:", String(e));
    }

    // Webhook must point to whatsapp-webhook (the main entry point that routes to context/AI)
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
    const webhookEvents = [
      "MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED",
      "MESSAGES_UPDATE", "PRESENCE_UPDATE",
      "messages.upsert", "connection.update", "qrcode.updated",
      "messages.update", "presence.update",
    ];

    const createUrl = `${baseUrl}/instance/create`;
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: evolutionApiKey,
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
        webhook: {
          url: webhookUrl,
          enabled: true,
          byEvents: true,
          events: webhookEvents,
        },
      }),
    });

    // If the instance already exists in Evolution (common after a failed attempt), reuse it.
    // Evolution may return 403 "name already in use".
    if (!createRes.ok) {
      const errTxt = await createRes.text();
      console.warn("[whatsapp-qr-connect] Create instance not OK, trying connect:", createRes.status, errTxt);

      // Try Evolution GO (POST) first, then v2 (GET)
      const connectCandidates = [
        { url: `${baseUrl}/instance/connect`, method: "POST", body: JSON.stringify({ instanceName }) },
        { url: `${baseUrl}/instance/connect/${instanceName}`, method: "GET", body: undefined as string | undefined },
      ];

      let qrCode: string | null = null;
      let lastConnectStatus: number | null = null;
      let lastConnectBody: string | null = null;

      // Retry because QR can take a moment to become available
      for (let i = 0; i < 20 && !qrCode; i++) {
        for (const candidate of connectCandidates) {
          const qrRes = await fetch(candidate.url, {
            method: candidate.method,
            headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
            ...(candidate.body ? { body: candidate.body } : {}),
          });

          lastConnectStatus = qrRes.status;
          lastConnectBody = await qrRes.text();

          if (qrRes.ok) {
            try {
              const qrData = JSON.parse(lastConnectBody);
              qrCode = qrData?.qrcode?.base64 ?? qrData?.code ?? qrData?.base64 ?? null;
            } catch {
              // ignore
            }
          }
          if (qrCode) break;
        }

        if (!qrCode) await new Promise((r) => setTimeout(r, 1000));
      }

      if (qrCode) {
        return new Response(JSON.stringify({ ok: true, instance_id: instanceName, qr_code: qrCode }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // If the deterministic name collided with another instance not owned by this user,
      // Evolution can refuse create with 403 and connect returns no QR. In that case,
      // create a new unique name ONCE, persist it, and retry.
      if (createRes.status === 403) {
        const retryName = `onedrip_${stableSuffix}_${Math.random().toString(36).slice(2, 7)}`;

        await supabase
          .from("whatsapp_settings")
          .upsert(
            {
              owner_id: ownerId,
              evolution_api_url: baseUrl,
              evolution_instance_id: retryName,
              is_active: false,
            },
            { onConflict: "owner_id" }
          );

        const retryCreateRes = await fetch(createUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: evolutionApiKey,
          },
          body: JSON.stringify({
            instanceName: retryName,
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
            webhook: {
              url: webhookUrl,
              enabled: true,
              byEvents: true,
              events: webhookEvents,
            },
          }),
        });

        if (retryCreateRes.ok) {
          const retryData = await retryCreateRes.json();
          const retryInstance = retryData?.instance?.instanceName ?? retryName;
          let retryQr = retryData?.qrcode?.base64 ?? retryData?.code ?? retryData?.base64 ?? null;

          if (!retryQr) {
            const retryConnectUrl = `${baseUrl}/instance/connect/${retryInstance}`;
            for (let i = 0; i < 20 && !retryQr; i++) {
              const rRes = await fetch(retryConnectUrl, {
                method: "GET",
                headers: { apikey: evolutionApiKey },
              });
              const body = await rRes.text();
              if (rRes.ok) {
                try {
                  const qrData = JSON.parse(body);
                  retryQr = qrData?.qrcode?.base64 ?? qrData?.code ?? qrData?.base64 ?? null;
                } catch {
                  // ignore
                }
              }
              if (!retryQr) await new Promise((r) => setTimeout(r, 1000));
            }
          }

          if (retryQr) {
            return new Response(JSON.stringify({ ok: true, instance_id: retryInstance, qr_code: retryQr }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }

      console.error("[whatsapp-qr-connect] Connect QR not available after create failure:", {
        instance: instanceName,
        create_status: createRes.status,
        create_body: errTxt,
        lastConnectStatus,
        lastConnectBody,
      });

      return new Response(
        JSON.stringify({ ok: false, error: "qr_code_missing", create_status: createRes.status, connect_status: lastConnectStatus }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const createData = await createRes.json();

    // Evolution doesn't always return the QR base64 in /instance/create.
    const instanceNameCreated = createData?.instance?.instanceName ?? instanceName;

    // Update whatsapp_instances with the final instance name/id (if any)
    try {
      await supabase
        .from("whatsapp_instances")
        .upsert(
          {
            user_id: ownerId,
            instance_name: instanceNameCreated,
            instance_id: createData?.instance?.instanceId ?? instanceNameCreated,
            status: "created",
            ai_enabled: true,
            ai_mode: "drippy",
            ai_agent_id: null,
          } as any,
          { onConflict: "user_id,instance_name" }
        );
    } catch (e) {
      console.warn("[whatsapp-qr-connect] whatsapp_instances final upsert skipped:", String(e));
    }

    let qrCode = createData?.qrcode?.base64 ?? createData?.code ?? createData?.base64 ?? null;

    if (!qrCode) {
      const connectUrl = `${baseUrl}/instance/connect/${instanceNameCreated}`;

      // small retries because QR may take time to become available
      let lastConnectStatus: number | null = null;
      let lastConnectBody: string | null = null;

      for (let i = 0; i < 20 && !qrCode; i++) {
        const qrRes = await fetch(connectUrl, {
          method: "GET",
          headers: { apikey: evolutionApiKey },
        });

        lastConnectStatus = qrRes.status;
        lastConnectBody = await qrRes.text();

        if (qrRes.ok) {
          try {
            const qrData = JSON.parse(lastConnectBody);
            qrCode = qrData?.qrcode?.base64 ?? qrData?.code ?? qrData?.base64 ?? null;
            if (qrCode) break;
          } catch {
            // ignore
          }
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!qrCode) {
        console.error("[whatsapp-qr-connect] Connect QR not available:", {
          instance: instanceNameCreated,
          lastConnectStatus,
          lastConnectBody,
        });
      }
    }

    if (!qrCode) {
      console.error("[whatsapp-qr-connect] No QR code in response:", createData);
      return new Response(JSON.stringify({ ok: false, error: "qr_code_missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure settings keep the same instance name (pending until connection is confirmed)
    const { error: upsertError } = await supabase
      .from("whatsapp_settings")
      .upsert(
        {
          owner_id: ownerId,
          evolution_api_url: baseUrl,
          evolution_instance_id: instanceNameCreated,
          is_active: false,
        },
        { onConflict: "owner_id" }
      );

    if (upsertError) {
      console.error("[whatsapp-qr-connect] Upsert settings error:", upsertError);
    }

    // ── AUTO-SETUP: Webhook + IA Config ──
    // 1) Explicitly set webhook via Evolution API (fallback if create payload didn't stick)
    const webhookSetPaths = [
      `webhook/set/${instanceNameCreated}`,
      `instance/webhook/${instanceNameCreated}`,
    ];
    const webhookBodies = [
      { webhook: { url: webhookUrl, enabled: true, byEvents: true, events: webhookEvents } },
      { url: webhookUrl, enabled: true, byEvents: true, events: webhookEvents },
    ];

    for (const wPath of webhookSetPaths) {
      let success = false;
      for (const wBody of webhookBodies) {
        try {
          const wRes = await fetch(`${baseUrl}/${wPath}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
            body: JSON.stringify(wBody),
          });
          if (wRes.ok) {
            console.log(`[whatsapp-qr-connect] Webhook auto-set OK via ${wPath}`);
            success = true;
            break;
          }
        } catch (e) {
          console.warn(`[whatsapp-qr-connect] Webhook set attempt ${wPath} failed:`, e);
        }
      }
      if (success) break;
    }

    // 2) Auto-create IA config defaults if not exists
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
        console.log("[whatsapp-qr-connect] Auto-created ia_configs for user", ownerId);
      }
    } catch (e) {
      console.warn("[whatsapp-qr-connect] ia_configs auto-create skipped:", String(e));
    }

    return new Response(JSON.stringify({ ok: true, instance_id: instanceNameCreated, qr_code: qrCode }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[whatsapp-qr-connect] Fatal error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
