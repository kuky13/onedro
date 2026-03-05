import { useState, useEffect } from "react";
import { Battery, BatteryCharging, BatteryWarning, Check, X, Zap, Plug, AlertTriangle, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BatteryTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

interface BatteryInfo {
  level: number;
  charging: boolean;
}

type TestMode = "detecting" | "auto" | "manual";
type TestStep = "initial" | "charger_test" | "result";

export function BatteryTest({ onPass, onFail, onSkip }: BatteryTestProps) {
  const [mode, setMode] = useState<TestMode>("detecting");
  const [step, setStep] = useState<TestStep>("initial");
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null);
  const [initialCharging, setInitialCharging] = useState<boolean | null>(null);
  const [chargerWorking, setChargerWorking] = useState<boolean | null>(null);
  const [manualLevel, setManualLevel] = useState<number | null>(null);
  const [manualCharging, setManualCharging] = useState<boolean | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    const getBatteryInfo = async () => {
      if (!("getBattery" in navigator)) {
        setMode("manual");
        return;
      }

      try {
        const battery = await (navigator as any).getBattery();
        setMode("auto");

        const updateInfo = () => {
          const level = Math.round(battery.level * 100);
          const charging = battery.charging;
          setBatteryInfo({ level, charging });
          
          // Store initial charging state
          if (initialCharging === null) {
            setInitialCharging(charging);
          }
        };

        updateInfo();

        battery.addEventListener("levelchange", updateInfo);
        battery.addEventListener("chargingchange", updateInfo);

        cleanup = () => {
          battery.removeEventListener("levelchange", updateInfo);
          battery.removeEventListener("chargingchange", updateInfo);
        };
      } catch {
        setMode("manual");
      }
    };

    setTimeout(getBatteryInfo, 500);
    
    return () => { if (cleanup) cleanup(); };
  }, [initialCharging]);

  const handleManualSubmit = () => {
    onPass({
      mode: "manual",
      level: manualLevel,
      charging: manualCharging,
      chargerTested: true,
      manualConfirmation: true,
    });
  };

  const handleChargerResult = (works: boolean) => {
    setChargerWorking(works);
    setStep("result");
  };

  const handleFinalResult = () => {
    if (chargerWorking === false) {
      onFail({
        mode: mode,
        level: batteryInfo?.level || manualLevel,
        charging: batteryInfo?.charging || manualCharging,
        chargerWorking: false,
        issue: "charger_not_working",
      });
    } else {
      onPass({
        mode: mode,
        level: batteryInfo?.level || manualLevel,
        charging: batteryInfo?.charging || manualCharging,
        chargerWorking: true,
      });
    }
  };

  const getBatteryIcon = () => {
    if (!batteryInfo) return Battery;
    if (batteryInfo.charging) return BatteryCharging;
    if (batteryInfo.level < 20) return BatteryWarning;
    return Battery;
  };

  const getBatteryColor = () => {
    if (!batteryInfo) return "text-muted-foreground";
    if (batteryInfo.charging) return "text-primary";
    if (batteryInfo.level < 20) return "text-destructive";
    if (batteryInfo.level < 50) return "text-amber-500";
    return "text-primary";
  };

  // Detecting state
  if (mode === "detecting") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <Battery className="w-12 h-12 animate-pulse text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Verificando suporte à bateria...</p>
      </div>
    );
  }

  // Manual mode (iOS Safari)
  if (mode === "manual") {
    return (
      <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>

        <h3 className="font-bold text-lg mb-2">Verificação Manual de Bateria</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Este navegador não permite acesso automático à bateria
        </p>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-2xl p-5 mb-6 max-w-xs w-full">
          <h4 className="font-medium text-sm mb-4 text-center">
            Como verificar:
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Veja o nível de bateria</p>
                <p className="text-xs text-muted-foreground">No ícone superior ou em Ajustes</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Conecte o carregador</p>
                <p className="text-xs text-muted-foreground">Verifique se reconhece o carregamento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Level Input */}
        <div className="w-full max-w-xs mb-4">
          <p className="text-sm font-medium mb-2">Nível atual da bateria:</p>
          <div className="grid grid-cols-5 gap-2">
            {[20, 40, 60, 80, 100].map(level => (
              <Button
                key={level}
                variant={manualLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setManualLevel(level)}
              >
                {level}%
              </Button>
            ))}
          </div>
        </div>

        {/* Charging Status */}
        <div className="w-full max-w-xs mb-6">
          <p className="text-sm font-medium mb-2">O carregador funciona?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={manualCharging === true ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => setManualCharging(true)}
            >
              <Plug className="w-4 h-4" />
              Sim, carrega
            </Button>
            <Button
              variant={manualCharging === false ? "outline" : "outline"}
              size="sm"
              className={cn("gap-2", manualCharging === false && "border-destructive text-destructive")}
              onClick={() => setManualCharging(false)}
            >
              <X className="w-4 h-4" />
              Não carrega
            </Button>
          </div>
        </div>

        {/* Submit */}
        <Button
          size="lg"
          className="w-full max-w-xs h-12 gap-3"
          onClick={handleManualSubmit}
          disabled={manualLevel === null || manualCharging === null}
        >
          <Check className="w-5 h-5" />
          Confirmar
        </Button>

        <Button variant="ghost" className="mt-3" onClick={onSkip}>
          Pular este teste
        </Button>
      </div>
    );
  }

  // Auto mode - Loading
  if (!batteryInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <Battery className="w-12 h-12 animate-pulse text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Obtendo informações da bateria...</p>
      </div>
    );
  }

  const BatteryIcon = getBatteryIcon();

  // Step: Charger Test
  if (step === "charger_test") {
    return (
      <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all",
          batteryInfo.charging 
            ? "bg-primary/20 ring-4 ring-primary/30" 
            : "bg-muted"
        )}>
          <div className="relative">
            <PlugZap className={cn(
              "w-12 h-12 transition-colors",
              batteryInfo.charging ? "text-primary" : "text-muted-foreground"
            )} />
            {batteryInfo.charging && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center animate-pulse">
                <Zap className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>

        <h3 className="font-bold text-lg mb-2">Teste do Carregador</h3>
        
        {/* Status atual */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full mb-4",
          batteryInfo.charging ? "bg-primary/10" : "bg-muted"
        )}>
          {batteryInfo.charging ? (
            <>
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Carregando ({batteryInfo.level}%)</span>
            </>
          ) : (
            <>
              <Battery className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Não está carregando ({batteryInfo.level}%)</span>
            </>
          )}
        </div>

        <div className="bg-muted/50 rounded-2xl p-5 mb-6 max-w-xs w-full">
          <h4 className="font-medium text-sm mb-4 text-center">
            {batteryInfo.charging ? "O carregador foi detectado!" : "Conecte um carregador:"}
          </h4>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-muted-foreground">
                {batteryInfo.charging 
                  ? "Verifique se o ícone de carregamento aparece"
                  : "Conecte o cabo de carregamento ao aparelho"}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-muted-foreground">
                {batteryInfo.charging 
                  ? "Confirme se o nível de bateria está subindo"
                  : "Aguarde alguns segundos para detectar"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          O carregador está funcionando?
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => handleChargerResult(false)}
          >
            <X className="w-5 h-5" />
            Não
          </Button>
          <Button
            className="flex-1 h-12 gap-2"
            onClick={() => handleChargerResult(true)}
          >
            <Check className="w-5 h-5" />
            Sim
          </Button>
        </div>

        <Button variant="ghost" className="mt-3" onClick={onSkip}>
          Pular este teste
        </Button>
      </div>
    );
  }

  // Step: Result
  if (step === "result") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center mb-6",
          chargerWorking ? "bg-primary/20" : "bg-destructive/20"
        )}>
          {chargerWorking ? (
            <Check className="w-12 h-12 text-primary" />
          ) : (
            <X className="w-12 h-12 text-destructive" />
          )}
        </div>

        <h3 className="font-bold text-lg mb-2">
          {chargerWorking ? "Bateria e Carregador OK" : "Problema no Carregador"}
        </h3>
        
        <p className="text-sm text-muted-foreground text-center mb-6">
          {chargerWorking 
            ? `Nível atual: ${batteryInfo.level}% - Carregador funcionando`
            : `O carregador não está funcionando corretamente`
          }
        </p>

        <Button
          size="lg"
          className="w-full max-w-xs h-12 gap-3"
          onClick={handleFinalResult}
        >
          <Check className="w-5 h-5" />
          Confirmar Resultado
        </Button>
      </div>
    );
  }

  // Initial step - Show battery info and prompt to test charger
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      {/* Battery Visual */}
      <div className={cn(
        "w-24 h-24 rounded-full flex items-center justify-center mb-6",
        batteryInfo.charging ? "bg-primary/10" : "bg-muted"
      )}>
        <div className="relative">
          <BatteryIcon className={cn("w-12 h-12", getBatteryColor())} />
          {batteryInfo.charging && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Battery Level */}
      <div className="text-center mb-4">
        <span className={cn("text-5xl font-bold", getBatteryColor())}>
          {batteryInfo.level}%
        </span>
        <p className="text-sm text-muted-foreground mt-2">
          {batteryInfo.charging ? "Carregando" : "Na bateria"}
        </p>
      </div>

      {/* Battery Bar */}
      <div className="w-full max-w-xs mb-6">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              batteryInfo.level < 20 && "bg-destructive",
              batteryInfo.level >= 20 && batteryInfo.level < 50 && "bg-amber-500",
              batteryInfo.level >= 50 && "bg-primary"
            )}
            style={{ width: `${batteryInfo.level}%` }}
          />
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-muted/50 rounded-xl p-4 max-w-xs w-full mb-6">
        <div className="flex items-center justify-center gap-3">
          {batteryInfo.charging ? (
            <>
              <Plug className="w-5 h-5 text-primary" />
              <span className="font-medium">Conectado ao carregador</span>
            </>
          ) : (
            <>
              <Battery className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">Usando bateria</span>
            </>
          )}
        </div>
      </div>

      {/* Next Step Button */}
      <Button
        size="lg"
        className="w-full max-w-xs h-12 gap-3"
        onClick={() => setStep("charger_test")}
      >
        <PlugZap className="w-5 h-5" />
        Testar Carregador
      </Button>

      <Button variant="ghost" className="mt-3" onClick={onSkip}>
        Pular este teste
      </Button>
    </div>
  );
}
