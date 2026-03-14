/**
 * Componente de Integração do Sistema de Testes Interativos de Dispositivo
 * Substitui o checklist manual por geração de link para teste interativo
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Smartphone, QrCode as QrCodeIcon, Link2, Copy, Check, RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TestSession } from '@/types/deviceTest';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDeviceTestRealtime } from "@/hooks/useDeviceTestRealtime";

interface DeviceTestIntegrationProps {
  serviceOrderId: string;
  disabled?: boolean;
}

export const DeviceTestIntegration: React.FC<DeviceTestIntegrationProps> = ({
  serviceOrderId,
  disabled = false
}) => {
  const [session, setSession] = useState<TestSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    if (serviceOrderId) {
      loadExistingSession();
    }
  }, [serviceOrderId]);

  // Hook de realtime para atualizações resilientes
  useDeviceTestRealtime({
    sessionId: session?.id as string | undefined,
    enabled: !!session?.id,
    onUpdate: (updatedSession) => {
      console.log('📡 DeviceTestIntegration: sessão atualizada via hook:', updatedSession.status);
      setSession(prev => ({
        ...prev!,
        ...updatedSession,
        device_info: updatedSession.device_info || {},
        test_results: updatedSession.test_results || {},
        status: updatedSession.status as TestSession['status'],
        expires_at: updatedSession.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }));
      
      if (updatedSession.status === 'completed') {
        toast.success('✅ Teste de dispositivo concluído!');
      }
    }
  });
  const loadExistingSession = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('device_test_sessions').select('*').eq('service_order_id', serviceOrderId).order('created_at', {
        ascending: false
      }).limit(1).single();
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading session:', error);
      }
      if (data) {
        setSession({
          ...data,
          device_info: data.device_info as any || {},
          test_results: data.test_results as any || {},
          status: data.status as TestSession['status'],
          expires_at: data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };
  const generateTestLink = async () => {
    try {
      setGenerating(true);

      // Use a função create_test_session
      const {
        data,
        error
      } = await supabase.rpc('create_test_session', {
        p_service_order_id: serviceOrderId
      });
      if (error) throw error;
      if (data) {
        // Carregar a sessão recém criada
        const {
          data: sessionData,
          error: fetchError
        } = await supabase.from('device_test_sessions').select('*').eq('id', data).maybeSingle();
        if (fetchError) throw fetchError;
        if (sessionData) {
          setSession({
            ...sessionData,
            device_info: sessionData.device_info as any || {},
            test_results: sessionData.test_results as any || {},
            status: sessionData.status as TestSession['status'],
            expires_at: sessionData.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
          toast.success('Link de teste gerado com sucesso!');
        } else {
          toast.error('Sessão criada, mas não foi possível carregar. Tente novamente.');
        }
      }
    } catch (err) {
      console.error('Error generating test link:', err);
      toast.error('Erro ao gerar link de teste');
    } finally {
      setGenerating(false);
    }
  };
  const copyToClipboard = async (e: React.MouseEvent, text: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };
  const generateQrCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getTestUrl();
    if (!url) return;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      });
      setQrCodeDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
      toast.error('Erro ao gerar QR Code');
    }
  };
  const handleOpenLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(getTestUrl(), '_blank');
  };
  const getTestUrl = () => {
    if (!session) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/testar/${session.share_token}`;
  };
  const getStatusConfig = (status: TestSession['status']) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Aguardando',
          color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
          icon: Clock,
          description: 'Link gerado, aguardando cliente iniciar teste'
        };
      case 'in_progress':
        return {
          label: 'Em Andamento',
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
          icon: Loader2,
          description: 'Cliente está realizando os testes'
        };
      case 'completed':
        return {
          label: 'Concluído',
          color: 'bg-green-500/10 text-green-600 border-green-500/30',
          icon: CheckCircle2,
          description: 'Testes finalizados'
        };
      case 'expired':
        return {
          label: 'Expirado',
          color: 'bg-red-500/10 text-red-600 border-red-500/30',
          icon: AlertCircle,
          description: 'Link expirou, gere um novo'
        };
      default:
        return {
          label: status,
          color: 'bg-muted text-muted-foreground',
          icon: AlertCircle,
          description: ''
        };
    }
  };
  const deleteSession = async () => {
    if (!session) return;
    try {
      const {
        error
      } = await supabase.from('device_test_sessions').delete().eq('id', session.id);
      if (error) throw error;
      setSession(null);
      toast.success('Sessão removida');
    } catch (err) {
      toast.error('Erro ao remover sessão');
    }
  };
  if (loading) {
    return <Card className="border-border/50">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>;
  }
  return <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Teste de Funcionamento do Aparelho
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Gere um link para o cliente testar as funcionalidades do aparelho de forma interativa
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!session ?
      // Estado: Sem sessão criada
      <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <QrCodeIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">
                Nenhum teste gerado
              </h3>
              <p className="text-sm text-muted-foreground">
                Clique abaixo para gerar um link de teste interativo
              </p>
            </div>
            <Button onClick={generateTestLink} disabled={disabled || generating} className="w-full sm:w-auto">
              {generating ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </> : <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Gerar Link de Teste
                </>}
            </Button>
          </div> :
      // Estado: Sessão existe
      <div className="space-y-4">
            {/* Status Badge */}
            {(() => {
          const config = getStatusConfig(session.status);
          const StatusIcon = config.icon;
          return <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="outline" className={config.color}>
                    <StatusIcon className={`h-3.5 w-3.5 mr-1.5 ${session.status === 'in_progress' ? 'animate-spin' : ''}`} />
                    {config.label}
                  </Badge>
                  {session.overall_score !== null && <Badge variant="outline" className={session.overall_score >= 70 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}>
                      Score: {session.overall_score.toFixed(0)}%
                    </Badge>}
                </div>;
        })()}

            {/* Link de Teste */}
            {session.status !== 'completed' && session.status !== 'expired' && <div className="space-y-3">
                {/* URL Display */}
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">Link do Teste</p>
                  <code className="text-sm text-foreground break-all select-all">
                    {getTestUrl()}
                  </code>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={e => copyToClipboard(e, getTestUrl())} className="flex-1 sm:flex-none">
                          {copied ? <>
                              <Check className="h-4 w-4 mr-2 text-green-500" />
                              Copiado!
                            </> : <>
                              
                              Copiar Link
                            </>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar link para área de transferência</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={generateQrCode} className="flex-1 sm:flex-none">
                          
                          QR Code
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Gerar QR Code do link</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleOpenLink}>
                          
                          Abrir
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir link em nova aba</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>}

            {/* Resultados Resumidos */}
            {session.status === 'completed' && session.test_results && <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Resultados do Teste
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(session.test_results).map(([testId, result]) => <div key={testId} className={`p-2 rounded-lg border text-center ${result.status === 'passed' ? 'bg-green-500/10 border-green-500/30' : result.status === 'failed' ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50 border-border/30'}`}>
                      <p className="text-xs font-medium capitalize">
                        {testId.replace(/_/g, ' ')}
                      </p>
                      <p className={`text-xs ${result.status === 'passed' ? 'text-green-600' : result.status === 'failed' ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {result.status === 'passed' ? '✓ OK' : result.status === 'failed' ? '✗ Falhou' : 'Pulado'}
                      </p>
                    </div>)}
                </div>
              </div>}

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(session.status === 'expired' || session.status === 'completed') && <Button variant="outline" onClick={generateTestLink} disabled={disabled || generating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                  Gerar Novo Link
                </Button>}
              <Button variant="ghost" size="sm" onClick={deleteSession} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            </div>

            {/* Metadados */}
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/30">
              <p>Criado: {new Date(session.created_at).toLocaleString('pt-BR')}</p>
              {session.expires_at && <p>Expira: {new Date(session.expires_at).toLocaleString('pt-BR')}</p>}
            </div>
          </div>}
      </CardContent>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCodeIcon className="h-5 w-5" />
              QR Code do Teste
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCodeDataUrl && <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qrCodeDataUrl} alt="QR Code do link de teste" className="w-64 h-64" />
              </div>}
            
            

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={e => copyToClipboard(e, getTestUrl())}>
                {copied ? <>
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    Copiado!
                  </> : <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </>}
              </Button>
              <Button variant="default" className="flex-1" onClick={() => setShowQrModal(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>;
};
export default DeviceTestIntegration;
