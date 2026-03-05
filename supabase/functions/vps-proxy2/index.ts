/**
 * VPS Proxy Edge Function (v2)
 * Version: 2026-01-22-vps-proxy2-1
 * Securely forwards requests to VPS API with Bearer authentication.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FUNCTION_VERSION = '2026-01-24-vps-proxy2-2';

interface VPSProxyRequest {
  endpoint: string;
  method?: string;
  body?: unknown;
}

function normalizeEnv(value: string | undefined | null) {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (v.toLowerCase() === 'undefined' || v.toLowerCase() === 'null') return null;
  return v;
}

function getEnvAny(keys: string[]) {
  for (const k of keys) {
    const val = normalizeEnv(Deno.env.get(k));
    if (val) return { key: k, value: val };
  }
  return { key: null as string | null, value: null as string | null };
}

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return { data: JSON.parse(text), raw: text };
  } catch {
    return { data: { raw: text }, raw: text };
  }
}

Deno.serve(async (req) => {
  console.log('[vps-proxy2] invoked', { version: FUNCTION_VERSION, method: req.method, url: req.url });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await (supabase.auth as any).getUser(token);

    if (userError || !user) {
      console.error('[vps-proxy2] auth error', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as VPSProxyRequest;
    const { endpoint, method = 'GET', body } = payload;

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const envBase = getEnvAny(['VPS_API_BASE_URL', 'VPS_URL']);
    const envToken = getEnvAny(['VPS_API_TOKEN', 'VPS_TOKEN']);
    const vpsBaseUrl = envBase.value;
    const vpsToken = envToken.value;

    console.log('[vps-proxy2] env presence', {
      baseUrlKey: envBase.key,
      tokenKey: envToken.key,
      hasBaseUrl: Boolean(vpsBaseUrl),
      hasToken: Boolean(vpsToken),
    });

    if (!vpsBaseUrl || !vpsToken) {
      return new Response(
        JSON.stringify({
          error: 'VPS configuration error',
          details: 'Missing VPS_API_BASE_URL (or VPS_URL) and/or VPS_API_TOKEN (or VPS_TOKEN).',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let baseUrlParsed: URL;
    try {
      baseUrlParsed = new URL(vpsBaseUrl);
    } catch {
      return new Response(
        JSON.stringify({
          error: 'VPS configuration error',
          details: 'Invalid VPS_API_BASE_URL (must be a full URL, e.g. https://example.com)',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // IMPORTANT: new URL('/x', 'https://host/api') becomes 'https://host/x' (drops '/api').
    // We must preserve any base pathname prefix (e.g., '/api') configured in VPS_API_BASE_URL.
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const basePathRaw = (baseUrlParsed.pathname || '').replace(/\/$/, '');

    const makeUrl = (path: string) =>
      new URL(`${baseUrlParsed.origin}${path}${baseUrlParsed.search ?? ''}`).toString();

    // Normaliza prefixo de path para evitar bases inválidas (ex.: '/api/errors/not-found')
    // que acabam concatenando endpoints em rotas inexistentes e gerando 404 em cascata.
    const basePath = basePathRaw === '/' ? '' : basePathRaw;
    const baseLooksLikeApiRoot = basePath === '' || basePath === '/api';

    // Ordem de tentativa:
    // 1) basePath + endpoint
    // 2) endpoint (sem prefixo)
    // 3) /api + endpoint
    // (dedupe mantendo ordem)
    const candidates = [
      `${basePath}${endpointPath}`,
      endpointPath,
      `/api${endpointPath}`,
    ].filter((p, i, arr) => p && arr.indexOf(p) === i);

    const primaryPath = candidates[0] ?? '/';
    const primaryUrl = makeUrl(primaryPath);

    const doFetch = (url: string) =>
      fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${vpsToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    let vpsRes = await doFetch(primaryUrl);

    // Fallback de rota para ambientes onde a VPS expõe endpoints com (ou sem) prefixo /api.
    // Para evitar efeitos colaterais, só fazemos retry em chamadas idempotentes (ex.: cache/get).
    const isIdempotentFallbackAllowed =
      method.toUpperCase() === 'GET' ||
      (method.toUpperCase() === 'POST' && endpointPath === '/cache/get');

    if (vpsRes.status === 404 && isIdempotentFallbackAllowed) {
      // Se a base parece não ser root da API, ainda tentamos alternativas seguras.
      // (mantém compatibilidade e evita ficar preso em um prefixo ruim)
      const tried: Array<{ path: string; status: number }> = [];
      tried.push({ path: primaryPath, status: vpsRes.status });

      for (const altPath of candidates.slice(1)) {
        // Se a base já é /api e também tentamos /api{endpoint}, isso pode duplicar.
        // Dedupe já evita, mas mantemos um guard extra.
        if (baseLooksLikeApiRoot === false && altPath.startsWith('/api') === false) {
          // ok
        }

        const altUrl = makeUrl(altPath);
        console.warn('[vps-proxy2] 404 on primary path, retrying alternate path', {
          endpoint: endpointPath,
          primaryPath,
          altPath,
          basePath,
        });
        const res = await doFetch(altUrl);
        tried.push({ path: altPath, status: res.status });
        vpsRes = res;
        if (vpsRes.status !== 404) break;
      }

      console.log('[vps-proxy2] fallback result', { endpoint: endpointPath, tried });
    }

    const parsed = await readJsonSafe(vpsRes);
    return new Response(JSON.stringify(parsed.data), {
      status: vpsRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-vps-proxy2-version': FUNCTION_VERSION },
    });
  } catch (error) {
    console.error('[vps-proxy2] error', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
