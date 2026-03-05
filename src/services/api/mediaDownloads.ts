import { z } from "zod";

import { API_BASE_URL } from "@/services/api/apiClient";
import { supabase } from "@/integrations/supabase/client";

export type MediaDownloadFormat = "mp4" | "mp3";

export type MediaDownloadRequest = {
  url: string;
  format: MediaDownloadFormat;
  quality: string;
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
  if (downloadUrl.startsWith("/")) return `${API_BASE_URL.replace(/\/$/, "")}${downloadUrl}`;
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
  const callViaDirectFetch = async () => {
    const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/download`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

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
  };

  const callViaEdgeProxy = async () => {
    const { data, error } = await supabase.functions.invoke("media-download-proxy", {
      body: payload,
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
    // Se for erro de rede/CORS no browser, costuma chegar como TypeError: Failed to fetch.
    const msg = String(e?.message ?? e);
    if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
      return await callViaEdgeProxy();
    }
    throw e;
  }
}
