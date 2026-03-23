import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';

interface UnifiedLogRow {
  id: string;
  source: 'webhook_events' | 'zapi_logs';
  event_type: string | null;
  phone_number: string | null;
  status: string;
  received_at: string;
  error_message: string | null;
  raw_message: string | null;
}

export function WebhookEventsViewer() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'webhook_events' | 'zapi_logs'>('all');
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['whatsapp-crm', 'events-unified'],
    queryFn: async () => {
      // Fetch from both tables in parallel
      const [webhookResult, zapiResult] = await Promise.all([
        supabase
          .from('whatsapp_webhook_events')
          .select('id, source, event_type, phone_number, status, received_at, processed_at, error_message')
          .order('received_at', { ascending: false })
          .limit(100),
        supabase
          .from('whatsapp_zapi_logs')
          .select('id, from_phone, status, created_at, error_message, raw_message, chat_id, is_group')
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      const webhookRows: UnifiedLogRow[] = (webhookResult.data ?? []).map((e) => ({
        id: e.id,
        source: 'webhook_events' as const,
        event_type: e.event_type,
        phone_number: e.phone_number,
        status: e.status,
        received_at: e.received_at,
        error_message: e.error_message,
        raw_message: null,
      }));

      const zapiRows: UnifiedLogRow[] = (zapiResult.data ?? []).map((e) => ({
        id: e.id,
        source: 'zapi_logs' as const,
        event_type: e.is_group ? 'group_message' : 'private_message',
        phone_number: e.from_phone ?? e.chat_id,
        status: e.status,
        received_at: e.created_at,
        error_message: e.error_message,
        raw_message: e.raw_message,
      }));

      // Merge and sort by date descending
      return [...webhookRows, ...zapiRows]
        .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
        .slice(0, 200);
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('whatsapp-admin-cleanup', {
        body: {},
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Erro desconhecido');
      return data as {
        ok: true;
        deleted: Record<string, number>;
      };
    },
    onSuccess: (data) => {
      setCleanupOpen(false);
      setConfirmText('');
      showSuccess({
        title: 'Limpeza concluída',
        description: `Eventos: ${data.deleted.whatsapp_webhook_events} • Mensagens: ${data.deleted.whatsapp_messages} • Conversas: ${data.deleted.whatsapp_conversations} • Conexões: ${data.deleted.whatsapp_settings}`,
      });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'events-unified'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'conversations'] });
    },
    onError: (err: Error) => {
      showError({ title: 'Erro ao limpar', description: err.message });
    },
  });

  const filtered = useMemo(() => {
    let result = events;

    // Filter by source
    if (sourceFilter !== 'all') {
      result = result.filter((e) => e.source === sourceFilter);
    }

    // Filter by search text
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) =>
        String(e.phone_number ?? '').toLowerCase().includes(q) ||
        String(e.event_type ?? '').toLowerCase().includes(q) ||
        String(e.status ?? '').toLowerCase().includes(q) ||
        String(e.raw_message ?? '').toLowerCase().includes(q) ||
        String(e.error_message ?? '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [events, search, sourceFilter]);

  const canConfirm = confirmText.trim().toUpperCase() === 'LIMPAR TUDO';

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      processed: 'default',
      budget_created: 'default',
      reply_sent: 'default',
      processing: 'secondary',
      received_raw: 'secondary',
      pending: 'outline',
      ignored_not_budget: 'outline',
      ignored_no_text: 'outline',
      unsupported_type: 'outline',
      error: 'destructive',
      failed: 'destructive',
    };
    return variants[status] ?? 'outline';
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Auditoria (Eventos)</CardTitle>

            {isAdmin && (
              <Button type="button" variant="destructive" onClick={() => setCleanupOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpeza global
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Buscar por telefone / evento / status / mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="zapi_logs">IA / Orçamentos</SelectItem>
                <SelectItem value="webhook_events">Webhook Events</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quando</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={`${e.source}-${e.id}`}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(e.received_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.source === 'zapi_logs' ? 'default' : 'secondary'} className="text-[10px]">
                          {e.source === 'zapi_logs' ? 'IA' : 'Webhook'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{e.event_type ?? '-'}</TableCell>
                      <TableCell className="font-medium text-xs">{e.phone_number ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(e.status)} className="text-[10px]">
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-destructive text-xs max-w-[200px] truncate">
                        {e.error_message ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpeza global do WhatsApp</DialogTitle>
            <DialogDescription>
              Isso vai apagar para <strong>todos os usuários</strong>: eventos de auditoria, conversas/mensagens e as conexões
              (instâncias) salvas no Supabase. Não tem como desfazer.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="confirm-text">Digite <strong>LIMPAR TUDO</strong> para confirmar</Label>
            <Input id="confirm-text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCleanupOpen(false)} disabled={cleanupMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canConfirm || cleanupMutation.isPending}
              onClick={() => cleanupMutation.mutate()}
            >
              {cleanupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                'Confirmar limpeza'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
