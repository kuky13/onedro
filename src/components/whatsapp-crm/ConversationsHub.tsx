import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { WhatsAppAtendimento } from './WhatsAppAtendimento';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Bot, Search, UserCheck, MessageCircle, Clock, ChevronRight, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FilterType = 'all' | 'ai_active' | 'awaiting_human' | 'closed';

interface Conversation {
  id: string;
  phone_number: string;
  status: string;
  ai_paused: boolean | null;
  ai_paused_at: string | null;
  ai_paused_by: string | null;
  assigned_to: string | null;
  last_message_at: string | null;
  created_at: string;
}

export function ConversationsHub() {
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [showChat, setShowChat] = useState(false);

  const ownerId = user?.id ?? null;

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['whatsapp-conversations-hub', ownerId],
    enabled: Boolean(ownerId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, phone_number, status, ai_paused, ai_paused_at, ai_paused_by, assigned_to, last_message_at, created_at')
        .eq('owner_id', ownerId as string)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const resumeAiMutation = useMutation({
    mutationFn: async (phone: string) => {
      const { error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'resume_ai', payload: { phone } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({ title: 'IA reativada' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations-hub'] });
    },
  });

  const filtered = conversations.filter((c) => {
    if (filter === 'ai_active' && c.ai_paused) return false;
    if (filter === 'awaiting_human' && !c.ai_paused) return false;
    if (filter === 'closed' && c.status !== 'closed') return false;
    if (filter !== 'closed' && c.status === 'closed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!c.phone_number.includes(q)) return false;
    }
    return true;
  });

  const awaitingCount = conversations.filter((c) => c.ai_paused && c.status !== 'closed').length;

  if (showChat) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setShowChat(false)} className="gap-2">
          <ChevronRight className="h-4 w-4 rotate-180" />
          Voltar para lista
        </Button>
        <WhatsAppAtendimento />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Total</span>
          <span className="text-2xl font-bold">{conversations.filter(c => c.status !== 'closed').length}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> IA ativa</span>
          <span className="text-2xl font-bold text-green-500">{conversations.filter(c => !c.ai_paused && c.status !== 'closed').length}</span>
        </div>
        <div className={cn("rounded-lg border bg-card p-3 flex flex-col gap-1", awaitingCount > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border")}>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Aguardando humano</span>
          <span className={cn("text-2xl font-bold", awaitingCount > 0 ? "text-amber-500" : "")}>{awaitingCount}</span>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'all', label: 'Todas' },
            { key: 'ai_active', label: 'IA ativa' },
            { key: 'awaiting_human', label: 'Aguardando' },
            { key: 'closed', label: 'Fechadas' },
          ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
              className="text-xs h-8"
            >
              {label}
              {key === 'awaiting_human' && awaitingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 text-[9px] px-1">{awaitingCount}</Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations list */}
      <div className="rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Carregando conversas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <span>Nenhuma conversa encontrada</span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      +{c.phone_number.replace(/\D/g, '')}
                    </span>
                    {c.ai_paused ? (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500 bg-amber-500/5 shrink-0">
                        <UserCheck className="h-2.5 w-2.5 mr-1" /> Humano
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-500 bg-green-500/5 shrink-0">
                        <Bot className="h-2.5 w-2.5 mr-1" /> IA
                      </Badge>
                    )}
                  </div>
                  {c.ai_paused && c.ai_paused_at && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      Pausado {formatDistanceToNow(new Date(c.ai_paused_at), { addSuffix: true, locale: ptBR })}
                      {c.ai_paused_by === 'ai' ? ' pela IA' : ''}
                    </p>
                  )}
                  {c.last_message_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Última mensagem {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {c.ai_paused && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-green-600 hover:text-green-600 hover:bg-green-500/10"
                      onClick={() => resumeAiMutation.mutate(c.phone_number)}
                      disabled={resumeAiMutation.isPending}
                      title="Reativar IA"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reativar IA
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open full chat button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowChat(true)} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Abrir Atendimento
        </Button>
      </div>
    </div>
  );
}
