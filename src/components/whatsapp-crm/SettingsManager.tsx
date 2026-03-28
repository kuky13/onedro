import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, XCircle, Wifi } from 'lucide-react';

interface SettingsRow {
  id: string;
  owner_id: string;
  evolution_api_url: string | null;
  evolution_instance_id: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function SettingsManager() {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const ownerId = user?.id ?? null;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['whatsapp-crm', 'settings', ownerId],
    enabled: Boolean(ownerId),
    queryFn: async () => {
      const owner = ownerId as string;
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('owner_id', owner)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return (data ?? null) as SettingsRow | null;
    },
  });

  const [evolutionApiUrl, setEvolutionApiUrl] = useState('');
  const [evolutionInstanceId, setEvolutionInstanceId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [testResult, setTestResult] = useState<'ok' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (!settings) return;
    setEvolutionApiUrl(settings.evolution_api_url ?? '');
    setEvolutionInstanceId(settings.evolution_instance_id ?? '');
    setWebhookSecret(settings.webhook_secret ?? '');
    setIsActive(settings.is_active);
  }, [settings?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!ownerId) throw new Error('Usuário não autenticado');

      const payload = {
        owner_id: ownerId,
        evolution_api_url: evolutionApiUrl.trim() || null,
        evolution_instance_id: evolutionInstanceId.trim() || null,
        webhook_secret: webhookSecret.trim() || null,
        is_active: isActive,
      };

      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert(payload, { onConflict: 'owner_id' });
      if (error) throw error;
    },
    onSuccess: async () => {
      showSuccess({ title: 'Configurações salvas', description: 'Módulo atualizado com sucesso.' });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'settings'] });
    },
    onError: (err: any) => showError({ title: 'Erro ao salvar', description: err.message }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      setTestResult(null);
      setTestMessage('');

      const instanceName = evolutionInstanceId.trim();
      if (!instanceName) throw new Error('Preencha o Instance ID antes de testar');

      const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
        body: { action: 'diagnose_instance', payload: { instanceName } },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data: any) => {
      const connected = data?.connected === true || data?.status === 'open' || data?.state === 'open';
      setTestResult(connected ? 'ok' : 'error');
      setTestMessage(
        connected
          ? `Conectado${data?.phone ? ` · ${data.phone}` : ''}`
          : data?.message || data?.status || 'Instância não está conectada'
      );
    },
    onError: (err: any) => {
      setTestResult('error');
      setTestMessage(err.message || 'Falha ao testar conexão');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="evo-url">Evolution API URL</Label>
              <Input
                id="evo-url"
                placeholder="https://sua-evolution.exemplo"
                value={evolutionApiUrl}
                onChange={(e) => setEvolutionApiUrl(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="evo-instance">Evolution Instance ID</Label>
              <div className="flex gap-2">
                <Input
                  id="evo-instance"
                  placeholder="instance-01"
                  value={evolutionInstanceId}
                  onChange={(e) => {
                    setEvolutionInstanceId(e.target.value);
                    setTestResult(null);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !evolutionInstanceId.trim()}
                  className="shrink-0"
                  title="Testar conexão com a instância"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Testar</span>
                </Button>
              </div>
              {testResult && (
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${testResult === 'ok' ? 'bg-green-500/10 text-green-600' : 'bg-destructive/10 text-destructive'}`}>
                  {testResult === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  {testMessage}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-secret">Webhook Secret <Badge variant="outline" className="ml-1 text-[10px]">opcional</Badge></Label>
              <Input
                id="webhook-secret"
                placeholder="Não utilizado no auto-responder"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium text-foreground">Módulo ativo</div>
                <div className="text-xs text-muted-foreground">Desative para pausar integrações e telas.</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
