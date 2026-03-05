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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2 } from 'lucide-react';

interface WebhookEventRow {
  id: string;
  source: string;
  event_type: string | null;
  phone_number: string | null;
  status: string;
  received_at: string;
  processed_at: string | null;
  error_message: string | null;
}

export function WebhookEventsViewer() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['whatsapp-crm', 'events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_webhook_events')
        .select('id, source, event_type, phone_number, status, received_at, processed_at, error_message')
        .order('received_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as WebhookEventRow[];
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
      queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'conversations'] });
    },
    onError: (err: any) => {
      showError({ title: 'Erro ao limpar', description: err.message });
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      String(e.phone_number ?? '').toLowerCase().includes(q) ||
      String(e.event_type ?? '').toLowerCase().includes(q) ||
      String(e.source ?? '').toLowerCase().includes(q)
    );
  }, [events, search]);

  const canConfirm = confirmText.trim().toUpperCase() === 'LIMPAR TUDO';

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

          <Input
            placeholder="Buscar por telefone / evento / source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                    <TableHead>Source</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(e.received_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{e.source}</TableCell>
                      <TableCell className="text-muted-foreground">{e.event_type ?? '-'}</TableCell>
                      <TableCell className="font-medium">{e.phone_number ?? '-'}</TableCell>
                      <TableCell>{e.status}</TableCell>
                      <TableCell className="text-destructive">{e.error_message ?? ''}</TableCell>
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

