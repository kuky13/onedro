import { useEffect, useMemo, useState } from 'react';
import { apiGet, API_BASE_URL } from '@/services/api/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCcw, Server, Timer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { lazy, Suspense } from 'react';
const VpsRequestFlow = lazy(() => import('@/components/super-admin/VpsRequestFlow').then(m => ({ default: m.VpsRequestFlow })));

type VpsCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'up'; checkedAt: string; latencyMs: number; payload: unknown }
  | { status: 'down'; checkedAt: string; latencyMs: number | null; error: string; payload?: unknown };

function safeStringify(value: unknown) {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
}

async function fetchHealthRaw(url: string) {
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: res.ok, status: res.status, data: text }; }
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
      const payload = await apiGet<unknown>('/api/health', { timeoutMs: 10_000 });
      const latencyMs = Math.round(performance.now() - started);
      setState({ status: 'up', checkedAt, latencyMs, payload });
    } catch (e: any) {
      const latencyMs = Math.round(performance.now() - started);
      const errorMsg = e?.message ? String(e.message) : 'Falha ao checar /health';
      try {
        const raw = await fetchHealthRaw(healthUrl);
        setState({
          status: raw.ok ? 'up' : 'down', checkedAt, latencyMs, payload: raw.data,
          ...(raw.ok ? {} : { error: `${errorMsg} (HTTP ${raw.status})`, latencyMs }),
        } as VpsCheckState);
      } catch { setState({ status: 'down', checkedAt, latencyMs, error: errorMsg }); }
    }
  };

  useEffect(() => { runCheck(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => { runCheck(); }, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const statusBadge = (() => {
    if (state.status === 'checking') return <Badge variant="secondary">Checando…</Badge>;
    if (state.status === 'up') return <Badge>Conectada</Badge>;
    if (state.status === 'down') return <Badge variant="destructive">Offline</Badge>;
    return <Badge variant="outline">—</Badge>;
  })();

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Server className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">VPS / API Monitor</h1>
          <p className="text-sm text-muted-foreground">
            Healthcheck em <span className="font-mono text-xs">{healthUrl}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh((v) => !v)}
            className="rounded-xl text-sm"
            size="sm"
          >
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" onClick={runCheck} className="rounded-xl" size="sm">
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      <VpsRequestFlow apiBaseUrl={API_BASE_URL} isUp={state.status === 'up'} />

      {/* Status Cards */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Conexão</span>
              {statusBadge}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Última checagem</span>
              <span className="text-xs font-mono">
                {'checkedAt' in state ? new Date(state.checkedAt).toLocaleString() : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Latência</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Timer className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {'latencyMs' in state && state.latencyMs !== null ? `${state.latencyMs}ms` : '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Tempo total da checagem</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Diagnóstico</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              {state.status === 'up' ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-primary" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-xs text-muted-foreground">Mensagem</div>
            <div className="text-sm">
              {state.status === 'down' ? state.error
                : state.status === 'up' ? 'OK'
                : state.status === 'checking' ? 'Checando…' : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payload */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Payload /health</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[520px] overflow-auto rounded-xl border border-border bg-muted/40 p-4 text-xs leading-relaxed">
            {state.status === 'up' || state.status === 'down'
              ? safeStringify((state as any).payload)
              : state.status === 'checking' ? 'Carregando…' : '—'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
