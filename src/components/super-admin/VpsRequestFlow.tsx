import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Database, ShieldCheck, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

type FlowMode = 'read' | 'fallback' | 'write';

type FlowNode = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string | undefined }>;
  details: string;
  badge?: string;
};

function FlowStep({ node, active }: { node: FlowNode; active?: boolean }) {
  const Icon = node.icon;

  return (
    <HoverCard openDelay={150} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            'group w-full rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3 text-left shadow-sm transition-all',
            'hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30',
            active && 'border-primary/35 shadow-md shadow-primary/15'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-background/40 transition-all',
                  active && 'border-primary/35 bg-primary/10'
                )}
              >
                <Icon className={cn('h-4 w-4 text-muted-foreground group-hover:text-foreground', active && 'text-primary')} />
              </div>

              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">{node.title}</div>
                  {node.badge ? (
                    <Badge variant={active ? 'default' : 'secondary'} className="h-5">
                      {node.badge}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">{node.subtitle}</div>
              </div>
            </div>

            <div className={cn('mt-1 h-2 w-2 rounded-full bg-muted transition-all', active && 'bg-primary')} />
          </div>
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-[320px]">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-foreground">{node.title}</div>
          <p className="text-sm text-muted-foreground">{node.details}</p>
          <p className="text-xs text-muted-foreground">
            Dica: passe o mouse (ou toque) em cada etapa para entender o papel dela.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

function Connector({ direction }: { direction: 'right' | 'down' }) {
  const Icon = direction === 'right' ? ArrowRight : ArrowDown;
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className={cn('h-px w-8 bg-border', direction === 'down' && 'h-8 w-px')} />
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

export function VpsRequestFlow({ apiBaseUrl, isUp }: { apiBaseUrl: string; isUp: boolean }) {
  const [mode, setMode] = useState<FlowMode>('read');

  const flows = useMemo<Record<FlowMode, { title: string; hint: string; nodes: FlowNode[] }>>(
    () => ({
      read: {
        title: 'Leitura (GET) — caminho rápido com cache',
        hint: 'O app consulta a VPS; o Redis acelera as telas mais acessadas. Se não houver cache, a VPS busca no Supabase e salva o resultado.',
        nodes: [
          {
            id: 'client',
            title: 'App (React) — Navegador/Mobile',
            subtitle: 'Inicia a requisição e envia JWT do usuário',
            icon: ShieldCheck,
            badge: 'JWT',
            details:
              'O frontend chama a API externa (VPS) para operações de leitura. O token do Supabase é enviado no Authorization para permitir o escopo por usuário (quando aplicável).',
          },
          {
            id: 'vps',
            title: 'API VPS (api.kuky.help)',
            subtitle: 'Node/Express + regras de rota',
            icon: Zap,
            badge: 'GET',
            details:
              'A VPS recebe a chamada, aplica validações e usa cache. Para dados não cacheados, ela consulta o Supabase (Postgres) e retorna a resposta.',
          },
          {
            id: 'redis',
            title: 'Redis (cache)',
            subtitle: 'Hit/miss e TTL por endpoint',
            icon: Database,
            badge: 'Cache',
            details:
              'Se houver resposta em cache (hit), retorna instantaneamente. Se não (miss), a VPS consulta o Supabase e salva no Redis por um tempo (TTL).',
          },
          {
            id: 'supabase',
            title: 'Supabase (Postgres + RLS)',
            subtitle: 'Fonte de verdade dos dados',
            icon: Database,
            badge: 'DB',
            details:
              'O Supabase mantém os dados (clientes, orçamentos etc.). RLS garante que cada usuário veja apenas o que pode ver.',
          },
        ],
      },
      fallback: {
        title: 'Fallback — quando a VPS falha',
        hint: 'Se a VPS ficar offline, o app pode cair para leituras direto no Supabase (mais lento, mas mantém o sistema funcionando).',
        nodes: [
          {
            id: 'client',
            title: 'App (React) — Navegador/Mobile',
            subtitle: 'Detecta erro/timeout',
            icon: ShieldCheck,
            badge: 'Failover',
            details:
              'Quando a API externa não responde (timeout/erro), o app usa o fallback interno para buscar os dados via SDK do Supabase.',
          },
          {
            id: 'supabase',
            title: 'Supabase (Postgres + RLS)',
            subtitle: 'Leitura direta via SDK',
            icon: Database,
            badge: 'SDK',
            details:
              'O Supabase responde diretamente (sem Redis da VPS). É mais confiável como fallback, porém com performance inferior ao caminho cacheado.',
          },
        ],
      },
      write: {
        title: 'Escrita (POST/PUT/DELETE) — consistente e auditável',
        hint: 'Operações que alteram dados continuam no Supabase (fonte de verdade). A VPS invalida cache quando necessário.',
        nodes: [
          {
            id: 'client',
            title: 'App (React) — Navegador/Mobile',
            subtitle: 'Envia a alteração (criar/editar/remover)',
            icon: ShieldCheck,
            badge: 'Write',
            details:
              'O usuário cria/edita dados. Para segurança e consistência, as escritas devem respeitar RLS e serem auditáveis.',
          },
          {
            id: 'supabase',
            title: 'Supabase (DB + Regras)',
            subtitle: 'Validação + persistência',
            icon: Database,
            badge: 'RLS',
            details:
              'As alterações são persistidas no Postgres e passam pelas políticas de acesso (RLS). Isso reduz risco de vazamento e inconsistência.',
          },
          {
            id: 'redis',
            title: 'Redis (invalidação)',
            subtitle: 'Limpa caches impactados',
            icon: Database,
            badge: 'Purge',
            details:
              'Após uma escrita, caches relacionados são invalidados para que as próximas leituras (GET) voltem a refletir os dados mais recentes.',
          },
        ],
      },
    }),
    []
  );

  const flow = flows[mode];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Fluxo da arquitetura</CardTitle>
            <p className="text-sm text-muted-foreground">
              Base: <span className="font-mono">{apiBaseUrl.replace(/\/$/, '')}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isUp ? 'default' : 'destructive'}>{isUp ? 'VPS Online' : 'VPS Offline'}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === 'read' ? 'default' : 'outline'}
            onClick={() => setMode('read')}
          >
            Leitura (GET)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'write' ? 'default' : 'outline'}
            onClick={() => setMode('write')}
          >
            Escrita (POST/PUT)
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'fallback' ? 'default' : 'outline'}
            onClick={() => setMode('fallback')}
          >
            Fallback
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">{flow.title}</div>
          <p className="text-sm text-muted-foreground">{flow.hint}</p>
        </div>

        {/* Desktop: horizontal */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-3">
          {flow.nodes.map((node, idx) => {
            const isLast = idx === flow.nodes.length - 1;
            return (
              <div key={node.id} className="contents">
                <FlowStep node={node} active={isUp && (mode === 'read' ? node.id === 'vps' || node.id === 'redis' : node.id === 'supabase')} />
                {!isLast ? <Connector direction="right" /> : null}
              </div>
            );
          })}
        </div>

        {/* Mobile/tablet: vertical */}
        <div className="grid gap-3 lg:hidden">
          {flow.nodes.map((node, idx) => {
            const isLast = idx === flow.nodes.length - 1;
            return (
              <div key={node.id} className="grid gap-3">
                <FlowStep node={node} active={isUp && (mode === 'read' ? node.id === 'vps' || node.id === 'redis' : node.id === 'supabase')} />
                {!isLast ? <Connector direction="down" /> : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Como ler isso:</span> cada etapa é um “ponto de responsabilidade”.
            Passe o mouse/toque para ver detalhes; troque as abas para entender GET, Escritas e o Fallback.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
