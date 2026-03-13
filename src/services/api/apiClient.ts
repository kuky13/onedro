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

export const API_BASE_URL = (import.meta as any)?.env?.VITE_API_URL || 'https://api.kuky.help/api';

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

const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (session?.access_token) {
    // Check if token expires in less than 60s – refresh proactively
    const expiresAt = session.expires_at; // unix seconds
    if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      return refreshData.session?.access_token ?? null;
    }
    return session.access_token;
  }

  // No session – try to refresh (handles stale/expired tokens)
  const { data: refreshData } = await supabase.auth.refreshSession();
  return refreshData.session?.access_token ?? null;
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const isNetworkError = (e: any): boolean =>
  e?.name === 'AbortError' || e?.name === 'TypeError' || e?.message === 'Failed to fetch';

type RequestOpts = {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  retries?: number;
};

async function apiFetch<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOpts
): Promise<T> {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const url = buildUrl(endpoint, opts?.params);
  const token = await getAccessToken();
  const maxRetries = opts?.retries ?? 1;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await delay(1500 * attempt); // backoff: 1.5s, 3s, ...
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30_000);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!res.ok) {
        const status = res.status;
        
        // Handle 401 specifically if needed, but for now we throw error
        if (status === 401) {
             // Optional: trigger logout or redirect logic here if global handling is desired
        }

        // Don't retry on client errors (4xx) unless it's a specific case
        if (status >= 400 && status < 500) {
          throw new ApiError(`Erro HTTP ${status} ao chamar API`, { status, endpoint });
        }
        throw new ApiError(`Erro HTTP ${status} ao chamar API`, { status, endpoint });
      }

      // DELETE may return 204 No Content
      if (res.status === 204) {
        return undefined as unknown as T;
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
      lastError = e;
      clearTimeout(timer);

      // Don't retry on 4xx errors
      if (e instanceof ApiError && e.status && e.status >= 400 && e.status < 500) {
        throw e;
      }

      // Retry only on network errors
      if (isNetworkError(e) && attempt < maxRetries) {
        console.warn(`[apiClient] Tentativa ${attempt + 1} falhou para ${endpoint}, retentando...`);
        continue;
      }

      if (e?.name === 'AbortError') {
        throw new ApiError('Conexão instável ou processamento demorado, tente novamente', { endpoint });
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export const apiGet = <T,>(
  path: string,
  opts?: RequestOpts
): Promise<T> => apiFetch<T>('GET', path, undefined, opts);

export const apiPost = <T,>(
  path: string,
  body: unknown,
  opts?: RequestOpts
): Promise<T> => apiFetch<T>('POST', path, body, opts);

export const apiPut = <T,>(
  path: string,
  body: unknown,
  opts?: RequestOpts
): Promise<T> => apiFetch<T>('PUT', path, body, opts);

export const apiDelete = <T = void,>(
  path: string,
  opts?: RequestOpts
): Promise<T> => apiFetch<T>('DELETE', path, undefined, opts);
