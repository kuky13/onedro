import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type Payload = {
  url: string;
  format: "mp4" | "mp3";
  quality: string;
};

const extractYouTubeId = (u: URL) => {
  const parts = u.pathname.split("/").filter(Boolean);

  if (u.hostname === "youtu.be") {
    return parts[0] || "";
  }

  if (u.pathname === "/watch") {
    return u.searchParams.get("v") || "";
  }

  if (["shorts", "embed", "live"].includes(parts[0] || "")) {
    return parts[1] || "";
  }

  return "";
};

const normalizeMediaUrl = (value: string) => {
  try {
    const u = new URL(value.trim());
    const hostname = u.hostname.toLowerCase();

    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
      const videoId = extractYouTubeId(u);
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    u.searchParams.delete("si");
    return u.toString();
  } catch {
    return value.trim();
  }
};

const isValidHttpUrl = (value: string) => {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const API_BASE = "https://api.kuky.help";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<Payload>;

    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
    const url = normalizeMediaUrl(rawUrl);
    const format = body.format === "mp3" ? "mp3" : "mp4";
    const quality = typeof body.quality === "string" && body.quality.trim() ? body.quality.trim() : "best";

    if (!url || !isValidHttpUrl(url)) {
      return new Response(JSON.stringify({ success: false, message: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const upstreamUrl = `${API_BASE}/api/download`;
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ url, format, quality }),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const text = await upstream.text();

    console.log(
      `[media-download-proxy] upstream ${upstream.status} ${upstream.statusText} content-type=${contentType} url=${upstreamUrl}`,
    );

    let data: any = {};
    const snippet = (text || "").slice(0, 600);

    const isJson = contentType.toLowerCase().includes("application/json");
    if (!isJson) {
      data = {
        success: false,
        message: "Resposta inválida da API",
        details:
          `Upstream retornou content-type não JSON (${contentType || "desconhecido"}). ` +
          `Status ${upstream.status}. Body: ${snippet || "(vazio)"}`,
      };
    } else {
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = {
          success: false,
          message: "Resposta inválida da API",
          details: `Falha ao fazer parse do JSON. Status ${upstream.status}. Body: ${snippet || "(vazio)"}`,
        };
      }
    }

    const upstreamFailed = !upstream.ok;
    const rawMessage = String(data?.message || data?.error || "").toLowerCase();

    if (upstreamFailed) {
      data = {
        success: false,
        ...data,
        message:
          data?.message ||
          (rawMessage === "download failed" ? "Falha ao processar download na VPS" : undefined) ||
          "Falha ao processar download",
        details:
          data?.details ||
          (rawMessage === "download failed"
            ? `A VPS retornou erro ao processar a mídia. URL enviada: ${url}${url !== rawUrl ? ` (normalizada de ${rawUrl})` : ""}`
            : undefined),
        upstreamStatus: upstream.status,
      };
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno", details: e?.message ?? String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
