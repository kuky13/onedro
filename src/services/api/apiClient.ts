import { supabase } from '@/integrations/supabase/client';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  instance?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number | undefined;
  endpoint: string | undefined;
  constructor(message: string, opts?: { status?: number; endpoint?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts?.status;
    this.endpoint = opts?.endpoint;
  }
}

/**
 * URL base da API VPS.
 *
 * - Em produção (Vercel/etc): defina VITE_API_URL
 * - Fallback local: https://api.kuky.help
 */
export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL || 'https://api.kuky.help';

const buildUrl = (
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
) => {
  const base = API_BASE_URL.replace(/\/$/, '');
  const cleaned = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + cleaned);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
};

const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};

export const apiGet = async <T,>(
  path: string,
  opts?: {
    params?: Record<string, string | number | boolean | undefined | null>;
    timeoutMs?: number;
  }
): Promise<T> => {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const url = buildUrl(endpoint, opts?.params);
  const token = await getAccessToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 12_000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      throw new ApiError(`Erro HTTP ${res.status} ao chamar API`, { status: res.status, endpoint });
    }

    const json = (await res.json()) as ApiEnvelope<T>;
    if (!json || typeof json !== 'object') {
      throw new ApiError('Resposta inválida da API', { status: res.status, endpoint });
    }
    if (json.success !== true) {
      throw new ApiError(json.message || 'API retornou success=false', { status: res.status, endpoint });
    }

    return json.data;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new ApiError('Timeout ao chamar API', { endpoint });
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
};
