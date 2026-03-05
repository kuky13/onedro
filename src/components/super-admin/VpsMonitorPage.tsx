import { useEffect, useMemo, useState } from 'react';
import { apiGet, API_BASE_URL } from '@/services/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Server, Timer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VpsRequestFlow } from '@/components/super-admin/VpsRequestFlow';

type VpsCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | {
      status: 'up';
      checkedAt: string;
      latencyMs: number;
      payload: unknown;
    }
  | {
      status: 'down';
      checkedAt: string;
      latencyMs: number | null;
      error: string;
      payload?: unknown;
    };

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function fetchHealthRaw(url: string) {
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

export function VpsMonitorPage() {
  const healthUrl = useMemo(() => {
    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}/api/health`;
  }, []);

  const [state, setState] = useState<VpsCheckState>({ status: 'idle' });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const runCheck = async () => {
    setState({ status: 'checking' });
    const started = performance.now();
    const checkedAt = new Date().toISOString();

    try {
      // Preferimos o client padrão (com JWT) caso o /health esteja protegido e siga o envelope.
      // Se falhar, caímos para um fetch raw sem exigir envelope.
      const payload = await apiGet<unknown>('/api/health', { timeoutMs: 10_000 });
      const latencyMs = Math.round(performance.now() - started);
      setState({ status: 'up', checkedAt, latencyMs, payload });
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - started);
      const errorMsg = e?.message ? String(e.message) : 'Falha ao checar /health';

      try {
        const raw = await fetchHealthRaw(healthUrl);
        setState({
          status: raw.ok ? 'up' : 'down',
          checkedAt,
          latencyMs,
          payload: raw.data,
          ...(raw.ok ? {} : { error: `${errorMsg} (HTTP ${raw.status})`, latencyMs }),
        } as VpsCheckState);
      } catch {
        setState({ status: 'down', checkedAt, latencyMs, error: errorMsg });
      }
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      runCheck();
    }, 30_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  const statusBadge = (() => {
    if (state.status === 'checking') return <Badge variant="secondary">Checando…</Badge>;
    if (state.status === 'up') return <Badge>Conectada</Badge>;
    if (state.status === 'down') return <Badge variant="destructive">Offline</Badge>;
    return <Badge variant="outline">—</Badge>;
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">VPS / API Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Healthcheck em <span className="font-mono">{healthUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" onClick={runCheck}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </header>

      <VpsRequestFlow apiBaseUrl={API_BASE_URL} isUp={state.status === 'up'} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conexão</span>
              {statusBadge}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última checagem</span>
              <span className="text-sm font-mono">
                {'checkedAt' in state ? new Date(state.checkedAt).toLocaleString() : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Latência</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {'latencyMs' in state && state.latencyMs !== null ? `${state.latencyMs}ms` : '—'}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Tempo total da checagem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Diagnóstico</CardTitle>
            {state.status === 'up' ? (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">Mensagem</div>
            <div className="text-sm">
              {state.status === 'down'
                ? state.error
                : state.status === 'up'
                  ? 'OK'
                  : state.status === 'checking'
                    ? 'Checando…'
                    : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payload /health</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-xs leading-relaxed">
            {state.status === 'up' || state.status === 'down'
              ? safeStringify((state as any).payload)
              : state.status === 'checking'
                ? 'Carregando…'
                : '—'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
