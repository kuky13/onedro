import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Aceita GET ou POST (supabase.functions.invoke usa POST por padrão)
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiUrl = Deno.env.get("EVOLUTION_GROUPS_URL");

    if (!apiUrl) {
      console.error("EVOLUTION_GROUPS_URL não configurada");
      return new Response(
        JSON.stringify({
          error: "evolution_configuration_missing",
          message:
            "Defina EVOLUTION_GROUPS_URL nas secrets do projeto apontando para o endpoint de listagem de grupos da Evolution v2 (sem token na URL).",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = Deno.env.get("EVOLUTION_API_KEY");

    if (!apiKey) {
      console.error("EVOLUTION_API_KEY não configurada");
      return new Response(
        JSON.stringify({
          error: "evolution_configuration_missing",
          message:
            "Defina EVOLUTION_API_KEY nas secrets do projeto com a API key da Evolution v2.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(
        "Erro ao chamar Evolution para listar grupos:",
        response.status,
        text,
      );
      return new Response(
        JSON.stringify({ error: "evolution_error", status: response.status }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    // Normaliza o formato para o frontend: [{ id, name }]
    const groups = (Array.isArray(data) ? data : (data as any)?.data || []).map(
      (g: any) => {
        const id =
          g.id ||
          g.chatId ||
          g.jid ||
          g.remoteJid ||
          g.remoteJid?._serialized ||
          "";

        const name = g.name || g.subject || g.title || "Grupo sem nome";

        return { id, name, raw: g };
      },
    );

    return new Response(JSON.stringify(groups), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função evolution-list-groups:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
