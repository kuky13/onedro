import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Eye, EyeOff, Loader2, QrCode, Trash2, Unplug, XCircle } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppConnectionStatus } from '@/hooks/useWhatsAppConnectionStatus';
import { useToast } from '@/hooks/useToast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ConfirmAction = 'logout' | 'delete';

type QrState = 'idle' | 'generating' | 'qr_ready' | 'expired';

const QR_TTL_MS = 60_000;

export function WhatsAppConnector() {
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const [evoUrl, setEvoUrl] = useState('');
  const [evoKey, setEvoKey] = useState('');
  const [showEvoKey, setShowEvoKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || cancelled) return;

      const { data } = await supabase
        .from('user_evolution_config')
        .select('api_url, api_key')
        .eq('owner_id', userId)
        .maybeSingle();

      if (cancelled) return;
      setEvoUrl(data?.api_url ?? '');
      setEvoKey(data?.api_key ?? '');
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveEvolutionConfig = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Você precisa estar logado.');
      if (!evoUrl.trim() || !evoKey.trim()) throw new Error('Preencha a URL e a chave da Evolution.');

      const url = evoUrl.trim().replace(/\/$/, '');
      const { error } = await supabase.from('user_evolution_config').upsert(
        {
          owner_id: userId,
          api_url: url,
          api_key: evoKey.trim(),
        } as any,
        { onConflict: 'owner_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess({ title: 'Salvo', description: 'Configuração da Evolution atualizada.' });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
    },
    onError: (err: any) => {
      showError({ title: 'Erro ao salvar', description: err.message });
    },
  });

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrImageSrc, setQrImageSrc] = useState<string | null>(null);
  const [qrState, setQrState] = useState<QrState>('idle');
  const [qrExpiresAt, setQrExpiresAt] = useState<number | null>(null);
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    const isLikelyBase64Png = (value: string) => {
      // base64 puro costuma ser grande e só conter chars base64 (sem vírgula/@)
      if (value.length < 200) return false;
      return /^[A-Za-z0-9+/=]+$/.test(value);
    };

    const run = async () => {
      if (!qrCode) {
        setQrImageSrc(null);
        return;
      }

      if (qrCode.startsWith('data:image')) {
        setQrImageSrc(qrCode);
        return;
      }

      if (isLikelyBase64Png(qrCode)) {
        setQrImageSrc(`data:image/png;base64,${qrCode}`);
        return;
      }

      // Quando a Evolution retorna o "QR string" do WhatsApp (não é imagem), geramos o PNG aqui
      try {
        const dataUrl = await QRCode.toDataURL(qrCode, { margin: 1, width: 280 });
        if (!cancelled) setQrImageSrc(dataUrl);
      } catch {
        if (!cancelled) setQrImageSrc(null);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [qrCode]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>('logout');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const confirmMeta = useMemo(() => {
    if (confirmAction === 'delete') {
      return {
        title: 'Apagar instância',
        description:
          'Isso vai apagar a instância na Evolution e remover a configuração no OneDrip. Você precisará conectar novamente depois.',
        buttonLabel: 'Apagar instância',
      };
    }

    return {
      title: 'Desconectar WhatsApp',
      description: 'Isso vai deslogar sua instância na Evolution para que um novo QR Code possa ser gerado.',
      buttonLabel: 'Desconectar',
    };
  }, [confirmAction]);

  const { data: connectionStatus, isLoading } = useWhatsAppConnectionStatus({
    // Keep a small polling fallback while the QR is visible (in case Realtime isn't delivering).
    pollMs: qrCode ? 3000 : false,
  });

  const connected = !!connectionStatus?.connected;

  useEffect(() => {
    if (!qrCode || !qrExpiresAt) return;

    const tick = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(tick);
    };
  }, [qrCode, qrExpiresAt]);

  useEffect(() => {
    if (!qrCode || !qrExpiresAt) return;
    if (nowTs < qrExpiresAt) return;

    setQrState('expired');
    setQrCode(null);
    setQrExpiresAt(null);
  }, [nowTs, qrCode, qrExpiresAt]);

  useEffect(() => {
    if (!connected) return;
    // If user connects successfully, stop showing QR UI.
    setQrCode(null);
    setQrExpiresAt(null);
    setQrState('idle');
  }, [connected]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const timeoutMs = 20000;

      const invokePromise = supabase.functions.invoke('whatsapp-qr-connect', {
        body: {},
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        const id = setTimeout(() => {
          clearTimeout(id);
          reject(new Error('Tempo esgotado ao gerar QR Code. Tente novamente.'));
        }, timeoutMs);
      });

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Erro desconhecido');

      return data;
    },
    onMutate: () => {
      setQrState('generating');
      setQrCode(null);
      setQrExpiresAt(null);
    },
    onSuccess: (data) => {
      if (data.already_connected) {
        showSuccess({ title: 'WhatsApp conectado', description: 'Sua instância já está ativa.' });
        setQrCode(null);
        setQrExpiresAt(null);
        setQrState('idle');
      } else if (data.qr_code) {
        setQrCode(data.qr_code);
        setQrExpiresAt(Date.now() + QR_TTL_MS);
        setQrState('qr_ready');
        showSuccess({
          title: 'QR Code gerado',
          description: 'Escaneie o código abaixo com seu WhatsApp.',
        });
      } else {
        setQrState('idle');
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
    },
    onError: (err: any) => {
      setQrState('idle');
      showError({ title: 'Erro ao conectar', description: err.message });
    },
  });

  const manageMutation = useMutation({
    mutationFn: async (payload: { action: ConfirmAction; password: string }) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance-manage', {
        body: payload,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Erro desconhecido');
      return data;
    },
    onSuccess: (data) => {
      setConfirmOpen(false);
      setConfirmPassword('');
      setShowPassword(false);
      setQrCode(null);
      setQrExpiresAt(null);
      setQrState('idle');

      if (data.action === 'delete') {
        showSuccess({ title: 'Instância apagada', description: 'Configuração removida. Conecte novamente para usar.' });
      } else {
        showSuccess({ title: 'Desconectado', description: 'Instância deslogada. Gere um novo QR Code para conectar.' });
      }

      queryClient.invalidateQueries({ queryKey: ['whatsapp-connection-status'] });
    },
    onError: (err: any) => {
      showError({ title: 'Não foi possível concluir', description: err.message });
    },
  });

  const openConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
    setConfirmPassword('');
    setShowPassword(false);
    setConfirmOpen(true);
  };

  const secondsLeft = qrExpiresAt ? Math.max(0, Math.ceil((qrExpiresAt - nowTs) / 1000)) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Conectar WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Configuração da Evolution</p>
              <p className="text-xs text-muted-foreground">
                Cada usuário usa sua própria URL + chave da Evolution (a Drippy envia por essa VPS).
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="evo-url">Evolution API URL</Label>
              <Input
                id="evo-url"
                value={evoUrl}
                onChange={(e) => setEvoUrl(e.target.value)}
                placeholder="https://sua-vps.com"
                autoComplete="off"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="evo-key">Chave da Evolution</Label>
              <div className="relative">
                <Input
                  id="evo-key"
                  type={showEvoKey ? 'text' : 'password'}
                  value={evoKey}
                  onChange={(e) => setEvoKey(e.target.value)}
                  placeholder="cole sua apikey"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowEvoKey((v) => !v)}
                  aria-label={showEvoKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showEvoKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => saveEvolutionConfig.mutate()}
              disabled={saveEvolutionConfig.isPending}
            >
              {saveEvolutionConfig.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar configuração'
              )}
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando status...
            </p>
          ) : connected ? (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="h-5 w-5" />
              <span>
                WhatsApp conectado ({connectionStatus?.instance_id})
                {connectionStatus?.connected_phone && (
                  <span className="ml-1 text-muted-foreground">
                    — 📱 {connectionStatus.connected_phone}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-5 w-5" />
              <span>WhatsApp não conectado</span>
            </div>
          )}

          {!connected ? (
            <div className="space-y-2">
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || qrState === 'generating'}
                className="w-full"
              >
                {connectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Conectar meu WhatsApp
                  </>
                )}
              </Button>

              {qrState === 'expired' && (
                <p className="text-xs text-muted-foreground">
                  QR Code expirou. Clique em “Conectar meu WhatsApp” para gerar um novo.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => openConfirm('logout')}
                disabled={manageMutation.isPending}
              >
                <Unplug className="mr-2 h-4 w-4" />
                Desconectar
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => openConfirm('delete')}
                disabled={manageMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar instância
              </Button>
            </div>
          )}

          {qrImageSrc && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra o WhatsApp → Mais Opções → Aparelhos conectados → Conectar um aparelho
              </p>
              <div className="flex justify-center bg-background p-4 rounded-lg border">
                <img src={qrImageSrc} alt="QR Code WhatsApp" className="max-w-[280px]" loading="lazy" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>Aguardando conexão… (atualizando automaticamente)</span>
                <span>Expira em {secondsLeft}s</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmMeta.title}</DialogTitle>
            <DialogDescription>{confirmMeta.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirme sua senha</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Confirmação necessária para evitar ações acidentais.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)} disabled={manageMutation.isPending}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant={confirmAction === 'delete' ? 'destructive' : 'default'}
              disabled={manageMutation.isPending || !confirmPassword.trim()}
              onClick={() => manageMutation.mutate({ action: confirmAction, password: confirmPassword })}
            >
              {manageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                confirmMeta.buttonLabel
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

