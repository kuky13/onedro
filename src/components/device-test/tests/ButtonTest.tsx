import { useState, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Power, Check, X, Smartphone, Home, LucideIcon, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ButtonTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

interface ButtonConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  works: boolean | null; // null = not tested, true = works, false = doesn't work
  autoDetected: boolean; // true if detected automatically by browser
  detectionCount: number; // number of times detected
}

export function ButtonTest({ onPass, onFail }: ButtonTestProps) {
  const [buttons, setButtons] = useState<ButtonConfig[]>([
    { id: "volumeUp", label: "Volume +", icon: Volume2, works: null, autoDetected: false, detectionCount: 0 },
    { id: "volumeDown", label: "Volume -", icon: VolumeX, works: null, autoDetected: false, detectionCount: 0 },
    { id: "power", label: "Botão Lateral / Power", icon: Power, works: null, autoDetected: false, detectionCount: 0 },
    { id: "home", label: "Botão Home (se houver)", icon: Home, works: null, autoDetected: false, detectionCount: 0 },
  ]);

  const [isListening] = useState(true);
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  // Handle key detection
  const handleKeyEvent = useCallback((event: KeyboardEvent) => {
    let buttonId: string | null = null;

    // Map key events to button IDs
    switch (event.key) {
      case "AudioVolumeUp":
      case "VolumeUp":
        buttonId = "volumeUp";
        break;
      case "AudioVolumeDown":
      case "VolumeDown":
        buttonId = "volumeDown";
        break;
      case "Power":
      case "PowerOff":
      case "Sleep":
      case "WakeUp":
        buttonId = "power";
        break;
      case "Home":
      case "GoHome":
        buttonId = "home";
        break;
      case "Assistant":
      case "LaunchAssistant":
        buttonId = "assistant";
        break;
    }

    if (buttonId) {
      event.preventDefault();
      setLastDetected(buttonId);

      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === buttonId
            ? {
                ...btn,
                works: true,
                autoDetected: true,
                detectionCount: btn.detectionCount + 1,
              }
            : btn,
        ),
      );

      // Clear highlight after a moment
      setTimeout(() => setLastDetected(null), 500);
    }
  }, []);

  // Handle visibility change (can detect power button via screen off/on)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      // Screen just turned on - could indicate power button was pressed
      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === "power" && !btn.autoDetected ? { ...btn, detectionCount: btn.detectionCount + 1 } : btn,
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (!isListening) return;

    // Listen for keyboard events (volume keys)
    document.addEventListener("keydown", handleKeyEvent);
    document.addEventListener("keyup", handleKeyEvent);

    // Listen for visibility changes (power button)
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("keydown", handleKeyEvent);
      document.removeEventListener("keyup", handleKeyEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isListening, handleKeyEvent, handleVisibilityChange]);

  const testedCount = buttons.filter((b) => b.works !== null).length;
  const workingCount = buttons.filter((b) => b.works === true).length;
  const autoDetectedCount = buttons.filter((b) => b.autoDetected).length;
  const requiredButtonsTested = buttons.slice(0, 3).every((b) => b.works !== null);

  const handleButtonToggle = (id: string, works: boolean) => {
    setButtons((prev) =>
      prev.map((btn) => (btn.id === id ? { ...btn, works: btn.works === works ? null : works } : btn)),
    );
  };

  const handleSubmit = (allWorking: boolean) => {
    const buttonsResults: Record<string, { works: boolean | null; autoDetected: boolean; detectionCount: number }> = {};
    buttons.forEach((btn) => {
      buttonsResults[btn.id] = {
        works: btn.works,
        autoDetected: btn.autoDetected,
        detectionCount: btn.detectionCount,
      };
    });

    const data = {
      buttons: buttonsResults,
      testedCount,
      workingCount,
      autoDetectedCount,
      manualConfirmation: true,
    };

    if (allWorking) {
      onPass(data);
    } else {
      onFail(data);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-safe">
        {/* Instructions */}
        <div className="text-center mb-3">
          <h3 className="text-lg font-bold mb-1">Teste de Botões Físicos</h3>
          <p className="text-muted-foreground text-xs">Pressione cada botão e marque se funcionou</p>
        </div>

        {/* Auto-detection indicator */}
        {isListening && (
          <div className="bg-primary/10 rounded-lg p-2 mb-3 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-xs text-primary font-medium">Detecção automática ativa</span>
          </div>
        )}

        {/* Auto-detected count */}
        {autoDetectedCount > 0 && (
          <div className="bg-green-500/10 rounded-lg p-2 mb-3 flex items-center justify-center gap-2">
            <Zap className="w-3 h-3 text-green-500" />
            <span className="text-xs text-green-600 font-medium">{autoDetectedCount} detectado(s) automaticamente</span>
          </div>
        )}

        {/* Buttons List - Compact */}
        <div className="space-y-2">
          {buttons.map((btn) => {
            const IconComponent = btn.icon;
            const isOptional = btn.id === "home" || btn.id === "assistant";
            const isHighlighted = lastDetected === btn.id;

            return (
              <div
                key={btn.id}
                className={cn(
                  "bg-muted/50 rounded-lg p-3 transition-all",
                  btn.works === true && "ring-2 ring-primary/50 bg-primary/10",
                  btn.works === false && "ring-2 ring-destructive/50 bg-destructive/10",
                  isHighlighted && "ring-2 ring-green-500 bg-green-500/20 scale-[1.01]",
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                      btn.works === true
                        ? "bg-primary text-primary-foreground"
                        : btn.works === false
                          ? "bg-destructive text-destructive-foreground"
                          : isHighlighted
                            ? "bg-green-500 text-white"
                            : "bg-muted-foreground/20 text-muted-foreground",
                    )}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs truncate">{btn.label}</span>
                      {btn.autoDetected && (
                        <span className="text-[9px] bg-green-500/20 text-green-600 px-1 py-0.5 rounded-full font-medium shrink-0">
                          Auto
                        </span>
                      )}
                      {isOptional && <span className="text-[9px] text-muted-foreground shrink-0">(opcional)</span>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={btn.works === true ? "default" : "outline"}
                    size="sm"
                    className={cn("flex-1 gap-1 h-8 text-xs", btn.works === true && "bg-primary")}
                    onClick={() => handleButtonToggle(btn.id, true)}
                  >
                    <Check className="w-3 h-3" />
                    OK
                  </Button>
                  <Button
                    variant={btn.works === false ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1 gap-1 h-8 text-xs"
                    onClick={() => handleButtonToggle(btn.id, false)}
                  >
                    <X className="w-3 h-3" />
                    Falha
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-3 mb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(testedCount / buttons.length) * 100}%` }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">
            {testedCount}/{buttons.length} testados
          </p>
        </div>

        {/* Hint */}
        <div className="bg-muted/50 rounded-lg p-2 mb-3">
          <p className="text-[10px] text-muted-foreground text-center">
            💡 Teste pelo menos Volume +, Volume - e Power
          </p>
        </div>
      </div>

      {/* Fixed Submit Buttons at bottom */}
      <div className="shrink-0 p-4 pt-2 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => handleSubmit(false)}
            disabled={!requiredButtonsTested}
          >
            <X className="w-4 h-4" />
            Problemas
          </Button>
          <Button className="flex-1 h-11 gap-2" onClick={() => handleSubmit(true)} disabled={!requiredButtonsTested}>
            <Check className="w-4 h-4" />
            Tudo OK
          </Button>
        </div>
      </div>
    </div>
  );
}
