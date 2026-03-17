import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle, Trash2, ExternalLink, Calendar, Copy, Check, Clock, Smartphone, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeviceTestReportDialog } from '@/components/device-test/DeviceTestReportDialog';
import { LocalDeviceTestReportDialog } from '@/components/device-test/LocalDeviceTestReportDialog';
import { checklistToTestResults } from '@/utils/checklistToTestResults';

interface QuickTest {
  id: string;
  name: string;
  url: string;
  token: string;
  created_at: string;
  expires_at: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
}

const initialData: DeviceChecklistData = {
  tela: { touch_screen: false, multi_touch: false, cores_pixels: false, display_integro: false, sem_manchas: false, brilho: false, rotacao_tela: false },
  audio: { alto_falante: false, microfone: false, alto_falante_auricular: false, entrada_fone: false, gravacao_audio: false },
  cameras: { camera_frontal: false, camera_traseira: false, flash: false, foco_automatico: false, gravacao_video: false },
  sensores: { vibracao: false, botao_volume_mais: false, botao_volume_menos: false, botao_power: false, acelerometro: false, giroscopio: false, proximidade: false, bussola: false, luz_ambiente: false, gps: false },
  sistema: { bateria: false, carregamento: false, wifi: false, bluetooth: false, armazenamento: false },
  extras: { face_id: false, biometria: false, nfc: false, chip_sim: false, tampa_traseira_ok: false }
};

