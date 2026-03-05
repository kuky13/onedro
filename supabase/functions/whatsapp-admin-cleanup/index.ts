import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error) throw error;
  if (!profile || profile.role !== "admin") {
    return false;
  }
  return true;
}

async function deleteAll(
  supabase: any,
  table: string,
  filterCol: string
): Promise<number> {
  // Supabase requires a filter for delete. We delete everything by filtering on a column that exists for all rows.
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .not(filterCol, "is", null);

  if (error) throw error;
  return count ?? 0;
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

    const isAdmin = await requireAdmin(supabase, user.id);
    if (!isAdmin) return jsonResponse({ ok: false, error: "forbidden" }, 403);

    // Execute global cleanup (irreversible)
    // Order matters to avoid FK errors.
    const deletedMessages = await deleteAll(supabase, "whatsapp_messages", "id");
    const deletedEvents = await deleteAll(supabase, "whatsapp_webhook_events", "id");
    const deletedConversations = await deleteAll(supabase, "whatsapp_conversations", "id");
    const deletedSettings = await deleteAll(supabase, "whatsapp_settings", "id");

    return jsonResponse({
      ok: true,
      deleted: {
        whatsapp_messages: deletedMessages,
        whatsapp_webhook_events: deletedEvents,
        whatsapp_conversations: deletedConversations,
        whatsapp_settings: deletedSettings,
      },
    });
  } catch (e) {
    console.error("[whatsapp-admin-cleanup] Fatal error:", e);
    return jsonResponse({ ok: false, error: String(e) }, 500);
  }
});
