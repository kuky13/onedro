import { useState, useEffect, ReactNode } from "react";
import { Smartphone, Play, AlertTriangle, Share, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FullscreenWrapperProps {
  children: ReactNode;
  onStart: () => void;
}

export function FullscreenWrapper({ children, onStart }: FullscreenWrapperProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && !!(navigator as any).standalone));
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    try {
      (screen.orientation as any)?.lock?.("portrait").catch(() => { });
    } catch { }
  }, []);

  // Remove #root safe-area padding when fullscreen wrapper is active
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.paddingTop = '0px';
      root.style.paddingBottom = '0px';
      root.style.paddingLeft = '0px';
      root.style.paddingRight = '0px';
    }
    return () => {
      if (root) {
        root.style.paddingTop = '';
        root.style.paddingBottom = '';
        root.style.paddingLeft = '';
        root.style.paddingRight = '';
      }
    };
  }, []);

  const requestFullscreen = async () => {
    if (isIOS) {
      setIsFullscreen(true);
      setError(null);
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setError(null);
    } catch (err) {
      console.warn("Fullscreen not supported:", err);
      setIsFullscreen(true);
    }
  };

  const handleStart = async () => {
    await requestFullscreen();
    setStarted(true);
    onStart();
  };

  if (!started) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6" style={{ height: '100dvh' }}>
        <div className="max-w-md w-full text-center space-y-6 overflow-y-auto max-h-full py-4">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Teste de Dispositivo</h1>
            <p className="text-muted-foreground">
              Vamos verificar todas as funcionalidades do seu aparelho
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm">O teste será realizado em tela cheia para maior precisão</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm">Siga as instruções de cada teste na tela</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm">Os resultados serão salvos automaticamente</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isIOS && !isStandalone ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-left space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 text-primary font-semibold border-b border-primary/10 pb-3">
                <Smartphone className="w-5 h-5" />
                Para usuários iOS (iPhone/iPad)
              </div>
              <p className="text-sm font-medium">Instale o aplicativo para continuar em tela cheia:</p>
              <ol className="space-y-4 pt-2">
                <li className="flex items-start gap-3">
                  <div className="bg-background rounded shadow-sm p-1.5 shrink-0 border border-border/50">
                    <Share className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm leading-tight pt-1">Toque no ícone de <strong>Compartilhar</strong> na barra inferior do Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-background rounded shadow-sm p-1.5 shrink-0 border border-border/50">
                    <PlusSquare className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm leading-tight pt-1">Selecione <strong>Adicionar à Tela de Início</strong> na lista de opções</span>
                </li>
              </ol>
              <p className="text-xs text-muted-foreground pt-3 border-t border-primary/10">
                Após adicionar, abra o aplicativo pela nova tela inicial para iniciar o teste.
              </p>
            </div>
          ) : (
            <Button onClick={handleStart} size="lg" className="w-full h-14 text-lg gap-3">
              <Play className="w-5 h-5" />
              Iniciar Testes
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Duração estimada: 3-5 minutos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-background flex flex-col",
        isFullscreen && "overflow-hidden"
      )}
      style={{
        height: '100dvh',
        width: '100vw',
        top: 0,
        left: 0,
      }}
    >
      {children}
    </div>
  );
}
