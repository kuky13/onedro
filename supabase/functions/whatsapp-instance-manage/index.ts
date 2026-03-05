import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { resolveEvolutionConfig } from "../_shared/evolution-config.ts";
type Action = "logout" | "delete";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callEvolution(opts: {
  baseUrl: string;
  evolutionApiKey: string;
  instanceName: string;
  action: Action;
}): Promise<{ ok: true } | { ok: false; status: number; message: string; raw?: string }> {
  const { baseUrl, evolutionApiKey, instanceName, action } = opts;

  const path = action === "logout"
    ? `instance/logout/${instanceName}`
    : `instance/delete/${instanceName}`;

  const res = await fetch(`${baseUrl}/${path}`, {
    method: "DELETE",
    headers: { apikey: evolutionApiKey },
  });

  if (res.ok) return { ok: true };

  const t = await res.text();
  console.error("[whatsapp-instance-manage] Evolution error:", res.status, t);

  return {
    ok: false,
    status: res.status,
    message: `evolution_error_${res.status}`,
    raw: t,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ ok: false, error: "misconfigured" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ ok: false, error: "unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ ok: false, error: "invalid_token" }, 401);

    const ownerId = user.id;

    const { action, password } = await req.json();

    if (action !== "logout" && action !== "delete") {
      return jsonResponse({ ok: false, error: "invalid_action" }, 400);
    }

    if (!password || typeof password !== "string" || password.trim().length < 1) {
      return jsonResponse({ ok: false, error: "password_required" }, 400);
    }

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

    const { data: settings, error: settingsError } = await supabase
      .from("whatsapp_settings")
      .select("evolution_instance_id, evolution_api_url")
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const instanceName = settings?.evolution_instance_id;
    if (!instanceName) {
      return jsonResponse({ ok: false, error: "no_instance" }, 400);
    }

    const { apiUrl: resolvedBaseUrl, apiKey: evolutionApiKey } = resolveEvolutionConfig({
      userApiUrl: userEvoCfg?.api_url ?? settings?.evolution_api_url,
      userApiKey: userEvoCfg?.api_key,
      globalApiUrl: globalCfg?.api_url ?? "https://evo2.kuky.shop",
      globalApiKey: globalCfg?.global_api_key,
    });

    const baseUrl = resolvedBaseUrl;

    if (!evolutionApiKey) {
      return jsonResponse({ ok: false, error: "missing_evolution_api_key" }, 400);
    }

    const evo = await callEvolution({ baseUrl, evolutionApiKey, instanceName, action });

    const evolutionOk = evo.ok || evo.status === 404;

    if (!evolutionOk) {
      return jsonResponse(
        {
          ok: false,
          error: evo.message,
          evolution_status: evo.status,
          evolution_raw: evo.raw,
        },
        200
      );
    }

    // ── Bug 2 fix: also clean up whatsapp_instances ──
    if (action === "logout") {
      await supabase.from("whatsapp_settings").update({ is_active: false }).eq("owner_id", ownerId);
      // Update whatsapp_instances status to disconnected
      await supabase
        .from("whatsapp_instances")
        .update({ status: "disconnected" })
        .eq("user_id", ownerId)
        .eq("instance_name", instanceName);
    } else {
      // action === "delete"
      await supabase.from("whatsapp_settings").delete().eq("owner_id", ownerId);
      // Also delete from whatsapp_instances
      await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("user_id", ownerId)
        .eq("instance_name", instanceName);
    }

    return jsonResponse({
      ok: true,
      action,
      instance_id: instanceName,
      sent_to_evolution: evo.ok,
      warning: evo.ok ? null : "evolution_instance_not_found",
    });
  } catch (e) {
    console.error("[whatsapp-instance-manage] Fatal error:", e);
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
