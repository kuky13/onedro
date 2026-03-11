import { useState, useEffect } from 'react';
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

interface QuickTest {
  id: string;
  name: string;
  url: string;
  created_at: string;
  expires_at: string;
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

  const navigate = useNavigate();

  useEffect(() => {
    fetchQuickTests();
  }, []);

  const fetchQuickTests = async () => {
    try {
      setIsLoading(true);
      const { data: fetchedTests, error } = await supabase
        .from('device_test_sessions')
        .select('id, share_token, created_at, expires_at, device_info, status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      const mapped: QuickTest[] = (fetchedTests || []).map((t: any) => ({
        id: t.id,
        name: t.device_info?.name || t.share_token,
        url: `${window.location.origin}/testar/${t.share_token}`,
        created_at: t.created_at,
        expires_at: t.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));
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
      // Generate a temporary share token (simulated for now, would typically be from DeviceTestIntegration)
      // In a real scenario, we might want to create a real session or just a static link
      // For this requirement, we'll assume we are generating a link to a viewer page
      // But since we don't have a specific viewer for "quick tests" without a device/OS, 
      // we'll point to the generic test page with a unique ID or similar.
      // Let's use a placeholder URL structure for now as per requirement "URL de teste".
      
      const uniqueId = crypto.randomUUID();

      const { data: _newTest, error } = await supabase
        .from('device_test_sessions')
        .insert([{
          share_token: uniqueId,
          status: 'pending',
          device_info: { name: newTestName },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Teste rápido criado com sucesso!');
      setNewTestName('');
      setIsDialogOpen(false);
      fetchQuickTests(); // Refresh list
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error('Erro ao criar teste. Tente novamente.');
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
      setQuickTests(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error('Erro ao remover teste');
    }
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
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <div className="space-y-2">
                <Label htmlFor="test-name">Nome do Teste</Label>
                <Input 
                  id="test-name" 
                  placeholder="Ex: iPhone 11 - Cliente João" 
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                />
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateTest} disabled={isCreating}>
                {isCreating ? 'Criando...' : 'Gerar Link'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Testes Ativos */}
      {quickTests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Links Ativos 
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {quickTests.length}/5
            </span>
          </h2>
          
          <div className="grid gap-3">
            {quickTests.map((test) => (
              <Card key={test.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-medium truncate">{test.name}</h3>
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
                        className="text-xs text-primary hover:underline flex items-center gap-1 mt-1 truncate"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {test.url}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(test.url, test.id)}
                      >
                        {copiedId === test.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                        onClick={() => handleDeleteTest(test.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Checklist Manual</h2>
        <p className="text-sm text-muted-foreground">Realize um teste rápido localmente sem gerar link.</p>
      </div>

      <DeviceChecklist
        value={checklist}
        onChange={setChecklist} />
      
    </div>);
};

// Helper component for icon
function Clock({ className }: { className?: string }) {
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
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default TesteRapidoPage;