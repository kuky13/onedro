import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Acesso negado: Sem autorização");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Acesso negado: Usuário inválido");

    const { action, payload } = await req.json();

    const baseUrlRaw = Deno.env.get("WAHA_BASE_URL") || Deno.env.get("WAHA_URL");
    const apiKey = Deno.env.get("WAHA_API_KEY");
    const session = payload?.session || Deno.env.get("WAHA_SESSION") || "default";

    if (!baseUrlRaw || !apiKey) {
      throw new Error("Configuração do WAHA (URL/Key) não encontrada nas Secrets.");
    }

    const baseUrl = baseUrlRaw.endsWith("/") ? baseUrlRaw.slice(0, -1) : baseUrlRaw;

    const callWaha = async (path: string, method: string = "GET", body: any = null) => {
      // WAHA endpoints can vary by version. We try common patterns.
      const url = `${baseUrl}${path}`;
      
      const options: any = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
      };

      if (body && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify({ ...body, session });
      }

      const res = await fetch(url, options);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`WAHA Error (${res.status}): ${errorText}`);
      }
      return await res.json();
    };

    let result: any = null;

    switch (action) {
      case "list_chats":
        // Try multiple endpoints for chats
        try {
          result = await callWaha(`/api/chats?session=${encodeURIComponent(session)}`);
        } catch (e) {
          try {
            result = await callWaha(`/api/${encodeURIComponent(session)}/chats`);
          } catch (e2) {
            console.error("Failed to fetch chats from all candidates", e2);
            result = [];
          }
        }
        break;

      case "get_messages":
        const chatId = payload?.chatId;
        if (!chatId) throw new Error("chatId is required");
        try {
          result = await callWaha(`/api/messages?session=${encodeURIComponent(session)}&chatId=${encodeURIComponent(chatId)}&limit=50`);
        } catch (e) {
          try {
            result = await callWaha(`/api/${encodeURIComponent(session)}/messages?chatId=${encodeURIComponent(chatId)}&limit=50`);
          } catch (e2) {
            console.error("Failed to fetch messages from all candidates", e2);
            result = [];
          }
        }
        break;

      case "send_message":
        const to = payload?.chatId || payload?.to;
        const text = payload?.text;
        if (!to || !text) throw new Error("to and text are required");
        
        // WAHA v2 uses /api/sendText
        result = await callWaha(`/api/sendText`, "POST", {
          chatId: to,
          text: text,
        });
        break;

      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro na função waha-proxy:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
