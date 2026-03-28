import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MessageCircle, Bot, UserCheck, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DayBucket {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "seg"
  count: number;
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;

  const since30 = subDays(new Date(), 30).toISOString();
  const since7 = subDays(new Date(), 7).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-analytics', ownerId],
    enabled: Boolean(ownerId),
    refetchInterval: 60_000,
    queryFn: async () => {
      const owner = ownerId as string;

      // All conversations
      const { data: convs } = await supabase
        .from('whatsapp_conversations')
        .select('id, status, ai_paused, created_at')
        .eq('owner_id', owner);

      // Messages last 30d
      const { data: msgs } = await supabase
        .from('whatsapp_messages')
        .select('id, direction, created_at')
        .eq('owner_id', owner)
        .gte('created_at', since30);

      // Conversations last 7d
      const { data: convs7 } = await supabase
        .from('whatsapp_conversations')
        .select('id, ai_paused')
        .eq('owner_id', owner)
        .gte('created_at', since7);

      return { convs: convs ?? [], msgs: msgs ?? [], convs7: convs7 ?? [] };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { convs, msgs, convs7 } = data;

  const totalOpen = convs.filter((c) => c.status !== 'closed').length;
  const totalClosed = convs.filter((c) => c.status === 'closed').length;
  const awaitingHuman = convs.filter((c) => c.ai_paused && c.status !== 'closed').length;
  const aiActive = convs.filter((c) => !c.ai_paused && c.status !== 'closed').length;

  const handoffRate7 = convs7.length > 0
    ? Math.round((convs7.filter((c) => c.ai_paused).length / convs7.length) * 100)
    : 0;

  const aiResolutionRate7 = convs7.length > 0
    ? Math.round((convs7.filter((c) => !c.ai_paused).length / convs7.length) * 100)
    : 0;

  const msgsSent = msgs.filter((m) => m.direction === 'out').length;
  const msgsReceived = msgs.filter((m) => m.direction === 'in').length;

  // Build last 14 days buckets
  const buckets: DayBucket[] = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'EEE', { locale: ptBR }),
      count: 0,
    };
  });

  for (const msg of msgs) {
    const day = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const bucket = buckets.find((b) => b.date === day);
    if (bucket) bucket.count++;
  }

  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<MessageCircle className="h-4 w-4" />}
          label="Conversas ativas"
          value={totalOpen}
          color="text-foreground"
        />
        <StatCard
          icon={<Bot className="h-4 w-4" />}
          label="IA respondendo"
          value={aiActive}
          color="text-green-500"
        />
        <StatCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Aguardando humano"
          value={awaitingHuman}
          color={awaitingHuman > 0 ? 'text-amber-500' : 'text-foreground'}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Fechadas"
          value={totalClosed}
          color="text-muted-foreground"
        />
      </div>

      {/* Rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <RateCard
          label="Taxa de resolução IA (7d)"
          value={aiResolutionRate7}
          description="Conversas resolvidas pela IA sem precisar de atendente"
          color="bg-green-500"
        />
        <RateCard
          label="Taxa de handoff (7d)"
          value={handoffRate7}
          description="Conversas que a IA transferiu para atendente humano"
          color="bg-amber-500"
        />
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Mensagens (30 dias)
            </p>
            <div className="flex gap-4 mt-1">
              <div>
                <p className="text-2xl font-bold text-foreground">{msgsReceived}</p>
                <p className="text-[10px] text-muted-foreground">recebidas</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-primary">{msgsSent}</p>
                <p className="text-[10px] text-muted-foreground">enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Mensagens por dia (últimos 14 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-28">
            {buckets.map((b) => (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="relative w-full flex justify-center">
                  {b.count > 0 && (
                    <span className="absolute -top-5 text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {b.count}
                    </span>
                  )}
                  <div
                    className={cn("w-full rounded-t-sm transition-all", b.count > 0 ? "bg-primary/70 hover:bg-primary" : "bg-muted/30")}
                    style={{ height: `${Math.max((b.count / maxCount) * 96, b.count > 0 ? 4 : 2)}px` }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground capitalize">{b.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</p>
        <p className={cn("text-3xl font-bold", color)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RateCard({ label, value, description, color }: { label: string; value: number; description: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{value}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}
