import { z } from "zod";

import { API_BASE_URL } from "@/services/api/apiClient";
import { supabase } from "@/integrations/supabase/client";

export type MediaDownloadFormat = "mp4" | "mp3";

export type MediaDownloadRequest = {
  url: string;
  format: MediaDownloadFormat;
  quality: string;
};

const normalizeInputUrl = (value: string) => {
  const input = value.trim();
  if (!input) return input;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const segments = url.pathname.split("/").filter(Boolean);

    let videoId = "";

    if (hostname === "youtu.be") {
      videoId = segments[0] || "";
    } else if (hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v") || "";
      } else if (["shorts", "embed", "live"].includes(segments[0] || "")) {
        videoId = segments[1] || "";
      }
    }

    if (videoId) {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }

    url.searchParams.delete("si");
    return url.toString();
  } catch {
    return input;
  }
};

const MediaDownloadResponseSchema = z.object({
  success: z.boolean().optional(),
  downloadUrl: z.string().optional(),
  fileName: z.string().optional(),
  filename: z.string().optional(),
  size: z.number().optional(),
  fileSize: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export type MediaDownloadResponse = z.infer<typeof MediaDownloadResponseSchema>;

const normalizeDownloadUrl = (downloadUrl: string) => {
  if (!downloadUrl) return downloadUrl;
  if (downloadUrl.startsWith("/")) {
    const origin = new URL(API_BASE_URL).origin;
    return `${origin}${downloadUrl}`;
  }
  return downloadUrl;
};

const safeParseJson = async (res: Response): Promise<unknown | null> => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export async function requestMediaDownload(payload: MediaDownloadRequest): Promise<{
  downloadUrl: string;
  filename: string;
  size?: number;
}> {
  const normalizedPayload = {
    ...payload,
    url: normalizeInputUrl(payload.url),
  };

  const callViaDirectFetch = async () => {
    // Refresh token proactively if near expiry
    const { data: sessionData } = await supabase.auth.getSession();
    let token = sessionData.session?.access_token;
    const expiresAt = sessionData.session?.expires_at;
    if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      token = refreshData.session?.access_token ?? token;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 120s for video processing

    try {
      // API_BASE_URL is now .../api, so we append /download
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(normalizedPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const raw = await safeParseJson(res);
      const parsed = MediaDownloadResponseSchema.safeParse(raw ?? {});
      const body = (parsed.success ? parsed.data : {}) as MediaDownloadResponse;

      if (!res.ok) {
        const msg =
          (res.status === 500 && body.details)
            ? body.details
            : (body.error || body.message || `Erro HTTP ${res.status}`);
        throw new Error(msg);
      }

      const successFlag = body.success;
      const downloadUrl = body.downloadUrl;
      if (successFlag !== true || !downloadUrl) {
        throw new Error(body.error || body.message || "API não retornou URL de download válida");
      }

      const normalizedUrl = normalizeDownloadUrl(downloadUrl);
      const filename = body.fileName || body.filename || normalizedUrl.split("/").pop() || "video_download";
      const size = body.size ?? body.fileSize;

      return {
        downloadUrl: normalizedUrl,
        filename,
        ...(typeof size === "number" ? { size } : {}),
      };
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('A VPS está processando sua solicitação, por favor aguarde um momento ou tente novamente.');
      }
      throw e;
    }
  };

  const callViaEdgeProxy = async () => {
    const { data, error } = await supabase.functions.invoke("media-download-proxy", {
      body: normalizedPayload,
    });
    if (error) throw new Error(error.message || "Falha no proxy de download");

    const parsed = MediaDownloadResponseSchema.safeParse(data ?? {});
    const body = (parsed.success ? parsed.data : {}) as MediaDownloadResponse;

    const successFlag = body.success;
    const downloadUrl = body.downloadUrl;
    if (successFlag !== true || !downloadUrl) {
      // edge proxy repassa body.details também
      throw new Error(body.details || body.error || body.message || "API não retornou URL de download válida");
    }

    const normalizedUrl = normalizeDownloadUrl(downloadUrl);
    const filename = body.fileName || body.filename || normalizedUrl.split("/").pop() || "video_download";
    const size = body.size ?? body.fileSize;

    return {
      downloadUrl: normalizedUrl,
      filename,
      ...(typeof size === "number" ? { size } : {}),
    };
  };

  try {
    return await callViaDirectFetch();
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const isNetworkIssue = msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror");
    const isServerError = msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504");
    if (isNetworkIssue || isServerError) {
      return await callViaEdgeProxy();
    }
    throw e;
  }
}
