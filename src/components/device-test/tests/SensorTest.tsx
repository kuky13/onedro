import { useState, useEffect, useRef, useCallback } from "react";
import { Gauge, Check, RotateCcw, AlertCircle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SensorTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

interface SensorData {
  accelerometer: { x: number; y: number; z: number } | null;
  gyroscope: { alpha: number; beta: number; gamma: number } | null;
  proximity: { near: boolean; distance: number | null; method: string } | null;
}

type SensorPhase = "motion" | "proximity" | "complete";

export function SensorTest({ onPass, onSkip }: SensorTestProps) {
  const [sensorData, setSensorData] = useState<SensorData>({
    accelerometer: null,
    gyroscope: null,
    proximity: null,
  });
  const [hasMovement, setHasMovement] = useState(false);
  const [proximityTested, setProximityTested] = useState(false);
  const [proximitySupported, setProximitySupported] = useState<boolean | null>(null);
  const [proximityMethod, setProximityMethod] = useState<string>("none");
  const [phase, setPhase] = useState<SensorPhase>("motion");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [callSimulationActive, setCallSimulationActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  
  const movementCountRef = useRef(0);
  const proximityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Motion sensors setup
  useEffect(() => {
    let mounted = true;

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!mounted) return;

      const acc = e.accelerationIncludingGravity;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        setSensorData(prev => ({
          ...prev,
          accelerometer: { x: acc.x!, y: acc.y!, z: acc.z! },
        }));

        const totalAcceleration = Math.sqrt(acc.x! ** 2 + acc.y! ** 2 + acc.z! ** 2);
        if (Math.abs(totalAcceleration - 9.8) > 1) {
          movementCountRef.current++;
          if (movementCountRef.current > 10) {
            setHasMovement(true);
          }
        }
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!mounted) return;

      if (e.alpha !== null && e.beta !== null && e.gamma !== null) {
        setSensorData(prev => ({
          ...prev,
          gyroscope: { alpha: e.alpha!, beta: e.beta!, gamma: e.gamma! },
        }));
      }
    };

    const requestPermission = async () => {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== "granted") {
            setSupported(false);
            return;
          }
        } catch {
          setSupported(false);
          return;
        }
      }

      window.addEventListener("devicemotion", handleMotion);
      window.addEventListener("deviceorientation", handleOrientation);
      setSupported(true);
    };

    requestPermission();

    return () => {
      mounted = false;
      window.removeEventListener("devicemotion", handleMotion);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  // Simulated call for proximity test - simplified manual approach
  const startCallSimulation = useCallback(() => {
    setCallSimulationActive(true);
    setCallTimer(0);
    setProximitySupported(true);
    setProximityMethod("manual");

    // Play a subtle ringtone-like sound
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 500);
    } catch (e) {
      console.log("Audio not available");
    }

    // Timer for call duration
    proximityIntervalRef.current = setInterval(() => {
      setCallTimer(prev => prev + 1);
    }, 1000);
  }, []);

  const handleManualProximityConfirm = (works: boolean) => {
    setProximityTested(true);
    setSensorData(prev => ({
      ...prev,
      proximity: { 
        near: works, 
        distance: null,
        method: "manual-confirmation"
      },
    }));
  };

  const endCallSimulation = () => {
    setCallSimulationActive(false);
    if (proximityIntervalRef.current) {
      clearInterval(proximityIntervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (proximityIntervalRef.current) {
        clearInterval(proximityIntervalRef.current);
      }
    };
  }, []);

  const formatValue = (value: number) => value.toFixed(1);

  const handleContinueToProximity = () => {
    setPhase("proximity");
  };

  const handleComplete = () => {
    endCallSimulation();
    
    onPass({
      hasMovement,
      accelerometer: !!sensorData.accelerometer,
      gyroscope: !!sensorData.gyroscope,
      proximityTested,
      proximitySupported,
      proximityMethod,
      accelerometerValues: sensorData.accelerometer,
      gyroscopeValues: sensorData.gyroscope,
      proximityNear: sensorData.proximity?.near ?? null,
    });
  };

  if (supported === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-lg mb-2">Sensores Não Disponíveis</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Este dispositivo não suporta sensores de movimento ou a permissão foi negada
        </p>
        <Button onClick={onSkip}>Pular Teste</Button>
      </div>
    );
  }

  // Phase 1: Motion sensors
  if (phase === "motion") {
    return (
      <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
        {/* Visual Indicator */}
        <div className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center mb-4 transition-all",
          hasMovement ? "bg-primary/20" : "bg-muted"
        )}>
          <div className={cn(
            "w-18 h-18 rounded-full flex items-center justify-center",
            hasMovement ? "bg-primary" : "bg-muted-foreground/20"
          )}>
            <Gauge className={cn(
              "w-8 h-8",
              hasMovement ? "text-primary-foreground" : "text-muted-foreground"
            )} />
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold">Acelerômetro e Giroscópio</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {hasMovement 
              ? "Movimento detectado! ✓" 
              : "Mova o dispositivo em diferentes direções"
            }
          </p>
        </div>

        {/* Sensor Data */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-4">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">Acelerômetro</p>
            {sensorData.accelerometer ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">X:</span>
                  <span>{formatValue(sensorData.accelerometer.x)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Y:</span>
                  <span>{formatValue(sensorData.accelerometer.y)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Z:</span>
                  <span>{formatValue(sensorData.accelerometer.z)}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">Aguardando...</p>
            )}
          </div>

          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 text-center">Giroscópio</p>
            {sensorData.gyroscope ? (
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">α:</span>
                  <span>{formatValue(sensorData.gyroscope.alpha)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">β:</span>
                  <span>{formatValue(sensorData.gyroscope.beta)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">γ:</span>
                  <span>{formatValue(sensorData.gyroscope.gamma)}°</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground">Aguardando...</p>
            )}
          </div>
        </div>

        {/* Status */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full mb-6",
          hasMovement ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {hasMovement ? (
            <>
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Sensores de movimento OK</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Aguardando movimento...</span>
            </>
          )}
        </div>

        {/* Action Button */}
        <Button
          size="lg"
          className="w-full max-w-xs h-12 gap-3"
          onClick={handleContinueToProximity}
          disabled={!hasMovement && !sensorData.accelerometer && !sensorData.gyroscope}
        >
          Próximo: Sensor de Proximidade
        </Button>

        {!hasMovement && (
          <Button
            variant="ghost"
            className="mt-2"
            onClick={onSkip}
          >
            Pular este teste
          </Button>
        )}
      </div>
    );
  }

  // Phase 2: Proximity sensor with call simulation - simplified manual approach
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      {!callSimulationActive ? (
        <>
          {/* Phone icon */}
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="w-10 h-10 text-primary" />
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold">Teste de Proximidade</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-xs">
              Vamos testar se o sensor de proximidade funciona corretamente durante ligações.
            </p>
          </div>

          {/* Start button */}
          <Button
            size="lg"
            className="w-full max-w-xs h-14 gap-3"
            onClick={startCallSimulation}
          >
            <Phone className="w-5 h-5" />
            Iniciar Teste
          </Button>

          <Button
            variant="ghost"
            className="mt-2"
            onClick={onSkip}
          >
            Pular este teste
          </Button>
        </>
      ) : (
        <>
          {/* Call simulation UI */}
          <div className="w-full max-w-xs">
            {/* Call header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center bg-primary animate-pulse">
                <Phone className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="text-lg font-medium">Teste de Proximidade</p>
              <p className="text-sm text-muted-foreground font-mono">
                {String(Math.floor(callTimer / 60)).padStart(2, '0')}:{String(callTimer % 60).padStart(2, '0')}
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-center text-muted-foreground mb-2">
                <strong>Como testar:</strong>
              </p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Faça uma ligação real para outro número</li>
                <li>Aproxime o celular do ouvido</li>
                <li>Verifique se a tela apaga automaticamente</li>
                <li>Afaste o celular e veja se a tela volta</li>
              </ol>
            </div>

            {/* Manual confirmation */}
            {!proximityTested ? (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-center font-medium">
                  O sensor de proximidade funciona?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2"
                    onClick={() => handleManualProximityConfirm(false)}
                  >
                    <X className="w-4 h-4 text-destructive" />
                    Não Funciona
                  </Button>
                  <Button
                    size="lg"
                    className="h-12 gap-2"
                    onClick={() => handleManualProximityConfirm(true)}
                  >
                    <Check className="w-4 h-4" />
                    Funciona
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-primary/10 rounded-xl p-4 mb-6 text-center">
                <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Resposta registrada!</p>
              </div>
            )}

            {/* Complete Button */}
            <Button
              size="lg"
              className="w-full h-12 gap-3"
              onClick={handleComplete}
              variant={proximityTested ? "default" : "outline"}
            >
              <Check className="w-5 h-5" />
              {proximityTested ? "Concluir Teste" : "Finalizar sem testar"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
