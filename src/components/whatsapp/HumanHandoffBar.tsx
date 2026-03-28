
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Bot, UserRound, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HumanHandoffBarProps {
  /** The phone number (digits only, no @) of the active chat */
  phone: string;
}

export function HumanHandoffBar({ phone }: HumanHandoffBarProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversation to get ai_paused status
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation-handoff', user?.id, phone],
    queryFn: async () => {
      if (!user?.id || !phone) return null;
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('id, ai_paused, ai_paused_at, ai_paused_by, assigned_to')
        .eq('owner_id', user.id)
        .eq('phone_number', phone)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!phone,
    refetchInterval: 10000,
  });

  const toggleHandoff = useMutation({
    mutationFn: async (pause: boolean) => {
      if (!conversation?.id || !user?.id) throw new Error('Conversa não encontrada');
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({
          ai_paused: pause,
          ai_paused_at: pause ? new Date().toISOString() : null,
          ai_paused_by: pause ? user.id : null,
          assigned_to: pause ? user.id : null,
        } as any)
        .eq('id', conversation.id);
      if (error) throw error;
    },
    onSuccess: (_, pause) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-handoff'] });
      showSuccess({
        title: pause ? 'Atendimento humano ativado' : 'IA reativada',
        description: pause
          ? 'A IA não responderá mais nesta conversa. Você pode responder manualmente.'
          : 'A Drippy voltou a responder automaticamente nesta conversa.',
      });
    },
    onError: (err: any) => showError({ title: 'Erro', description: err.message }),
  });

  if (isLoading || !conversation) return null;

  const isPaused = conversation.ai_paused;

  const pausedAt = conversation?.ai_paused_at
    ? formatDistanceToNow(new Date(conversation.ai_paused_at), { addSuffix: true, locale: ptBR })
    : null;
  const pausedBySystem = isPaused && conversation?.ai_paused_by == null;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-1.5 text-xs border-b transition-colors',
        isPaused
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse'
          : 'bg-primary/5 border-primary/10 text-primary'
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {isPaused ? (
          <>
            <UserRound className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium shrink-0">
              {pausedBySystem ? 'IA transferiu' : 'Atendimento humano'}
            </span>
            {pausedAt && (
              <span className="flex items-center gap-0.5 text-muted-foreground truncate">
                <Clock className="h-3 w-3 shrink-0" />
                {pausedAt}
              </span>
            )}
          </>
        ) : (
          <>
            <Bot className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">IA Drippy ativa</span>
          </>
        )}
      </div>
      <Button
        variant={isPaused ? 'default' : 'outline'}
        size="sm"
        className="h-6 text-[11px] px-2"
        disabled={toggleHandoff.isPending}
        onClick={() => toggleHandoff.mutate(!isPaused)}
      >
        {toggleHandoff.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isPaused ? (
          <>
            <Bot className="h-3 w-3 mr-1" /> Reativar IA
          </>
        ) : (
          <>
            <UserRound className="h-3 w-3 mr-1" /> Assumir conversa
          </>
        )}
      </Button>
    </div>
  );
}
