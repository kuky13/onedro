import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle, Trash2, ExternalLink, Calendar, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeviceChecklist, DeviceChecklistData } from '@/components/service-orders/DeviceChecklist';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
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

const TesteRapidoPage = () => {
  const [checklist, setChecklist] = useState<DeviceChecklistData>({ ...initialData });
  const [quickTests, setQuickTests] = useState<QuickTest[]>([]);
  const [_isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [createdTest, setCreatedTest] = useState<{token: string;url: string;} | null>(null);
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
      const { data: fetchedTests, error } = await supabase.
      from('device_test_sessions').
      select('id, share_token, created_at, expires_at, device_info, status').
      filter('device_info->>source', 'eq', 'quick_test').
      order('created_at', { ascending: false }).
      limit(5);

      if (error) throw error;
      const mapped: QuickTest[] = (fetchedTests || []).map((t: any) => ({
        id: t.id,
        name: t.device_info?.name || t.share_token,
        token: t.share_token,
        url: `${window.location.origin}/testar/${t.share_token}`,
        created_at: t.created_at,
        expires_at: t.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: (t.status || 'pending') as QuickTest['status']
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
      }, {
        signal: controller.signal
      } as any);

      window.clearTimeout(timeoutId);

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      const token = row?.share_token;
      if (!token) throw new Error('Não foi possível gerar um código válido');

      const url = `${window.location.origin}/testar/${token}`;
      setCreatedTest({ token, url });

      toast.success('Teste rápido criado com sucesso!');
      fetchQuickTests(); // Refresh list
    } catch (error) {
      console.error('Error creating test:', error);
      const message = (error as any)?.name === 'AbortError' ?
      'Demorou demais para gerar. Tente novamente.' :
      (error as any)?.message || 'Erro ao criar teste. Tente novamente.';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTest = async (id: string) => {
    try {
      const { error } = await supabase.
      from('device_test_sessions').
      delete().
      eq('id', id);

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
    <div className="p-4 space-y-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Teste Rápido</h1>
        </div>
        
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setCreatedTest(null);
            }
          }}>
          
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Link de Teste</DialogTitle>
              <DialogDescription>
                Crie um link compartilhável para realizar testes remotos.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {!createdTest &&
              <>
                  <div className="space-y-2">
                    <Label htmlFor="test-name">Nome do Teste</Label>
                    <Input
                    id="test-name"
                    placeholder="Ex: iPhone 11 - Cliente João"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)} />
                  
                  </div>

                  <div className="rounded-md bg-muted p-4 space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-2">
                      <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                      <span>Este link expira automaticamente em <strong>7 dias</strong>.</span>
                    </div>
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-500 shrink-0" />
                      <span>Limite de 5 testes ativos. Ao criar o 6º, o mais antigo será substituído.</span>
                    </div>
                  </div>
                </>
              }

              {createdTest &&
              <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Código do link</div>
                  <div className="grid grid-cols-4 gap-2">
                    {createdTest.token.
                  split('').
                  slice(0, 4).
                  map((d, idx) =>
                  <div
                    key={`${d}-${idx}`}
                    className="h-12 rounded-lg border border-border/50 bg-background/60 flex items-center justify-center font-mono text-2xl text-foreground">
                    
                          {d}
                        </div>
                  )}
                  </div>

                  <div className="rounded-md bg-muted/40 border border-border/40 p-2">
                    <code className="text-[10px] text-muted-foreground break-all select-all line-clamp-2">
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
                    className="gap-2">
                    
                      <Copy className="h-4 w-4" />
                      Copiar código
                    </Button>
                    <Button
                    onClick={() => window.open(createdTest.url, '_blank', 'noopener,noreferrer')}
                    className="gap-2">
                    
                      <ExternalLink className="h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                </div>
              }
            </div>

            <DialogFooter>
              {createdTest ?
              <Button
                onClick={() => {
                  setIsDialogOpen(false);
                  setCreatedTest(null);
                  setNewTestName('');
                }}>
                
                  Fechar
                </Button> :

              <>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateTest} disabled={isCreating}>
                    {isCreating ? 'Criando...' : 'Gerar Link'}
                  </Button>
                </>
              }
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Testes Ativos */}
      {quickTests.length > 0 &&
      <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Links Ativos 
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {quickTests.length}/5
            </span>
          </h2>
          
          <div className="grid gap-3">
            {quickTests.map((test) =>
          <Card key={test.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-medium truncate">{test.name}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                      className={
                      test.status === 'completed' ?
                      'text-green-500' :
                      test.status === 'in_progress' ?
                      'text-blue-500' :
                      test.status === 'expired' ?
                      'text-red-500' :
                      'text-muted-foreground'
                      }>
                      
                          {test.status === 'completed' ?
                      'Concluído' :
                      test.status === 'in_progress' ?
                      'Em andamento' :
                      test.status === 'expired' ?
                      'Expirado' :
                      'Aguardando'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="grid grid-cols-4 gap-1">
                          {test.token.
                      split('').
                      slice(0, 4).
                      map((d, idx) =>
                      <div
                        key={`${test.id}-${d}-${idx}`}
                        className="h-8 w-8 rounded-md border border-border/50 bg-muted/30 flex items-center justify-center font-mono text-base">
                        
                                {d}
                              </div>
                      )}
                        </div>
                        <span className="text-xs text-muted-foreground">Código</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expira em {format(new Date(test.expires_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <a
                    href={test.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 truncate">
                    
                        <ExternalLink className="h-3 w-3" />
                        {test.url}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                    variant={test.status === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    className="h-8"
                    onClick={() => handleOpenReport(test.id, test.status)}>
                    
                        Relatório
                      </Button>
                      <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(test.url, test.id)}>
                    
                        {copiedId === test.id ?
                    <Check className="h-4 w-4 text-green-500" /> :

                    <Copy className="h-4 w-4" />
                    }
                      </Button>
                      <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                    onClick={() => handleDeleteTest(test.id)}>
                    
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}
          </div>
        </div>
      }

      <DeviceTestReportDialog
        open={reportOpen}
        onOpenChange={(open) => {
          setReportOpen(open);
          if (!open) setReportSessionId(null);
        }}
        sessionId={reportSessionId}
        title="Relatório do Teste Rápido" />
      

      


      

      <DeviceChecklist
        value={checklist}
        onChange={setChecklist} />

      <Button
        className="w-full h-11"
        onClick={() => setLocalReportOpen(true)}>
        
        Baixar Relatório do Checklist
      </Button>

      <LocalDeviceTestReportDialog
        open={localReportOpen}
        onOpenChange={setLocalReportOpen}
        results={checklistToTestResults(checklist)}
        title="Relatório do Checklist Manual" />
      
      
    </div>);
};

// Helper component for icon
function Clock({ className }: {className?: string;}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}>
      
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>);

}

export default TesteRapidoPage;