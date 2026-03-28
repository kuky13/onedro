import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Acesso negado: Sem autorização");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await (supabase.auth as any).getUser(token);
    if (authError || !user) throw new Error("Acesso negado: Usuário inválido");

    const { action, payload } = await req.json();

    // 1. Get Evolution config (per-user first, then project secrets, then legacy global config)
    const { data: userCfg } = await supabase
      .from("user_evolution_config")
      .select("api_url, api_key")
      .eq("owner_id", user.id)
      .maybeSingle();

    const { data: globalCfg } = await supabase
      .from("evolution_config")
      .select("api_url, global_api_key")
      .maybeSingle();

    const { apiUrl: evoUrl, apiKeys: evoKeys } = resolveEvolutionConfig({
      userApiUrl: userCfg?.api_url,
      userApiKey: userCfg?.api_key,
      globalApiUrl: globalCfg?.api_url,
      globalApiKey: globalCfg?.global_api_key,
    });

    if (!evoUrl || evoKeys.length === 0) {
      throw new Error(
        "Configuração da Evolution não encontrada. Em /whats, cadastre sua Evolution API URL + chave (ou configure evolution_config global).",
      );
    }

    console.log(`[whatsapp-proxy] Base URL resolved: ${evoUrl}`);

    // ── Cache for resolved instance tokens (per-request) ──
    const instanceTokenCache: Record<string, string> = {};

    // ── Helper: resolve instance-specific token from Evolution GO ──
    // Evolution GO identifies instances by their token (apikey header),
    // NOT by name in the URL. We call GET /instance/all with the global key,
    // find the instance by name, and return its token.
    const resolveInstanceToken = async (instanceName: string): Promise<string | null> => {
      if (instanceTokenCache[instanceName]) return instanceTokenCache[instanceName];

      const base = evoUrl.replace(/\/$/, "");
      console.log(`[whatsapp-proxy] Resolving token for instance "${instanceName}" via GET /instance/all`);

      for (const key of evoKeys) {
        try {
          const res = await fetch(`${base}/instance/all`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              apikey: key,
              Authorization: `Bearer ${key}`,
              "x-api-key": key,
            },
          });

          if (!res.ok) {
            console.log(`[whatsapp-proxy] /instance/all returned ${res.status} with key ...${key.slice(-4)}`);
            continue;
          }

          const data = await res.json();
          const instances = Array.isArray(data) ? data : (data?.instances || data?.data || []);
          console.log(`[whatsapp-proxy] Found ${instances.length} instances in Evolution GO`);

          // Search by name (case-insensitive)
          const target = instances.find((inst: any) => {
            const name = inst.name || inst.instanceName || inst.instance?.instanceName || "";
            return name.toLowerCase() === instanceName.toLowerCase();
          });

          if (target) {
            const token = target.token || target.apikey || target.api_key || null;
            if (token) {
              console.log(`[whatsapp-proxy] Resolved token for "${instanceName}": ...${token.slice(-6)}`);
              instanceTokenCache[instanceName] = token;
              return token;
            } else {
              console.log(`[whatsapp-proxy] Instance "${instanceName}" found but has no token field. Keys: ${Object.keys(target).join(", ")}`);
            }
          } else {
            console.log(`[whatsapp-proxy] Instance "${instanceName}" NOT found. Available: ${instances.map((i: any) => i.name || i.instanceName || "?").join(", ")}`);
          }
        } catch (e) {
          console.error(`[whatsapp-proxy] Error fetching /instance/all:`, e);
        }
      }
      return null;
    };

    // ── Helper: call Evolution API with multi-key + multi-base fallback ──
    const callEvo = async (path: string, method: string, body: any = null, overrideKey?: string) => {
      const base = evoUrl.replace(/\/$/, "");
      const cleanedPath = String(path).replace(/^\//, "");

      const url = `${base}/${cleanedPath}`;
      console.log(`[whatsapp-proxy] Calling Evolution: ${method} ${url}`);

      let lastErr: unknown = null;

      // If overrideKey is provided, use ONLY that key (Evolution GO instance token)
      const keysToTry = overrideKey ? [overrideKey] : evoKeys;

      for (const evoKey of keysToTry) {
        const options: any = {
          method,
          headers: {
            "Content-Type": "application/json",
            apikey: evoKey,
            Authorization: `Bearer ${evoKey}`,
            "x-api-key": evoKey,
          },
        };

        if (method !== 'GET' && method !== 'DELETE' && body) {
          options.body = JSON.stringify(body);
        }

        const res = await fetch(url, options);
        const contentType = res.headers.get("content-type");

        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error(`[whatsapp-proxy] Non-JSON response (${res.status}): ${text.substring(0, 200)}`);
          // For 404 on non-JSON, let caller handle fallback
          if (res.status === 404) {
            throw new Error(`404 Not Found: ${url}`);
          }
          throw new Error(`Non-JSON response (${res.status}) from Evolution`);
        }

        const data = await res.json();

        if (res.ok) {
          console.log(`[whatsapp-proxy] Success: ${method} ${url} -> ${JSON.stringify(data).substring(0, 200)}`);
          return data;
        }

        const msg = String((data as any)?.message || (data as any)?.error || "");
        const isUnauthorized = res.status === 401 || msg.toLowerCase().includes("unauthorized");
        console.error(`[whatsapp-proxy] Error (${res.status}):`, msg);

        lastErr = new Error(msg || `Erro ${res.status} na Evolution API`);

        if (isUnauthorized) continue; // try next key
        throw lastErr;
      }

      throw lastErr ?? new Error("Unauthorized na Evolution API");
    };

    // ── Helper: try multiple endpoint candidates sequentially ──
    const tryEndpoints = async (candidates: Array<{ path: string; method: string; body?: any }>, overrideKey?: string) => {
      let lastErr: unknown = null;
      for (const c of candidates) {
        try {
          return await callEvo(c.path, c.method, c.body ?? null, overrideKey);
        } catch (e: any) {
          console.log(`[whatsapp-proxy] Endpoint ${c.method} ${c.path} failed: ${e?.message}`);
          lastErr = e;
        }
      }
      throw lastErr ?? new Error("All endpoint candidates failed");
    };

    let result: any = {};

    switch (action) {
      case 'list_instances':
        const { data: instances } = await supabase.from('whatsapp_instances').select('*').eq('user_id', user.id);
        result = { instances: instances || [] };
        break;

      case 'create_instance': {
        const instanceName = `onedrip_${user.id.substring(0, 4)}_${Math.random().toString(36).substring(2, 7)}`;

        const allowedIntegrations = new Set(["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS"]);
        const rawIntegration = payload?.integration;
        const normalizedIntegration = typeof rawIntegration === "string"
          ? rawIntegration.trim().toUpperCase().split("_").join("-")
          : "";
        const integration = allowedIntegrations.has(normalizedIntegration)
          ? normalizedIntegration
          : "WHATSAPP-BAILEYS";

        console.log("[whatsapp-proxy] create_instance", { instanceName, integration });

        // Try Evolution GO format first, then v2
        const evoRes = await tryEndpoints([
          // Evolution GO: POST /instance/create with body
          { path: 'instance/create', method: 'POST', body: {
            instanceName, integration, qrcode: true,
            webhook: {
              url: `${supabaseUrl}/functions/v1/whatsapp-webhook`,
              enabled: true, byEvents: true,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
            },
          }},
        ]);

        const { data: newInst } = await supabase.from('whatsapp_instances').insert({
          user_id: user.id,
          instance_name: instanceName,
          instance_id: evoRes.instance?.instanceId || evoRes?.id || "n/a",
          status: 'created',
          ai_enabled: true
        }).select().single();

        result = { instance: newInst, evolution: evoRes };
        break;
      }

      case 'connect_instance': {
        // Resolve instance token for Evolution GO
        const connectToken = await resolveInstanceToken(payload.instanceName);
        // Evolution GO: POST /instance/connect (body: { instanceName })
        // Evolution v2: GET /instance/connect/{instanceName}
        result = await tryEndpoints([
          { path: 'instance/connect', method: 'POST', body: { instanceName: payload.instanceName } },
          { path: `instance/connect/${payload.instanceName}`, method: 'GET' },
        ], connectToken || undefined);
        break;
      }

      case 'get_status': {
        const statusToken = await resolveInstanceToken(payload.instanceName);
        // Evolution GO: GET /instance/status (identified by token)
        // Evolution v2: GET /instance/connectionState/{instanceName}
        const state = await tryEndpoints([
          { path: 'instance/status', method: 'GET' },
          { path: `instance/status?instanceName=${payload.instanceName}`, method: 'GET' },
          { path: `instance/connectionState/${payload.instanceName}`, method: 'GET' },
        ], statusToken || undefined);
        const status = state?.instance?.state || state?.state || state?.status || 'disconnected';
        await supabase.from('whatsapp_instances').update({ status }).eq('instance_name', payload.instanceName);
        result = { status, state };
        break;
      }

      case 'delete_instance':
        // Evolution GO: DELETE /instance/delete/{instanceId}
        // Evolution v2: DELETE /instance/delete/{instanceName}
        await tryEndpoints([
          { path: `instance/delete/${payload.instanceName}`, method: 'DELETE' },
        ]);
        await supabase.from('whatsapp_instances').delete().eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'logout_instance':
        // Evolution GO: DELETE /instance/logout (body with instanceName?)
        // Evolution v2: DELETE /instance/logout/{instanceName}
        try {
          await tryEndpoints([
            { path: 'instance/logout', method: 'DELETE', body: { instanceName: payload.instanceName } },
            { path: `instance/logout/${payload.instanceName}`, method: 'DELETE' },
          ]);
        } catch { /* ignore */ }
        await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'set_webhook': {
        console.log(`[whatsapp-proxy] Setting webhook for ${payload.instanceName}`);
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
        const events = [
          "messages.upsert", "messages.update", "connection.update", "qrcode.updated",
          "MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED",
        ];

        const errors: string[] = [];
        const candidatePaths = [
          `webhook/set/${payload.instanceName}`,
          `webhook/${payload.instanceName}`,
          `instance/webhook/${payload.instanceName}`,
        ];
        const bodies = [
          { webhook: { url: webhookUrl, enabled: true, byEvents: true, events } },
          { url: webhookUrl, enabled: true, byEvents: true, events },
        ];

        for (const path of candidatePaths) {
          for (const body of bodies) {
            try {
              const data = await callEvo(path, 'POST', body);
              return new Response(JSON.stringify({ success: true, data, webhookUrl, path }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            } catch (e: any) {
              errors.push(`${path}: ${e?.message ?? String(e)}`);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: false, error: "VPS_REJECTED", webhookUrl, details: errors.slice(0, 6).join(" | ") }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case 'diagnose_instance': {
        const [connState, webhookConfig, hostInfo] = await Promise.allSettled([
          tryEndpoints([
            { path: `instance/status?instanceName=${payload.instanceName}`, method: 'GET' },
            { path: 'instance/status', method: 'GET' },
            { path: `instance/connectionState/${payload.instanceName}`, method: 'GET' },
          ]),
          callEvo(`webhook/find/${payload.instanceName}`, 'GET').catch(() => null),
          tryEndpoints([
            { path: 'instance/all', method: 'GET' },
            { path: 'instance/fetchInstances', method: 'GET' },
          ]).catch(() => []),
        ]);

        const findInGlobal = (hostInfo.status === 'fulfilled' && Array.isArray(hostInfo.value))
          ? hostInfo.value.find((i: any) => i.name === payload.instanceName || i.instance?.instanceName === payload.instanceName || i.instanceName === payload.instanceName)
          : null;

        result = {
          connection: connState.status === 'fulfilled' ? connState.value : { error: (connState as any).reason?.message },
          webhook: webhookConfig.status === 'fulfilled' ? webhookConfig.value : { error: (webhookConfig as any).reason?.message },
          globalInfo: findInGlobal,
          targetUrl: evoUrl,
          timestamp: new Date().toISOString()
        };
        break;
      }

      case 'test_webhook': {
        try {
          console.log(`[whatsapp-proxy] Triggering TEST webhook for ${payload.instanceName}`);
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

          const testPayload = {
            event: "test_webhook",
            instance: payload.instanceName,
            data: { message: "Teste de sinal manual", timestamp: Date.now() }
          };

          const webhookRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-webhook`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`
            },
            body: JSON.stringify(testPayload)
          });

          const resText = await webhookRes.text();
          result = { success: webhookRes.ok, status: webhookRes.status, details: resText };
        } catch (e) {
          result = { success: false, error: String(e), status: 500 };
        }
        break;
      }

      case 'get_chats': {
        try {
          console.log(`[whatsapp-proxy] get_chats for ${payload.instanceName}`);

          // Evolution GO: GET /user/contacts
          // Evolution v2: POST /chat/findChats/{instanceName}
          const chats = await tryEndpoints([
            { path: `user/contacts?instanceName=${payload.instanceName}`, method: 'GET' },
            { path: 'user/contacts', method: 'GET' },
            { path: `chat/findChats/${payload.instanceName}`, method: 'POST', body: {} },
            { path: 'chat/findChats', method: 'POST', body: { instanceName: payload.instanceName } },
          ]).catch(() => []);

          const chatsArr = Array.isArray(chats) ? chats : ((chats as any)?.data || (chats as any)?.chats || (chats as any)?.contacts || []);

          result = chatsArr.map((chat: any) => ({
            ...chat,
            name: chat.name || chat.pushName || chat.verifiedName || chat.subject || '',
          }));
        } catch (e) {
          console.error(`[whatsapp-proxy] Error in get_chats:`, e);
          result = [];
        }
        break;
      }

      case 'get_messages': {
        try {
          const jid = payload.remoteJid;
          const cleanNumber = jid.split('@')[0];
          console.log(`[whatsapp-proxy] get_messages for ${jid} in ${payload.instanceName}`);

          const [localRes, remoteRes] = await Promise.allSettled([
            callEvo(`chat/findMessages/${payload.instanceName}`, 'POST', {
              where: { key: { remoteJid: jid } },
              options: { limit: 30 }
            }),
            callEvo(`chat/fetchMessages/${payload.instanceName}`, 'POST', {
              number: cleanNumber,
              limit: 30
            })
          ]);

          const toArray = (v: any): any[] => {
            if (!v) return [];
            if (Array.isArray(v)) return v;
            if (Array.isArray(v.records)) return v.records;
            if (Array.isArray(v.messages)) return v.messages;
            if (Array.isArray(v.data)) return v.data;
            if (Array.isArray(v?.messages?.records)) return v.messages.records;
            return [];
          };

          const localMessages = localRes.status === 'fulfilled'
            ? toArray(localRes.value?.messages ?? localRes.value?.data ?? localRes.value)
            : [];
          const remoteMessages = remoteRes.status === 'fulfilled'
            ? toArray(remoteRes.value?.messages ?? remoteRes.value?.data ?? remoteRes.value)
            : [];

          const allMessages: any[] = [...localMessages, ...remoteMessages];
          const uniqueMessages: any[] = [];
          const seenIds = new Set();

          for (const msg of allMessages) {
            const id = msg.key?.id || msg.id;
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              uniqueMessages.push(msg);
            }
          }

          uniqueMessages.sort((a: any, b: any) => {
            const tA = Number(a.messageTimestamp || 0);
            const tB = Number(b.messageTimestamp || 0);
            return tA - tB;
          });

          result = { messages: uniqueMessages };
        } catch (e) {
          console.error(`[whatsapp-proxy] Fatal error in get_messages:`, e);
          result = { messages: [], error: String(e) };
        }
        break;
      }

      case 'get_groups': {
        try {
          console.log(`[whatsapp-proxy] get_groups for ${payload.instanceName}`);

          // Evolution GO: GET /group/myall or GET /group/list (no instance in path)
          // Evolution v2: POST /group/fetchAllGroups/{instanceName}
          const groupsData = await tryEndpoints([
            { path: `group/myall?instanceName=${payload.instanceName}`, method: 'GET' },
            { path: 'group/myall', method: 'GET' },
            { path: `group/list?instanceName=${payload.instanceName}`, method: 'GET' },
            { path: 'group/list', method: 'GET' },
            { path: `group/fetchAllGroups/${payload.instanceName}`, method: 'POST', body: {} },
          ]).catch(async () => {
            // Last resort: fetch chats and filter @g.us
            console.log(`[whatsapp-proxy] All group endpoints failed, falling back to chat filter`);
            const allChats = await tryEndpoints([
              { path: `user/contacts?instanceName=${payload.instanceName}`, method: 'GET' },
              { path: 'user/contacts', method: 'GET' },
              { path: `chat/findChats/${payload.instanceName}`, method: 'POST', body: {} },
            ]).catch(() => []);
            const chatsArray = Array.isArray(allChats) ? allChats : (allChats?.data || allChats?.chats || []);
            return chatsArray.filter((c: any) => {
              const id = c.id || c.remoteJid || c.jid || '';
              return typeof id === 'string' && id.includes('@g.us');
            });
          });

          const groupsArr = Array.isArray(groupsData) ? groupsData : (groupsData?.data || groupsData?.groups || []);
          console.log(`[whatsapp-proxy] Groups found: ${groupsArr.length}`);

          result = groupsArr.map((g: any) => ({
            id: g.id || g.jid || g.remoteJid || g.JID || '',
            name: g.subject || g.name || g.Name || g.Subject || 'Grupo sem nome',
            groupId: g.id || g.jid || g.remoteJid || g.JID || '',
          }));
        } catch (e) {
          console.error(`[whatsapp-proxy] Error in get_groups:`, e);
          result = [];
        }
        break;
      }

      case 'send_message':
        // Evolution GO: POST /send/text
        // Evolution v2: POST /message/sendText/{instanceName}
        result = await tryEndpoints([
          { path: 'send/text', method: 'POST', body: {
            instanceName: payload.instanceName,
            number: payload.to,
            text: payload.text,
          }},
          { path: `message/sendText/${payload.instanceName}`, method: 'POST', body: {
            number: payload.to,
            text: payload.text,
            delay: 1000
          }},
        ]);
        break;

      case 'toggle_ai':
        await supabase.from('whatsapp_instances').update({ ai_enabled: payload.enabled }).eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'set_ai_config':
        await supabase
          .from('whatsapp_instances')
          .update({ ai_enabled: true, ai_mode: 'drippy', ai_agent_id: null })
          .eq('instance_name', payload.instanceName)
          .eq('user_id', user.id);
        result = { success: true };
        break;
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
