/**
 * Dialog de Compartilhamento do Diagnóstico
 * Com persistência de sessão e atualizações em tempo real
 * Sistema OneDrip - Mobile First Design Compacto
 */

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Copy,
  ExternalLink,
  QrCode,
  Check,
  Loader2,
  Smartphone,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Activity,
} from "lucide-react";
import { TESTS_CONFIG, TestSession } from "@/types/deviceTest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useDeviceTestRealtime } from "@/hooks/useDeviceTestRealtime";

interface DiagnosticShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDirect: () => void;
  serviceOrderId?: string | undefined;
  onChecklistUpdate?: (checklistData: any) => void;
}

const statusConfig = {
  pending: {
    label: "Aguardando",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    icon: Clock,
    description: "Link gerado, aguardando início",
  },
  in_progress: {
    label: "Em Andamento",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: Play,
    description: "Cliente realizando os testes",
  },
  completed: {
    label: "Concluído",
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: CheckCircle2,
    description: "Testes finalizados",
  },
  expired: {
    label: "Expirado",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: AlertCircle,
    description: "Link expirou",
  },
};

export function DiagnosticShareDialog({
  isOpen,
  onClose,
  onOpenDirect,
  serviceOrderId,
  onChecklistUpdate,
}: DiagnosticShareDialogProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [session, setSession] = useState<TestSession | null>(null);
  const [diagnosticUrl, setDiagnosticUrl] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingQRRegeneration, setPendingQRRegeneration] = useState(false);

  // Hook de realtime para atualizações resilientes
  const { isConnected, connectionType } = useDeviceTestRealtime({
    sessionId: session?.id,
    enabled: isOpen && !!session?.id,
    onUpdate: (updatedSession) => {
      console.log("📡 Sessão atualizada via hook:", updatedSession.status);
      setSession(prev => ({
        ...prev!,
        ...updatedSession,
        test_results: updatedSession.test_results || {},
        device_info: updatedSession.device_info || {}
      }));

      // Notificar mudanças de status
      if (updatedSession.status === "in_progress") {
        toast.info("🔬 Diagnóstico atualizado!");
      } else if (updatedSession.status === "completed") {
        toast.success("✅ Diagnóstico concluído!");

        // Atualizar o checklist automaticamente quando concluído
        if (onChecklistUpdate && updatedSession.test_results) {
          const checklistData = mapTestResultsToChecklist(updatedSession.test_results);
          onChecklistUpdate(checklistData);
        }
      }
    }
  });

  // Carregar sessão existente ou criar nova quando o dialog abre
  useEffect(() => {
    if (isOpen) {
      loadOrCreateSession();
    }
  }, [isOpen]);

  // Reset quando fecha
  useEffect(() => {
    if (!isOpen) {
      setShowQR(false);
      setQrDataUrl(null);
      setCopied(false);
      setPendingQRRegeneration(false);
    }
  }, [isOpen]);

  // Auto-regenerar QR quando diagnosticUrl muda após redefinir link
  useEffect(() => {
    if (pendingQRRegeneration && diagnosticUrl) {
      setPendingQRRegeneration(false);
      (async () => {
        try {
          const dataUrl = await QRCode.toDataURL(diagnosticUrl, {
            margin: 1,
            width: 180,
            color: { dark: "#000000", light: "#FFFFFF" },
          });
          setQrDataUrl(dataUrl);
          setShowQR(true);
        } catch (err) {
          console.error("Erro ao regenerar QR:", err);
        }
      })();
    }
  }, [pendingQRRegeneration, diagnosticUrl]);

  // Função para mapear resultados do teste para o novo checklist sincronizado
  const mapTestResultsToChecklist = (testResults: Record<string, any>) => {
    return {
      tela: {
        touch_screen: testResults.display_touch?.status === "passed",
        cores_pixels: testResults.display_colors?.status === "passed",
        display_integro: testResults.display_integro?.status === "passed",
        sem_manchas: testResults.display_colors?.status === "passed",
      },
      audio: {
        alto_falante: testResults.audio_speaker?.status === "passed",
        microfone: testResults.audio_mic?.status === "passed",
        alto_falante_auricular: testResults.alto_falante_auricular?.status === "passed",
        entrada_fone: testResults.entrada_fone?.status === "passed",
      },
      cameras: {
        camera_frontal: testResults.camera_front?.status === "passed",
        camera_traseira: testResults.camera_back?.status === "passed",
        flash: testResults.camera_back?.details?.flashUsed ?? false,
        foco_automatico: testResults.foco_automatico?.status === "passed",
      },
      sensores: {
        vibracao: testResults.vibration?.status === "passed",
        botao_volume_mais: testResults.buttons?.details?.buttons?.volumeUp ?? false,
        botao_volume_menos: testResults.buttons?.details?.buttons?.volumeDown ?? false,
        botao_power: testResults.buttons?.details?.buttons?.power ?? false,
        acelerometro: testResults.sensors?.details?.accelerometer ?? false,
        giroscopio: testResults.sensors?.details?.gyroscope ?? false,
        proximidade: testResults.sensors?.details?.proximityTested ?? false,
        gps: testResults.location?.status === "passed",
      },
      sistema: {
        bateria: testResults.battery?.status === "passed",
        carregamento: testResults.battery?.details?.charging ?? false,
        wifi: true, // Se está rodando, wifi funciona
        bluetooth: testResults.bluetooth?.status === "passed",
      },
      extras: {
        face_id: testResults.face_id?.status === "passed",
        biometria: testResults.biometria?.status === "passed",
        nfc: testResults.nfc?.status === "passed",
        chip_sim: testResults.chip_sim?.status === "passed",
        tampa_traseira_ok: testResults.tampa_traseira_ok?.status === "passed",
      },
    };
  };

  const loadOrCreateSession = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Você precisa estar logado");
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Buscar sessão existente ativa (não concluída, não expirada)
      // FIX: Garantir que não pegamos sessões de "quick_test"
      const { data: existingSession, error: fetchError } = await supabase
        .from("device_test_sessions")
        .select("*")
        .eq("created_by", user.id)
        .neq("device_info->>source", "quick_test") // Ignorar testes rápidos
        .in("status", ["pending", "in_progress"])
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingSession) {
        // Usar sessão existente
        console.log("♻️ Reutilizando sessão existente:", existingSession.share_token);
        setSession({
          id: existingSession.id,
          share_token: existingSession.share_token,
          status: existingSession.status as TestSession["status"],
          expires_at: existingSession.expires_at ?? '',
          created_at: existingSession.created_at,
          completed_at: existingSession.completed_at,
          overall_score: existingSession.overall_score,
          test_results: existingSession.test_results as any,
          device_info: existingSession.device_info as any || {},
        } as TestSession);
        setDiagnosticUrl(`${window.location.origin}/testar/${existingSession.share_token}`);
        toast.info("Usando sessão de diagnóstico existente");
      } else {
        // Criar nova sessão
        await createNewSession(user.id);
      }
    } catch (err) {
      console.error("Erro ao carregar sessão:", err);
      toast.error("Erro ao carregar diagnóstico");
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async (userId: string) => {
    try {
      // Tentar gerar token único até 3 vezes
      let shareToken = '';
      let attempts = 0;
      let created = false;
      let sessionData = null;

      while (attempts < 3 && !created) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        shareToken = Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map(b => chars[b % chars.length])
          .join('');
        
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('device_test_sessions')
          .select('id')
          .eq('share_token', shareToken)
          .maybeSingle();
          
        if (!existing) {
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          const { data, error } = await supabase
            .from("device_test_sessions")
            .insert({
              share_token: shareToken,
              status: "pending",
              expires_at: expiresAt,
              service_order_id: serviceOrderId || null,
              created_by: userId,
              device_info: { source: 'diagnostic_share' }, // Marcar origem
              test_results: {},
            })
            .select()
            .single();
            
          if (!error && data) {
            created = true;
            sessionData = data;
          }
        }
        attempts++;
      }

      if (sessionData) {
        console.log("✨ Nova sessão criada:", sessionData.share_token);
        setSession({
          id: sessionData.id,
          share_token: sessionData.share_token,
          status: sessionData.status as TestSession["status"],
          expires_at: sessionData.expires_at ?? '',
          created_at: sessionData.created_at,
          completed_at: sessionData.completed_at,
          overall_score: sessionData.overall_score,
          test_results: sessionData.test_results as any,
          device_info: sessionData.device_info as any || {},
        } as TestSession);
        setDiagnosticUrl(`${window.location.origin}/testar/${sessionData.share_token}`);
        toast.success("Link de diagnóstico criado!");
      } else {
        throw new Error("Falha ao gerar token único");
      }
    } catch (err) {
      console.error("Erro ao criar sessão:", err);
      toast.error("Erro ao gerar link");
    }
  };

  const handleForceNewSession = async () => {
    if (!userId) return;
    setIsLoading(true);
    const wasShowingQR = showQR;
    // Apagar sessão antiga
    if (session?.id) {
      await supabase.from("device_test_sessions").delete().eq("id", session.id);
    }
    setSession(null);
    setDiagnosticUrl("");
    setQrDataUrl(null);
    setShowQR(false);
    if (wasShowingQR) {
      setPendingQRRegeneration(true);
    }
    await createNewSession(userId);
    setIsLoading(false);
  };

  const handleCopyLink = async () => {
    if (!diagnosticUrl) return;
    try {
      await navigator.clipboard.writeText(diagnosticUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar");
    }
  };

  const handleGenerateQR = async () => {
    if (!diagnosticUrl) return;
    setIsGeneratingQR(true);
    try {
      const dataUrl = await QRCode.toDataURL(diagnosticUrl, {
        margin: 1,
        width: 180,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch (err) {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleOpenDirect = () => {
    onClose();
    onOpenDirect();
  };

  const handleOpenInNewTab = () => {
    if (diagnosticUrl) {
      window.open(diagnosticUrl, "_blank");
    }
  };

  const currentStatus = session?.status ? statusConfig[session.status] : null;
  const StatusIcon = currentStatus?.icon || Clock;

  // Calcular tempo restante
  const getTimeRemaining = () => {
    if (!session?.expires_at) return null;
    const diff = new Date(session.expires_at).getTime() - Date.now();
    if (diff <= 0) return "Expirado";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m restantes`;
  };

  // Calcular progresso dos testes
  const getTestProgress = () => {
    if (!session?.test_results) return { completed: 0, current: 0, total: TESTS_CONFIG.length, currentTestName: null };
    const results = session.test_results;
    const completed = Object.values(results).filter(
      (r: any) => r.status === "passed" || r.status === "failed" || r.status === "skipped",
    ).length;
    const currentIndex = completed + 1;
    const currentTestName = currentIndex <= TESTS_CONFIG.length ? TESTS_CONFIG[completed]?.label : null;
    return { completed, current: currentIndex, total: TESTS_CONFIG.length, currentTestName };
  };

  const progress = getTestProgress();

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm p-0 gap-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/30">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              Diagnóstico
            </div>
            {currentStatus && (
              <Badge variant="outline" className={`text-[10px] ${currentStatus.color}`}>
                <StatusIcon className={`h-3 w-3 mr-1 ${session?.status === "in_progress" ? "animate-pulse" : ""}`} />
                {currentStatus.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-80px)]">
          <div className="p-4 pt-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Status e Progresso */}
                {session?.status === "in_progress" && progress && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                        <span className="text-xs font-medium text-blue-600">
                          Teste {progress.current} de {progress.total}
                        </span>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">
                        {Math.round((progress.completed / progress.total) * 100)}%
                      </span>
                    </div>
                    {progress.currentTestName && (
                      <p className="text-[11px] text-blue-500/80 mb-2 truncate">{progress.currentTestName}</p>
                    )}
                    <div className="w-full h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Score Final */}
                {session?.status === "completed" && session.overall_score !== null && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                    <p className="text-xs text-green-600 mb-1">Score Final</p>
                    <p className="text-2xl font-bold text-green-600">{session.overall_score.toFixed(0)}%</p>
                  </div>
                )}

                {/* URL Display */}
                {diagnosticUrl && (
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border/40">
                    <code className="text-[10px] text-muted-foreground break-all select-all line-clamp-2">
                      {diagnosticUrl}
                    </code>
                  </div>
                )}

                {/* Botões de Ação */}
                {session?.status !== "completed" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2.5 px-3 flex flex-col items-center gap-1"
                      onClick={handleCopyLink}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      <span className="text-xs font-medium">{copied ? "Copiado!" : "Copiar"}</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2.5 px-3 flex flex-col items-center gap-1"
                      onClick={handleGenerateQR}
                      disabled={isGeneratingQR}
                    >
                      {isGeneratingQR ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      <span className="text-xs font-medium">QR Code</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-auto py-2.5 px-3 flex flex-col items-center gap-1"
                      onClick={handleOpenInNewTab}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-xs font-medium">Nova Aba</span>
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="h-auto py-2.5 px-3 flex flex-col items-center gap-1"
                      onClick={handleOpenDirect}
                    >
                      <Smartphone className="h-4 w-4" />
                      <span className="text-xs font-medium">Iniciar</span>
                    </Button>
                  </div>
                )}

                {/* Botão Redefinir Link - sempre visível */}
                {session && (
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleForceNewSession}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Redefinir Link
                  </Button>
                )}

                {/* QR Code Display */}
                {showQR && qrDataUrl && session?.status !== "completed" && (
                  <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/30">
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <img src={qrDataUrl} alt="QR Code" className="w-36 h-36" />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Escaneie com a câmera do aparelho</p>
                  </div>
                )}

                {/* Info sobre expiração */}
                {session?.expires_at && session.status !== "completed" && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{getTimeRemaining()}</span>
                  </div>
                )}

                {/* Indicador de tempo real */}
                <div className="flex items-center justify-center gap-1.5 pt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {session?.status === "in_progress" && progress
                      ? `Teste ${progress.current}/${progress.total} em andamento`
                      : "Atualizações em tempo real"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default DiagnosticShareDialog;
