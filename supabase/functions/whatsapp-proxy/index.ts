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
    // NOTE: em alguns builds do Deno/esm.sh, o tipo exposto para auth não inclui getUser(jwt),
    // mas o método existe em runtime. Fazemos cast para manter compatibilidade.
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

    const callEvo = async (path: string, method: string, body: any = null) => {
      if (!evoUrl || evoKeys.length === 0) {
        throw new Error("Configuração da Evolution não encontrada (api_url ou global_api_key)");
      }

      const base = evoUrl.replace(/\/$/, "");
      const cleanedPath = String(path).replace(/^\//, "");

      // Alguns servidores expõem a API atrás de /api, /v1 ou /v2.
      // Tentamos automaticamente esses prefixos para evitar 404 "Not Found".
      const baseCandidates = [
        base,
        `${base}/api`,
        `${base}/v1`,
        `${base}/v2`,
      ];

      let lastErr: unknown = null;

      for (const baseCandidate of baseCandidates) {
        const url = `${baseCandidate}/${cleanedPath}`;
        console.log(`[whatsapp-proxy] Calling Evolution: ${method} ${url}`);

        for (const evoKey of evoKeys) {
          const options: any = {
            method,
            headers: {
              "Content-Type": "application/json",
              // Evolution deployments variam: alguns esperam `apikey`, outros Bearer.
              // Enviamos os 3 formatos para maximizar compatibilidade.
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

          // Se não for JSON, isso não é problema de chave. Abortamos cedo.
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            console.error(`[whatsapp-proxy] Non-JSON response from Evolution (${res.status}):`, text);
            throw new Error(`A VPS retornou um erro não-JSON (${res.status}). Verifique se a Evolution API está rodando.`);
          }

          const data = await res.json();

          if (res.ok) {
            console.log(`[whatsapp-proxy] Evolution Success:`, JSON.stringify(data).substring(0, 200) + "...");
            return data;
          }

          // 401/Unauthorized: tenta próxima chave (fallback global, etc.)
          const msg = String((data as any)?.message || (data as any)?.error || "");
          const isUnauthorized = res.status === 401 || msg.toLowerCase().includes("unauthorized");
          console.error(`[whatsapp-proxy] Evolution Error (${res.status}) with a key:`, data);

          lastErr = new Error(msg || `Erro ${res.status} na Evolution API`);

          // Se for unauthorized, tenta próxima chave (mesmo base)
          if (isUnauthorized) continue;

          // Se for 404, tenta o próximo baseCandidate (ex: /api)
          if (res.status === 404 || msg.toLowerCase().includes('not found')) {
            break;
          }

          throw lastErr;
        }
      }

      throw lastErr ?? new Error("Unauthorized na Evolution API");
    };

    let result: any = {};

    switch (action) {
      case 'list_instances':
        const { data: instances } = await supabase.from('whatsapp_instances').select('*').eq('user_id', user.id);
        result = { instances: instances || [] };
        break;

      case 'create_instance':
        const instanceName = `onedrip_${user.id.substring(0, 4)}_${Math.random().toString(36).substring(2, 7)}`;

        // Evolution API v2 exige o campo "integration" e é case-sensitive.
        // Valores aceitos (docs): "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS".
        // Normaliza valores comuns vindos do frontend para evitar 400 "Invalid integration".
        const allowedIntegrations = new Set(["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS"]);
        const rawIntegration = payload?.integration;
        const normalizedIntegration = typeof rawIntegration === "string"
          ? rawIntegration.trim().toUpperCase().split("_").join("-")
          : "";
        const integration = allowedIntegrations.has(normalizedIntegration)
          ? normalizedIntegration
          : "WHATSAPP-BAILEYS";


        console.log("[whatsapp-proxy] create_instance", { instanceName, integration });
        const evoRes = await callEvo('instance/create', 'POST', {
          instanceName,
          integration,
          qrcode: true,
          // Otimização para evitar crash de 'init queries' do Baileys
          // Desativamos o que não é essencial para o chat funcionar
          config: {
            read_messages: true,
            read_status: false, // Evita carregar status de todos os contatos no boot
            sync_full_history: false, // Carrega apenas o necessário
            reject_call: false,
            groups_ignore: false
          },
          webhook: {
            url: `${supabaseUrl}/functions/v1/whatsapp-webhook`,
            enabled: true,
            byEvents: true,
            events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE", "SEND_MESSAGE", "CONNECTION_UPDATE", "PRESENCE_UPDATE"],
          },
        });


        const { data: newInst } = await supabase.from('whatsapp_instances').insert({
          user_id: user.id,
          instance_name: instanceName,
          instance_id: evoRes.instance?.instanceId || "n/a",
          status: 'created',
          ai_enabled: true
        }).select().single();

        result = { instance: newInst, evolution: evoRes };
        break;

      case 'connect_instance':
        result = await callEvo(`instance/connect/${payload.instanceName}`, 'GET');
        break;

      case 'get_status':
        const state = await callEvo(`instance/connectionState/${payload.instanceName}`, 'GET');
        const status = state?.instance?.state || 'disconnected';
        await supabase.from('whatsapp_instances').update({ status }).eq('instance_name', payload.instanceName);
        result = { status, state };
        break;

      case 'delete_instance':
        await callEvo(`instance/delete/${payload.instanceName}`, 'DELETE');
        await supabase.from('whatsapp_instances').delete().eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'logout_instance':
        await callEvo(`instance/logout/${payload.instanceName}`, 'DELETE');
        await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'set_webhook':
        console.log(`[whatsapp-proxy] Setting webhook for ${payload.instanceName}`);

        // IMPORTANTE:
        // - Webhook é server-to-server (Evolution -> Supabase Function).
        // - Não deve depender de JWT do usuário.
        // - Com verify_jwt=false no supabase/config.toml, não precisamos anexar apikey/querystring.
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

        // Evolution costuma usar nomes em "dot-case" (ex: messages.upsert).
        // Alguns setups antigos usam UPPERCASE (ex: MESSAGES_UPSERT).
        // Para máxima compatibilidade, registramos ambos.
        const events = [
          "messages.upsert",
          "messages.update",
          "messages.delete",
          "send.message",
          "connection.update",
          "presence.update",
          "qrcode.updated",

          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "MESSAGES_DELETE",
          "SEND_MESSAGE",
          "CONNECTION_UPDATE",
          "PRESENCE_UPDATE",
          "QRCODE_UPDATED",
        ];

        const errors: string[] = [];

        // Alguns deploys da Evolution mudam o path do webhook (v2 vs forks/custom).
        // Fazemos tentativa em múltiplos endpoints prováveis para maximizar compatibilidade.
        const candidatePaths = [
          // caminhos "clássicos" (forks)
          `webhook/set/${payload.instanceName}`,
          `webhook/set/${payload.instanceName}/`,
          `webhook/${payload.instanceName}`,
          `webhook/${payload.instanceName}/set`,

          // variações comuns em painéis/routers
          `instance/webhook/${payload.instanceName}`,
          `instance/webhook/set/${payload.instanceName}`,
          `instance/setWebhook/${payload.instanceName}`,
          `instance/set-webhook/${payload.instanceName}`,
        ];

        const bodies = [
          // formato novo
          { webhook: { url: webhookUrl, enabled: true, byEvents: true, events } },
          // formato antigo
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
          JSON.stringify({
            success: false,
            error: "VPS_REJECTED",
            webhookUrl,
            details: errors.slice(0, 8).join(" | ") + (errors.length > 8 ? ` | +${errors.length - 8} erros` : ""),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );


      case 'diagnose_instance':
        // Busca informações completas para debug
        const [connState, webhookConfig, hostInfo] = await Promise.allSettled([
            callEvo(`instance/connectionState/${payload.instanceName}`, 'GET'),
            callEvo(`webhook/find/${payload.instanceName}`, 'GET'),
            callEvo(`instance/fetchInstances`, 'GET') // Para ver se a instância existe na lista global
        ]);

        const findInGlobal = (hostInfo.status === 'fulfilled' && Array.isArray(hostInfo.value)) 
            ? hostInfo.value.find((i: any) => i.name === payload.instanceName || i.instance?.instanceName === payload.instanceName)
            : null;

        result = {
            connection: connState.status === 'fulfilled' ? connState.value : { error: connState.reason },
            webhook: webhookConfig.status === 'fulfilled' ? webhookConfig.value : { error: webhookConfig.reason },
            globalInfo: findInGlobal,
            targetUrl: evoUrl, // Retorna a URL que estamos tentando acessar (segurança: mascarar key se necessário)
            timestamp: new Date().toISOString()
        };
        break;

      case 'test_webhook':
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
            console.log(`[whatsapp-proxy] Webhook Test Response (${webhookRes.status}):`, resText);

            result = { 
                success: webhookRes.ok, 
                status: webhookRes.status,
                statusText: webhookRes.statusText,
                details: resText
            };
        } catch (e) {
            console.error("[whatsapp-proxy] Fatal error in test_webhook fetch:", e);
            result = { success: false, error: String(e), status: 500 };
        }
        break;

      case 'get_chats':
        try {
          console.log(`[whatsapp-proxy] get_chats for ${payload.instanceName}`);
          // 1) Tenta buscar conversas (chats ativos)
          // Alguns deploys usam POST com path /:instanceName; outros esperam body com instanceName.
          const chats = await callEvo(`chat/findChats/${payload.instanceName}`, 'POST', {}).catch(async () => {
            return await callEvo(`chat/findChats`, 'POST', { instanceName: payload.instanceName });
          });

          // 2) Tenta buscar contatos (para pegar nomes reais mesmo de quem não tem chat ativo)
          const contacts = await callEvo(`chat/findContacts/${payload.instanceName}`, 'POST', {}).catch(async () => {
            return await callEvo(`chat/findContacts`, 'POST', { instanceName: payload.instanceName });
          }).catch(() => []);
          
          // 3. Mesclar dados para garantir que temos o melhor nome possível
          const chatsArr = (Array.isArray(chats) ? chats : ((chats as any)?.data || (chats as any)?.chats || []));
          const contactsArr = (Array.isArray(contacts) ? contacts : ((contacts as any)?.data || (contacts as any)?.contacts || []));

          const merged = chatsArr.map((chat: any) => {
            const contact = contactsArr
              .find((con: any) => (con.id || con.remoteJid) === (chat.id || chat.remoteJid));
            
            return {
              ...chat,
              verifiedName: contact?.verifiedName || chat.verifiedName,
              pushName: contact?.pushName || chat.pushName,
              name: contact?.name || chat.name || contact?.pushName || chat.pushName
            };
          });

          // Se não veio nada nos chats, retorna os contatos como fallback
          result = merged.length > 0 ? merged : contactsArr;
        } catch (e) {
          console.error(`[whatsapp-proxy] Error in get_chats:`, e);
          result = [];
        }
        break;

      case 'get_messages':
        try {
          const jid = payload.remoteJid;
          const cleanNumber = jid.split('@')[0];
          console.log(`[whatsapp-proxy] Ultra-Fetch for ${jid} in ${payload.instanceName}`);

          // ESTRATÉGIA HÍBRIDA ROBUSTA:
          // Executamos Local (Rápido) e Remoto (Lento mas Atualizado) em paralelo.
          // Isso garante que se o banco local estiver desatualizado (o que parece ser o caso),
          // a busca remota trará as mensagens novas.

          const [localRes, remoteRes] = await Promise.allSettled([
            // 1. Banco Local (Evolution Store)
            callEvo(`chat/findMessages/${payload.instanceName}`, 'POST', {
                where: { key: { remoteJid: jid } },
                options: { limit: 30 }
            }),
            // 2. Busca Remota (Direto do Celular)
            callEvo(`chat/fetchMessages/${payload.instanceName}`, 'POST', {
                number: cleanNumber,
                limit: 30 // Pegamos apenas as 30 mais recentes do celular para ser rápido
            })
          ]);

           // Normalizador: algumas rotas retornam { messages: { records: [] } }, outras retornam [] direto.
           const toArray = (v: any): any[] => {
             if (!v) return [];
             if (Array.isArray(v)) return v;
             // common envelopes
             if (Array.isArray(v.records)) return v.records;
             if (Array.isArray(v.messages)) return v.messages;
             if (Array.isArray(v.data)) return v.data;
             if (Array.isArray(v?.messages?.records)) return v.messages.records;
             if (Array.isArray(v?.messages?.data)) return v.messages.data;
             if (Array.isArray(v?.data?.records)) return v.data.records;
             return [];
           };

           const localMessages = localRes.status === 'fulfilled'
             ? toArray(localRes.value?.messages ?? localRes.value?.data ?? localRes.value)
             : [];
           const remoteMessages = remoteRes.status === 'fulfilled'
             ? toArray(remoteRes.value?.messages ?? remoteRes.value?.data ?? remoteRes.value)
             : [];

           console.log(`[whatsapp-proxy] Results: Local=${localMessages.length}, Remote=${remoteMessages.length}`);

           // 3. Mesclar e Deduplicar
           const allMessages: any[] = [...localMessages, ...remoteMessages];
          const uniqueMessages = [];
          const seenIds = new Set();

          // Priorizamos mensagens remotas (mais confiáveis) se houver conflito?
          // Na verdade, apenas garantimos unicidade pelo ID (key.id)
          for (const msg of allMessages) {
              const id = msg.key?.id || msg.id;
              if (id && !seenIds.has(id)) {
                  seenIds.add(id);
                  uniqueMessages.push(msg);
              }
          }

          // 4. Ordenar por Timestamp
          uniqueMessages.sort((a: any, b: any) => {
              const tA = Number(a.messageTimestamp || 0);
              const tB = Number(b.messageTimestamp || 0);
              return tA - tB;
          });

          // 5. Fallback Cego (Só se REALMENTE não tiver nada)
          if (uniqueMessages.length === 0) {
            console.log(`[whatsapp-proxy] Still empty, checking blind history without filters`);
            const blindRes = await callEvo(`chat/findMessages/${payload.instanceName}`, 'POST', {
              options: { limit: 50 }
            }).catch(() => []);
            
            const blindArray = blindRes?.messages || blindRes?.data || (Array.isArray(blindRes) ? blindRes : []);
            // Filtro manual rigoroso por JID no array cego
            const blindMatches = blindArray.filter((m: any) => {
              const mJid = m.key?.remoteJid || m.remoteJid || m.jid;
              return mJid === jid;
            });
            uniqueMessages.push(...blindMatches);
          }

          result = { messages: uniqueMessages };
        } catch (e) {
          console.error(`[whatsapp-proxy] Fatal error in get_messages:`, e);
          result = { messages: [], error: String(e) };
        }
        break;

      case 'get_groups':
        try {
          console.log(`[whatsapp-proxy] get_groups for ${payload.instanceName}`);
          const groupsData = await callEvo(`group/fetchAllGroups/${payload.instanceName}`, 'POST', {}).catch(async () => {
            // Fallback: buscar chats e filtrar por @g.us
            const allChats = await callEvo(`chat/findChats/${payload.instanceName}`, 'POST', {});
            const chatsArray = Array.isArray(allChats) ? allChats : (allChats?.data || allChats?.chats || []);
            return chatsArray.filter((c: any) => {
              const id = c.id || c.remoteJid || '';
              return typeof id === 'string' && id.includes('@g.us');
            });
          });
          const groupsArr = Array.isArray(groupsData) ? groupsData : (groupsData?.data || groupsData?.groups || []);
          result = groupsArr.map((g: any) => ({
            id: g.id || g.jid || g.remoteJid || '',
            name: g.subject || g.name || 'Grupo sem nome',
            groupId: g.id || g.jid || g.remoteJid || '',
          }));
        } catch (e) {
          console.error(`[whatsapp-proxy] Error in get_groups:`, e);
          result = [];
        }
        break;

      case 'send_message':
        result = await callEvo(`message/sendText/${payload.instanceName}`, 'POST', {
          number: payload.to,
          text: payload.text,
          delay: 1000
        });
        break;

      case 'toggle_ai':
        await supabase.from('whatsapp_instances').update({ ai_enabled: payload.enabled }).eq('instance_name', payload.instanceName);
        result = { success: true };
        break;

      case 'set_ai_config':
        // Update per-instance AI configuration (enabled + mode + selected model)
        await supabase
          .from('whatsapp_instances')
          .update({
            // Temporário: Drippy SEMPRE ativa no WhatsApp
            ai_enabled: true,
            ai_mode: 'drippy',
            ai_agent_id: null,
          })
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
