import { useState, useEffect, useRef } from "react";
import { Check, X, Maximize2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ColorTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

const COLORS = [
  { name: "Vermelho", value: "#FF0000", hsl: "0 100% 50%" },
  { name: "Verde", value: "#00FF00", hsl: "120 100% 50%" },
  { name: "Azul", value: "#0000FF", hsl: "240 100% 50%" },
  { name: "Branco", value: "#FFFFFF", hsl: "0 0% 100%" },
  { name: "Preto", value: "#000000", hsl: "0 0% 0%" },
];

export function ColorTest({ onPass, onFail }: ColorTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);

  const currentColor = COLORS[currentIndex];
  const isLastColor = currentIndex >= COLORS.length - 1;
  const isLightColor = currentColor?.name === "Branco";

  if (!currentColor) return null;

  const enterFullscreen = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // iOS doesn't support Fullscreen API - use pseudo-fullscreen
      setIsFullscreen(true);
      scheduleHideControls();
      return;
    }
    
    try {
      if (fullscreenRef.current) {
        await fullscreenRef.current.requestFullscreen();
        setIsFullscreen(true);
        scheduleHideControls();
      }
    } catch (err) {
      console.error("Fullscreen not supported:", err);
      setIsFullscreen(true);
      scheduleHideControls();
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    setIsFullscreen(false);
  };

  const scheduleHideControls = () => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleScreenTap = () => {
    setShowControls(prev => !prev);
    if (!showControls) {
      scheduleHideControls();
    }
  };

  const handleResult = (passed: boolean) => {
    const newResults = { ...results, [currentColor.name]: passed };
    setResults(newResults);

    if (isLastColor) {
      const allPassed = Object.values(newResults).every(v => v);
      const passedCount = Object.values(newResults).filter(v => v).length;
      
      exitFullscreen();
      
      if (allPassed) {
        onPass({ colors: newResults, passedCount, totalColors: COLORS.length });
      } else {
        onFail({ colors: newResults, passedCount, totalColors: COLORS.length });
      }
    } else {
      setCurrentIndex(prev => prev + 1);
      setShowControls(true);
      scheduleHideControls();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, []);

  return (
    <div ref={fullscreenRef} className="flex-1 flex flex-col">
      {!isFullscreen ? (
        // Initial state - show fullscreen button
        <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center">
              <Maximize2 className="w-10 h-10 text-primary" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold mb-2">Teste de Cores e Pixels</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-xs">
            Verifique se há manchas, pixels mortos ou irregularidades na tela
          </p>
          
          <div className="bg-muted/50 rounded-xl p-4 mb-6 max-w-xs">
            <p className="text-sm text-muted-foreground text-center">
              💡 {COLORS.length} cores serão exibidas em tela cheia. Toque na tela para mostrar/esconder os controles.
            </p>
          </div>

          <Button size="lg" className="w-full max-w-xs h-14 gap-3" onClick={enterFullscreen}>
            <Maximize2 className="w-5 h-5" />
            Iniciar em Tela Cheia
          </Button>
        </div>
      ) : (
        // Fullscreen color test
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center transition-colors duration-300"
          style={{ backgroundColor: currentColor.value }}
          onClick={handleScreenTap}
        >
          {/* Toggle controls indicator */}
          <div 
            className={cn(
              "absolute top-4 right-4 transition-opacity duration-300",
              showControls ? "opacity-0" : "opacity-100"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isLightColor ? "bg-black/10" : "bg-white/10"
            )}>
              <Eye className={cn("w-5 h-5", isLightColor ? "text-black/50" : "text-white/50")} />
            </div>
          </div>

          {/* Control Panel - Floating */}
          <div 
            className={cn(
              "w-full max-w-sm p-6 pb-safe space-y-4 transition-all duration-300",
              showControls 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-full pointer-events-none"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-background/90 backdrop-blur-xl rounded-3xl p-6 space-y-4 border border-border/50 shadow-2xl">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Cor {currentIndex + 1} de {COLORS.length}
                </p>
                <h3 className="text-lg font-bold">{currentColor.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Procure por manchas ou pixels anormais
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => handleResult(false)}
                >
                  <X className="w-5 h-5" />
                  Problema
                </Button>
                <Button
                  className="flex-1 h-12 gap-2"
                  onClick={() => handleResult(true)}
                >
                  <Check className="w-5 h-5" />
                  OK
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2">
                {COLORS.map((color, index) => (
                  <div
                    key={color.name}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentIndex && "w-4 bg-primary",
                      index < currentIndex && results[color.name] && "bg-primary",
                      index < currentIndex && !results[color.name] && "bg-destructive",
                      index > currentIndex && "bg-muted"
                    )}
                  />
                ))}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                <EyeOff className="w-3 h-3 inline mr-1" />
                Toque na tela para esconder os controles
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
