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
    const apiUrl = Deno.env.get("ZAPI_GROUPS_URL");
    const apiToken = Deno.env.get("ZAPI_GROUPS_TOKEN");

    if (!apiUrl || !apiToken) {
      console.error("ZAPI_GROUPS_URL ou ZAPI_GROUPS_TOKEN não configurados");
      return new Response(
        JSON.stringify({
          error: "ZAPI configuration missing",
          message:
            "Defina ZAPI_GROUPS_URL e ZAPI_GROUPS_TOKEN nas secrets do projeto para listar os grupos.",
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
        "client-token": apiToken,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Erro ao chamar Z-API para listar grupos:", response.status, text);
      return new Response(
        JSON.stringify({ error: "zapi_error", status: response.status }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro na função zapi-list-groups:", error);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
