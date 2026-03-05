import { useState, useCallback, useRef, useEffect } from "react";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TouchTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

const GRID_COLS = 8;
const GRID_ROWS = 14;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

export function TouchTest({ onPass, onFail }: TouchTestProps) {
  const [touchedCells, setTouchedCells] = useState<Set<number>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const touchedCount = touchedCells.size;
  const progress = (touchedCount / TOTAL_CELLS) * 100;

  const handleTouch = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const touches = "touches" in e ? Array.from(e.touches) : [e];

    touches.forEach((touch) => {
      const clientX = "clientX" in touch ? touch.clientX : 0;
      const clientY = "clientY" in touch ? touch.clientY : 0;
      
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const col = Math.floor((x / rect.width) * GRID_COLS);
      const row = Math.floor((y / rect.height) * GRID_ROWS);
      
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        const cellIndex = row * GRID_COLS + col;
        setTouchedCells(prev => new Set([...prev, cellIndex]));
      }
    });
  }, []);

  const enterFullscreen = async () => {
    try {
      if (fullscreenContainerRef.current) {
        await fullscreenContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
        setStartTime(Date.now());
      }
    } catch (err) {
      console.error("Fullscreen not supported:", err);
      // Start anyway without fullscreen
      setIsFullscreen(true);
      setStartTime(Date.now());
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    setIsFullscreen(false);
  };

  const handleExitAttempt = () => {
    if (touchedCount >= TOTAL_CELLS) {
      // Test completed, can exit
      const duration = startTime ? Date.now() - startTime : 0;
      onPass({ 
        touchedCells: touchedCount, 
        totalCells: TOTAL_CELLS, 
        duration_ms: duration,
        completionRate: 100 
      });
      exitFullscreen();
    } else {
      // Show confirmation dialog
      setShowExitConfirm(true);
    }
  };

  const confirmExit = (passed: boolean) => {
    const duration = startTime ? Date.now() - startTime : 0;
    const completionRate = (touchedCount / TOTAL_CELLS) * 100;
    
    if (passed) {
      onFail({ 
        touchedCells: touchedCount, 
        totalCells: TOTAL_CELLS, 
        duration_ms: duration,
        completionRate,
        reason: "incomplete"
      });
    }
    exitFullscreen();
    setShowExitConfirm(false);
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // User exited via ESC or browser action
        handleExitAttempt();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isFullscreen, touchedCount]);

  // Auto-complete when all cells touched
  useEffect(() => {
    if (touchedCount >= TOTAL_CELLS && isFullscreen) {
      const duration = startTime ? Date.now() - startTime : 0;
      setTimeout(() => {
        onPass({ 
          touchedCells: touchedCount, 
          totalCells: TOTAL_CELLS, 
          duration_ms: duration,
          completionRate: 100 
        });
        exitFullscreen();
      }, 300);
    }
  }, [touchedCount, isFullscreen, startTime, onPass]);

  // Handle back button/gesture
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (isFullscreen) {
        e.preventDefault();
        handleExitAttempt();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isFullscreen, touchedCount]);

  return (
    <div ref={fullscreenContainerRef} className="flex-1 flex flex-col">
      {!isFullscreen ? (
        // Initial state - show fullscreen button
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <Maximize2 className="w-12 h-12 text-primary" />
          </div>
          
          <h3 className="text-xl font-bold mb-2">Teste de Touch Screen</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-xs">
            Toque em todas as áreas da tela para verificar se o touch está funcionando corretamente
          </p>
          
          <div className="bg-muted/50 rounded-xl p-4 mb-6 max-w-xs">
            <p className="text-sm text-muted-foreground text-center">
              💡 O teste será em tela cheia. Toque em todos os {TOTAL_CELLS} quadrados para completar.
            </p>
          </div>

          <Button size="lg" className="w-full max-w-xs h-14 gap-3" onClick={enterFullscreen}>
            <Maximize2 className="w-5 h-5" />
            Iniciar em Tela Cheia
          </Button>
        </div>
      ) : (
        // Fullscreen test mode
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
          {/* Progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
            <div
              className="h-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Counter - floating */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border shadow-lg">
            <span className="font-bold text-primary">{touchedCount}</span>
            <span className="text-muted-foreground"> / {TOTAL_CELLS}</span>
          </div>

          {/* Exit button */}
          <button
            onClick={handleExitAttempt}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full border border-border shadow-lg flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Touch Grid - Full screen */}
          <div
            ref={containerRef}
            className="flex-1 grid gap-px touch-none select-none bg-border"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            }}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            onMouseDown={handleTouch}
            onMouseMove={(e) => e.buttons === 1 && handleTouch(e)}
          >
            {Array.from({ length: TOTAL_CELLS }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  "transition-colors duration-100",
                  touchedCells.has(index)
                    ? "bg-primary"
                    : "bg-muted/30"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do Teste?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tocou em {touchedCount} de {TOTAL_CELLS} áreas ({Math.round(progress)}%).
              {touchedCount < TOTAL_CELLS && " O teste não foi completado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              Continuar Teste
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmExit(true)}>
              Sair Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
