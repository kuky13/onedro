import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";

serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { message, instanceName } = await req.json();
    const text = message.conversation || message.extendedTextMessage?.text || "";

    if (!text) return new Response("No text", { status: 200 });

    // AI Call (Simplified prompt for triage)
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um assistente de triagem de assistência técnica OneDrip. Seja educado e direto." },
          { role: "user", content: text }
        ]
      })
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content;

    if (reply) {
      const { data: config } = await supabase.from('evolution_config').select('api_url, global_api_key').maybeSingle();
      const { apiUrl: evoUrl, apiKey: evoKey } = resolveEvolutionConfig({
        globalApiUrl: config?.api_url,
        globalApiKey: config?.global_api_key,
      });

      if (!evoUrl || !evoKey) throw new Error("missing_evolution_config");

      await fetch(`${evoUrl.replace(/\/$/, '')}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": evoKey },
        body: JSON.stringify({ number: message.key.remoteJid, text: reply, delay: 2000 })
      });
    }

    return new Response("OK");
  } catch (e) {
    return new Response("Error", { status: 200 });
  }
});