const statusConfig = {
  completed:  { label: 'Concluído',     color: 'text-[#3ECF50]', dot: 'bg-[#3ECF50]' },
  in_progress:{ label: 'Em andamento',  color: 'text-primary',   dot: 'bg-primary'   },
  expired:    { label: 'Expirado',      color: 'text-destructive',dot: 'bg-destructive'},
  pending:    { label: 'Aguardando',    color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
};

const TesteRapidoPage = () => {
  const [checklist, setChecklist] = useState<DeviceChecklistData>({ ...initialData });
  const [quickTests, setQuickTests] = useState<QuickTest[]>([]);
  const [_isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<{ token: string; url: string } | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSessionId, setReportSessionId] = useState<string | null>(null);
  const completedToastRef = useRef<Set<string>>(new Set());
  const [localReportOpen, setLocalReportOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchQuickTests();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchQuickTests();
    }, 7000);
    return () => window.clearInterval(id);
  }, []);

  const fetchQuickTests = async () => {
    try {
      setIsLoading(true);
      const { data: fetchedTests, error } = await supabase
        .from('device_test_sessions')
        .select('id, share_token, created_at, expires_at, device_info, status')
        .filter('device_info->>source', 'eq', 'quick_test')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      const mapped: QuickTest[] = (fetchedTests || []).map((t: any) => ({
        id: t.id,
        name: t.device_info?.name || t.share_token,
        token: t.share_token,
        url: `${window.location.origin}/testar/${t.share_token}`,
        created_at: t.created_at,
        expires_at: t.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: (t.status || 'pending') as QuickTest['status'],
      }));

      for (const t of mapped) {
        if (t.status === 'completed' && !completedToastRef.current.has(t.id)) {
          completedToastRef.current.add(t.id);
          toast.success(`Relatório disponível: ${t.name}`);
        }
      }
      setQuickTests(mapped);
    } catch (error) {
      console.error('Error fetching quick tests:', error);
      toast.error('Erro ao carregar testes salvos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTest = async () => {
    if (!newTestName.trim()) {
      toast.error('Por favor, digite um nome para o teste');
      return;
    }

    setIsCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        toast.error('Você precisa estar logado para criar testes.');
        return;
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12_000);

      const { data, error } = await supabase.rpc('create_quick_test_session', {
        p_name: newTestName,
        p_expires_days: 7
      }, { signal: controller.signal } as any);

      window.clearTimeout(timeoutId);

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const token = row?.share_token;
      if (!token) throw new Error('Não foi possível gerar um código válido');

      const url = `${window.location.origin}/testar/${token}`;
      setCreatedTest({ token, url });

      toast.success('Teste rápido criado com sucesso!');
      fetchQuickTests();
    } catch (error) {
      console.error('Error creating test:', error);
      const message =
        (error as any)?.name === 'AbortError'
          ? 'Demorou demais para gerar. Tente novamente.'
          : (error as any)?.message || 'Erro ao criar teste. Tente novamente.';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('device_test_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Teste removido');
      setQuickTests((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Erro ao remover teste');
    }
  };

  const handleOpenReport = async (sessionId: string, status: QuickTest['status']) => {
    if (status !== 'completed') {
      toast.info('O relatório ficará disponível quando o teste for concluído.');
      return;
    }
    setReportSessionId(sessionId);
    setReportOpen(true);
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pb-24 space-y-6">

        {/* Header */}
        <div className="pt-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight">Teste Rápido</h1>
              <p className="text-xs text-muted-foreground truncate">Gere links para testar dispositivos remotamente</p>
            </div>
          </div>

          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setCreatedTest(null);
                setNewTestName('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto shrink-0 gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Link</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Gerar Novo Link de Teste</DialogTitle>
                <DialogDescription>
                  Crie um link compartilhável para realizar testes remotos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {!createdTest && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="test-name">Nome do Teste</Label>
                      <Input
                        id="test-name"
                        placeholder="Ex: iPhone 11 - Cliente João"
                        value={newTestName}
                        onChange={(e) => setNewTestName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTest()}
                      />
                    </div>

                    <div className="rounded-xl bg-muted/40 border border-border/40 p-4 space-y-3 text-sm text-muted-foreground">
                      <div className="flex gap-2.5 items-start">
                        <Clock className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                        <span>Este link expira automaticamente em <strong className="text-foreground">7 dias</strong>.</span>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                        <span>Limite de 5 testes ativos. Ao criar o 6º, o mais antigo é substituído.</span>
                      </div>
                    </div>
                  </>
                )}

                {createdTest && (
                  <div className="space-y-4">
                    <div className="text-center space-y-1">
                      <p className="text-sm text-muted-foreground">Código do link</p>
                      <div className="flex justify-center gap-2 mt-2">
                        {createdTest.token.split('').slice(0, 4).map((d, idx) => (
                          <div
                            key={`${d}-${idx}`}
                            className="h-14 w-14 rounded-xl border border-border bg-surface flex items-center justify-center font-mono text-2xl font-bold text-primary"
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/30 border border-border/40 p-3">
                      <code className="text-[11px] text-muted-foreground break-all select-all">
                        {createdTest.url}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(createdTest.token);
                          toast.success('Código copiado!');
                        }}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar código
                      </Button>
                      <Button
                        onClick={() => window.open(createdTest.url, '_blank', 'noopener,noreferrer')}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                {createdTest ? (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setCreatedTest(null);
                      setNewTestName('');
                    }}
                  >
                    Fechar
                  </Button>
                ) : (
                  <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={handleCreateTest} disabled={isCreating}>
                      {isCreating ? 'Criando...' : 'Gerar Link'}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Testes Ativos */}
        {quickTests.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Links Ativos</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {quickTests.length}/5
              </span>
            </div>

            <div className="grid gap-3">
              {quickTests.map((test) => {
                const st = statusConfig[test.status];
                return (
                  <div
                    key={test.id}
                    className="bg-surface border border-border rounded-xl p-4 space-y-3"
                  >
                    {/* Top row: name + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="font-medium text-foreground truncate">{test.name}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                        </div>
                      </div>
                      {/* Token badges */}
                      <div className="flex gap-1 shrink-0">
                        {test.token.split('').slice(0, 4).map((d, idx) => (
                          <div
                            key={`${test.id}-${d}-${idx}`}
                            className="h-7 w-7 rounded-lg border border-border/60 bg-background flex items-center justify-center font-mono text-sm font-semibold text-foreground"
                          >
                            {d}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* URL */}
                    <a
                      href={test.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate w-full"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{test.url}</span>
                    </a>

                    {/* Expiry */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Expira em {format(new Date(test.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant={test.status === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 h-9 text-xs"
                        onClick={() => handleOpenReport(test.id, test.status)}
                      >
                        Ver Relatório
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => copyToClipboard(test.url, test.id)}
                        title="Copiar link"
                      >
                        {copiedId === test.id
                          ? <Check className="h-4 w-4 text-[#3ECF50]" />
                          : <Copy className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTest(test.id)}
                        title="Remover teste"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state quando sem testes */}
        {quickTests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted/40 border border-border/40">
              <LinkIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Nenhum link criado ainda</p>
              <p className="text-xs text-muted-foreground">Clique em "Novo" para gerar um link de teste para seu cliente.</p>
            </div>
          </div>
        )}

        {/* Checklist */}
        <DeviceChecklist value={checklist} onChange={setChecklist} />

        <Button className="w-full h-11" onClick={() => setLocalReportOpen(true)}>
          Baixar Relatório do Checklist
        </Button>
      </div>

      {/* Dialogs */}
      <DeviceTestReportDialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) setReportSessionId(null);
        }}
        sessionId={reportSessionId}
        title="Relatório do Teste Rápido"
      />

      <LocalDeviceTestReportDialog
        open={localReportOpen}
        onOpenChange={setLocalReportOpen}
        results={checklistToTestResults(checklist)}
        title="Relatório do Checklist Manual"
      />
    </div>
  );
};

export default TesteRapidoPage;
