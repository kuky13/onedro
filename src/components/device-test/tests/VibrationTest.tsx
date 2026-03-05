import { useState, useCallback, useEffect } from "react";
import { Vibrate, Check, X, AlertTriangle, Smartphone, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VibrationTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

type TestMode = "detecting" | "auto" | "manual";

const VIBRATION_PATTERNS = [
  { label: "Curta", pattern: [300], description: "1 vibração curta" },
  { label: "Longa", pattern: [1000], description: "1 vibração longa" },
  { label: "Padrão", pattern: [300, 150, 300, 150, 300], description: "Padrão triplo" },
];

export function VibrationTest({ onPass, onFail, onSkip }: VibrationTestProps) {
  const [mode, setMode] = useState<TestMode>("detecting");
  const [currentPattern, setCurrentPattern] = useState(0);
  const [isVibrating, setIsVibrating] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [vibratedPatterns, setVibratedPatterns] = useState<Set<string>>(new Set());

  const pattern = VIBRATION_PATTERNS[currentPattern];
  const isLastPattern = currentPattern >= VIBRATION_PATTERNS.length - 1;

  // Detect if vibration is supported
  useEffect(() => {
    const detectVibration = async () => {
      // Check if API exists
      if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") {
        setMode("manual");
        return;
      }

      // Try to actually vibrate (some browsers have the API but it doesn't work)
      try {
        const result = navigator.vibrate(1);
        if (result) {
          // On iOS, vibrate() returns true but doesn't actually vibrate
          // We can't detect this, so we'll show a confirmation
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          if (isIOS) {
            setMode("manual");
          } else {
            setMode("auto");
          }
        } else {
          setMode("manual");
        }
      } catch {
        setMode("manual");
      }
    };

    // Small delay to show detecting state
    setTimeout(detectVibration, 500);
  }, []);

  const triggerVibration = useCallback(() => {
    if (!pattern) return;
    
    setIsVibrating(true);
    setVibratedPatterns(prev => new Set([...prev, pattern.label]));
    
    try {
      navigator.vibrate(0);
      setTimeout(() => {
        navigator.vibrate(pattern.pattern);
      }, 50);
    } catch (e) {
      console.error("Vibration error:", e);
    }
    
    const totalDuration = pattern.pattern.reduce((a, b) => a + b, 0);
    setTimeout(() => setIsVibrating(false), totalDuration + 200);
  }, [pattern]);

  const handleAutoResult = (passed: boolean) => {
    if (!pattern) return;
    const newResults = { ...results, [pattern.label]: passed };
    setResults(newResults);

    if (isLastPattern) {
      const allPassed = Object.values(newResults).every(v => v);
      const passedCount = Object.values(newResults).filter(v => v).length;
      
      if (allPassed) {
        onPass({ patterns: newResults, passedCount, mode: "auto", testedPatterns: Array.from(vibratedPatterns) });
      } else {
        onFail({ patterns: newResults, passedCount, mode: "auto", testedPatterns: Array.from(vibratedPatterns) });
      }
    } else {
      setCurrentPattern(prev => prev + 1);
    }
  };

  const handleManualResult = (works: boolean) => {
    if (works) {
      onPass({ mode: "manual", manualConfirmation: true, vibrationWorks: true });
    } else {
      onFail({ mode: "manual", manualConfirmation: true, vibrationWorks: false });
    }
  };

  // Detecting state
  if (mode === "detecting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4 animate-pulse">
          <Vibrate className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-lg mb-2">Detectando Vibração...</h3>
        <p className="text-sm text-muted-foreground text-center">
          Verificando se o dispositivo suporta vibração
        </p>
      </div>
    );
  }

  // Manual test mode (for iOS or unsupported devices)
  if (mode === "manual") {
    return (
      <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
        {/* Warning Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>

        <h3 className="font-bold text-lg mb-2">Teste Manual de Vibração</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Este navegador não suporta vibração automática
        </p>

        {/* Manual Test Instructions */}
        <div className="bg-muted/50 rounded-2xl p-5 mb-6 max-w-xs w-full">
          <h4 className="font-medium text-sm mb-4 text-center">
            Teste manualmente seguindo os passos:
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Ative o modo silencioso</p>
                <p className="text-xs text-muted-foreground">Deslize a chave lateral do iPhone ou configure no Android</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Receba uma notificação</p>
                <p className="text-xs text-muted-foreground">Peça para alguém te enviar uma mensagem</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Verifique se vibrou</p>
                <p className="text-xs text-muted-foreground">O celular deve vibrar ao receber a notificação</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative: Phone app test */}
        <div className="bg-primary/5 rounded-xl p-4 mb-6 max-w-xs w-full">
          <div className="flex items-center gap-3 mb-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Alternativa rápida</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Abra o app de Telefone, digite um número e apague - a vibração do teclado deve funcionar
          </p>
        </div>

        {/* Result Buttons */}
        <p className="text-sm text-muted-foreground mb-3">
          O motor de vibração funciona?
        </p>
        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => handleManualResult(false)}
          >
            <X className="w-5 h-5" />
            Não Vibra
          </Button>
          <Button
            className="flex-1 h-12 gap-2"
            onClick={() => handleManualResult(true)}
          >
            <Check className="w-5 h-5" />
            Vibra OK
          </Button>
        </div>

        <Button variant="ghost" className="mt-3" onClick={onSkip}>
          Pular este teste
        </Button>
      </div>
    );
  }

  // Auto test mode (for Android/supported browsers)
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      {/* Visual Indicator */}
      <div className={cn(
        "w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-100",
        isVibrating ? "bg-primary/20" : "bg-muted"
      )}>
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all",
          isVibrating ? "bg-primary animate-[pulse_0.15s_ease-in-out_infinite]" : "bg-muted-foreground/20"
        )}>
          <Vibrate className={cn(
            "w-10 h-10 transition-colors",
            isVibrating ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        </div>
      </div>

      {/* Pattern Info */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          Padrão {currentPattern + 1} de {VIBRATION_PATTERNS.length}
        </p>
        <h3 className="text-xl font-bold">{pattern?.label ?? ""}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {pattern?.description ?? ""}
        </p>
      </div>

      {/* Vibrate Button */}
      <Button
        size="lg"
        className={cn(
          "w-full max-w-xs h-14 gap-3 mb-6 transition-all",
          isVibrating && "animate-[wiggle_0.1s_ease-in-out_infinite]"
        )}
        onClick={triggerVibration}
        disabled={isVibrating}
      >
        <Vibrate className="w-5 h-5" />
        {isVibrating ? "Vibrando..." : "Vibrar"}
      </Button>

      {/* Hint */}
      <div className="bg-muted/50 rounded-xl p-3 mb-6 max-w-xs">
        <div className="flex items-center gap-2 justify-center">
          <Hand className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Segure o dispositivo na mão para sentir melhor
          </p>
        </div>
      </div>

      {/* Question */}
      <p className="text-center text-muted-foreground mb-4">
        O dispositivo vibrou corretamente?
      </p>

      {/* Answer Buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        <Button
          variant="outline"
          className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={() => handleAutoResult(false)}
        >
          <X className="w-5 h-5" />
          Não
        </Button>
        <Button
          className="flex-1 h-12 gap-2"
          onClick={() => handleAutoResult(true)}
        >
          <Check className="w-5 h-5" />
          Sim
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {VIBRATION_PATTERNS.map((p, index) => (
          <div
            key={p.label}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentPattern && "w-4 bg-primary",
              index < currentPattern && results[p.label] && "bg-primary",
              index < currentPattern && !results[p.label] && "bg-destructive",
              index > currentPattern && "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
