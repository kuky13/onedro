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

      if (settings?.id) {
        const { error } = await supabase
          .from('whatsapp_settings')
          .update(payload)
          .eq('id', settings.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('whatsapp_settings').insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      showSuccess({ title: 'Configurações salvas', description: 'Módulo atualizado com sucesso.' });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-crm', 'settings'] });
    },
    onError: (err: any) => showError({ title: 'Erro ao salvar', description: err.message }),
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
              <Input
                id="evo-instance"
                placeholder="instance-01"
                value={evolutionInstanceId}
                onChange={(e) => setEvolutionInstanceId(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="webhook-secret">Webhook Secret (opcional)</Label>
              <Input
                id="webhook-secret"
                placeholder="opcional (não usado no auto-responder)"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Typebot foi removido. A IA responde automaticamente via DeepSeek.
              </p>
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
                Salvar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
