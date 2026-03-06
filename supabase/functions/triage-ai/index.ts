import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
import { getAIConfig, callAIProvider, logAIRequest } from "../_shared/ai-provider.ts";

serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { message, instanceName } = await req.json();
    const text = message.conversation || message.extendedTextMessage?.text || "";

    if (!text) return new Response("No text", { status: 200 });

    // Get dynamic AI configuration
    const aiConfig = await getAIConfig(supabase);

    if (!aiConfig.apiKey) {
      console.error('[TRIAGE-AI] No API key available:', aiConfig.error);
      return new Response("No AI config", { status: 200 });
    }

    const startTime = Date.now();

    try {
      const result = await callAIProvider(aiConfig, {
        messages: [
          { role: "system", content: "Você é um assistente de triagem de assistência técnica OneDrip. Seja educado e direto." },
          { role: "user", content: text }
        ]
      });

      const reply = result.content;

      // Log success
      await logAIRequest({
        provider: aiConfig.provider,
        model: aiConfig.model,
        source: 'triage',
        input_tokens: result.usage?.input_tokens,
        output_tokens: result.usage?.output_tokens,
        duration_ms: Date.now() - startTime,
        status: 'success',
      }, supabase);

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
    } catch (aiError) {
      // Log error
      await logAIRequest({
        provider: aiConfig.provider,
        model: aiConfig.model,
        source: 'triage',
        duration_ms: Date.now() - startTime,
        status: 'error',
        error_message: aiError instanceof Error ? aiError.message : String(aiError),
      }, supabase);
      throw aiError;
    }

    return new Response("OK");
  } catch (e) {
    console.error("[TRIAGE-AI] Error:", e);
    return new Response("Error", { status: 200 });
  }
});
