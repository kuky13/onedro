import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Check, X, AlertCircle, RefreshCw, Zap, ZapOff, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CameraTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
  facing: "user" | "environment";
}

interface CameraDevice {
  deviceId: string;
  label: string;
  facing: "user" | "environment" | undefined;
}

type CameraState = "idle" | "starting" | "streaming" | "captured" | "error" | "manual";

export function CameraTest({ onPass, onFail, onSkip, facing }: CameraTestProps) {
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);
  const [flashTested, setFlashTested] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);

  const cameraLabel = facing === "user" ? "Frontal" : "Traseira";

  // Cleanup function
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      streamRef.current = null;
    }
    trackRef.current = null;
    
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.oncanplay = null;
      videoRef.current.onerror = null;
      videoRef.current.srcObject = null;
    }
  }, []);

  // Enumerate all available cameras
  const enumerateCameras = useCallback(async () => {
    try {
      // First get permission with a simple request
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());

      // Wait a bit for the stream to fully release
      await new Promise(resolve => setTimeout(resolve, 100));

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === "videoinput");
      
      const cameras: CameraDevice[] = videoDevices.map((device, index) => {
        const label = device.label || `Câmera ${index + 1}`;
        const lowerLabel = label.toLowerCase();
        
        // Better detection for back cameras
        const isBack = lowerLabel.includes("back") || 
                       lowerLabel.includes("traseira") ||
                       lowerLabel.includes("rear") ||
                       lowerLabel.includes("environment") ||
                       lowerLabel.includes("facing back") ||
                       lowerLabel.includes("camera2 0") ||
                       lowerLabel.includes("camera 0");
                       
        const isFront = lowerLabel.includes("front") || 
                        lowerLabel.includes("frontal") ||
                        lowerLabel.includes("user") ||
                        lowerLabel.includes("selfie") ||
                        lowerLabel.includes("facing front") ||
                        lowerLabel.includes("camera2 1") ||
                        lowerLabel.includes("camera 1");
        
        return {
          deviceId: device.deviceId,
          label: label,
          facing: isBack ? "environment" as const : isFront ? "user" as const : undefined,
        };
      });

      if (!mountedRef.current) return [];

      setAvailableCameras(cameras);
      
      // Find matching camera for the requested facing
      let defaultCamera = cameras.find(cam => cam.facing === facing);
      
      // If not found by label, use position-based heuristic
      if (!defaultCamera && cameras.length > 1) {
        // Usually back camera is last on Android, first on some devices
        defaultCamera = facing === "environment" ? cameras[cameras.length - 1] : cameras[0];
      } else if (!defaultCamera && cameras.length === 1) {
        defaultCamera = cameras[0];
      }
      
      if (defaultCamera) {
        setSelectedCamera(defaultCamera);
      }
      
      return cameras;
    } catch (err) {
      console.error("Error enumerating cameras:", err);
      if (mountedRef.current) {
        setState("manual");
      }
      return [];
    }
  }, [facing]);

  const startCamera = useCallback(async (deviceId?: string) => {
    // Prevent concurrent starts
    if (startingRef.current) {
      console.log("Camera start already in progress");
      return;
    }
    
    startingRef.current = true;
    
    try {
      setState("starting");
      setError(null);
      setFlashEnabled(false);
      setFlashSupported(false);

      // Complete cleanup of existing stream
      cleanupStream();

      // Wait for hardware to release
      await new Promise(resolve => setTimeout(resolve, 300));

      if (!mountedRef.current) {
        startingRef.current = false;
        return;
      }

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Helper to try getting stream with specific constraints
      const tryGetStream = async (constraints: MediaStreamConstraints): Promise<MediaStream | null> => {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.log("Stream attempt failed:", constraints, lastError.message);
          return null;
        }
      };

      // Strategy: Try multiple approaches in order of preference
      if (deviceId) {
        // Approach 1: Exact deviceId
        stream = await tryGetStream({
          video: { deviceId: { exact: deviceId } },
          audio: false,
        });
        
        // Approach 2: deviceId without exact (more lenient)
        if (!stream) {
          await new Promise(resolve => setTimeout(resolve, 100));
          stream = await tryGetStream({
            video: { deviceId: deviceId },
            audio: false,
          });
        }
      }

      // Approach 3: Use facingMode (iOS Safari prefers this)
      if (!stream) {
        const facingMode = facing === "user" ? "user" : "environment";
        await new Promise(resolve => setTimeout(resolve, 100));
        // iOS Safari works better with exact facingMode
        stream = await tryGetStream({
          video: { facingMode: { exact: facingMode } },
          audio: false,
        });
      }
      
      // Approach 3b: facingMode with ideal (fallback)
      if (!stream) {
        const facingMode = facing === "user" ? "user" : "environment";
        await new Promise(resolve => setTimeout(resolve, 100));
        stream = await tryGetStream({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      }

      // Approach 4: Just any video
      if (!stream) {
        await new Promise(resolve => setTimeout(resolve, 100));
        stream = await tryGetStream({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw lastError || new Error("Não foi possível acessar a câmera");
      }

      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        startingRef.current = false;
        return;
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      
      if (!videoTrack) {
        throw new Error("Nenhuma trilha de vídeo encontrada");
      }
      
      trackRef.current = videoTrack;

      // Get resolution
      const settings = videoTrack.getSettings();
      if (settings.width && settings.height) {
        setResolution({ width: settings.width, height: settings.height });
      }

      // Check for flash/torch support (more robust check)
      try {
        const capabilities = videoTrack.getCapabilities?.() as any;
        if (capabilities) {
          const hasTorch = capabilities.torch === true || 
                          (Array.isArray(capabilities.torch) && capabilities.torch.includes(true));
          const hasFlash = capabilities.fillLightMode && 
                          Array.isArray(capabilities.fillLightMode) && 
                          capabilities.fillLightMode.includes("flash");
          
          if (hasTorch || hasFlash) {
            setFlashSupported(true);
          }
        }
      } catch {
        // Flash detection failed, continue
      }
      
      // Setup video element
      if (videoRef.current && streamRef.current && mountedRef.current) {
        const video = videoRef.current;
        const currentStream = stream;
        
        // Reset handlers
        video.onloadedmetadata = null;
        video.oncanplay = null;
        video.onerror = null;
        
        // Configure video
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = currentStream;
        
        // Single handler for play - use loadeddata which is more reliable
        let playAttempted = false;
        
        const attemptPlay = async () => {
          if (playAttempted || !mountedRef.current) return;
          playAttempted = true;
          
          try {
            // Verify stream is still valid
            if (video.srcObject !== currentStream || streamRef.current !== currentStream) {
              return;
            }
            
            await video.play();
            
            if (mountedRef.current) {
              setState("streaming");
            }
          } catch (playError) {
            if (playError instanceof Error) {
              const msg = playError.message.toLowerCase();
              // Ignore abort/interrupt errors - they're normal when switching cameras
              if (!msg.includes("interrupted") && !msg.includes("abort") && !msg.includes("request was interrupted")) {
                console.error("Play error:", playError);
                // One retry after delay
                setTimeout(async () => {
                  if (!mountedRef.current || video.srcObject !== currentStream) return;
                  try {
                    await video.play();
                    if (mountedRef.current) {
                      setState("streaming");
                    }
                  } catch {
                    // Final failure - but don't show error if stream changed
                    if (mountedRef.current && streamRef.current === currentStream) {
                      setError("Não foi possível reproduzir o vídeo da câmera");
                      setState("error");
                    }
                  }
                }, 200);
              }
            }
          }
        };

        video.onloadeddata = attemptPlay;
        
        // Fallback timeout in case events don't fire
        setTimeout(() => {
          if (!playAttempted && mountedRef.current && video.srcObject === currentStream) {
            attemptPlay();
          }
        }, 500);
      }
    } catch (err) {
      console.error("Camera error:", err);
      
      if (!mountedRef.current) {
        startingRef.current = false;
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      
      // Categorize errors for better UX
      if (errorMessage.includes("NotAllowedError") || errorMessage.includes("Permission")) {
        setError("Permissão para acessar a câmera foi negada. Verifique as configurações do navegador.");
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("not found") || errorMessage.includes("Requested device not found")) {
        setError(`Câmera ${cameraLabel.toLowerCase()} não encontrada neste dispositivo.`);
      } else if (errorMessage.includes("NotReadableError") || errorMessage.includes("Could not start video source") || errorMessage.includes("Starting videoinput failed")) {
        setError(`A câmera ${cameraLabel.toLowerCase()} está ocupada ou inacessível. Feche outros apps que usam a câmera.`);
      } else if (errorMessage.includes("OverconstrainedError") || errorMessage.includes("Could not satisfy")) {
        setError(`Configuração de câmera não suportada. Tente outra câmera.`);
      } else {
        setError(`Erro ao acessar a câmera: ${errorMessage}`);
      }
      setState("error");
    } finally {
      startingRef.current = false;
    }
  }, [facing, cameraLabel, cleanupStream]);

  const toggleFlash = async () => {
    if (!trackRef.current || !flashSupported) return;

    const newFlashState = !flashEnabled;

    try {
      // Try torch constraint first (most widely supported)
      await trackRef.current.applyConstraints({
        advanced: [{ torch: newFlashState } as MediaTrackConstraintSet]
      });
      setFlashEnabled(newFlashState);
      setFlashTested(true);
    } catch {
      // Fallback: try fillLightMode
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ fillLightMode: newFlashState ? "flash" : "off" } as MediaTrackConstraintSet]
        });
        setFlashEnabled(newFlashState);
        setFlashTested(true);
      } catch (err) {
        console.error("Flash toggle error:", err);
        // Flash doesn't work - disable the button
        setFlashSupported(false);
      }
    }
  };

  const handleCameraSelect = async (camera: CameraDevice) => {
    if (camera.deviceId === selectedCamera?.deviceId) return;
    
    // Stop everything first
    cleanupStream();
    setCapturedImage(null);
    setFlashEnabled(false);
    setFlashSupported(false);
    setState("idle");
    
    // Update selected camera
    setSelectedCamera(camera);
    
    // Wait for cleanup then start
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (mountedRef.current) {
      startCamera(camera.deviceId);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || state !== "streaming") return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.85);
      setCapturedImage(imageData);
      
      // Turn off flash after capture
      if (flashEnabled && trackRef.current) {
        try {
          trackRef.current.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
        } catch {
          // Ignore
        }
      }
      
      cleanupStream();
      setState("captured");
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setFlashEnabled(false);
    setState("idle");
    
    // Small delay then restart
    setTimeout(() => {
      if (mountedRef.current && selectedCamera) {
        startCamera(selectedCamera.deviceId);
      }
    }, 100);
  };

  const switchToManual = () => {
    cleanupStream();
    setState("manual");
  };

  const handleManualResult = (works: boolean) => {
    if (works) {
      onPass({ facing, mode: "manual", manualConfirmation: true });
    } else {
      onFail({ facing, mode: "manual", manualConfirmation: true });
    }
  };

  // Initialize cameras on mount
  useEffect(() => {
    mountedRef.current = true;
    
    const init = async () => {
      const cameras = await enumerateCameras();
      if (mountedRef.current && cameras.length > 0) {
        setIsInitialized(true);
      }
    };
    
    init();
    
    return () => {
      mountedRef.current = false;
      cleanupStream();
    };
  }, [enumerateCameras, cleanupStream]);

  // Start camera when selected camera changes (after initialization)
  useEffect(() => {
    if (isInitialized && selectedCamera && state === "idle" && !capturedImage && mountedRef.current) {
      startCamera(selectedCamera.deviceId);
    }
  }, [isInitialized, selectedCamera]); // Intentionally limited deps to prevent loops

  // Manual test mode
  if (state === "manual") {
    return (
      <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
        </div>

        <h3 className="font-bold text-lg mb-2">Teste Manual da Câmera {cameraLabel}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">
          O navegador não permitiu acesso à câmera
        </p>

        <div className="bg-muted/50 rounded-2xl p-5 mb-6 max-w-xs w-full">
          <h4 className="font-medium text-sm mb-4 text-center">
            Como testar a câmera:
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Abra o app de Câmera</p>
                <p className="text-xs text-muted-foreground">
                  Use o app nativo do celular
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">
                  {facing === "user" ? "Ative a câmera frontal" : "Use a câmera traseira"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique se a imagem está nítida
                </p>
              </div>
            </div>

            {facing === "environment" && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Teste o flash</p>
                  <p className="text-xs text-muted-foreground">
                    Tire uma foto com flash ativado
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          A câmera {cameraLabel.toLowerCase()} funciona?
        </p>

        <div className="flex gap-3 w-full max-w-xs">
          <Button
            variant="outline"
            className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => handleManualResult(false)}
          >
            <X className="w-5 h-5" />
            Não Funciona
          </Button>
          <Button
            className="flex-1 h-12 gap-2"
            onClick={() => handleManualResult(true)}
          >
            <Check className="w-5 h-5" />
            Funciona
          </Button>
        </div>

        <Button variant="ghost" className="mt-3" onClick={onSkip}>
          Pular este teste
        </Button>
      </div>
    );
  }

  // Error state with manual option
  if (state === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="font-bold text-lg mb-2">Erro na Câmera {cameraLabel}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{error}</p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button onClick={() => startCamera(selectedCamera?.deviceId)}>
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={switchToManual}>
            Fazer Teste Manual
          </Button>
          <Button variant="ghost" onClick={onSkip}>
            Pular Teste
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="text-center p-4">
        <h3 className="font-bold">Câmera {cameraLabel}</h3>
        <p className="text-sm text-muted-foreground">
          {state === "streaming" && "Tire uma foto para testar"}
          {state === "captured" && "A foto ficou boa?"}
          {(state === "idle" || state === "starting") && "Iniciando câmera..."}
        </p>
        {resolution && state === "streaming" && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            {resolution.width}x{resolution.height}
          </p>
        )}
      </div>

      {/* Camera Selector */}
      {availableCameras.length > 1 && state === "streaming" && (
        <div className="px-4 pb-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Camera className="w-4 h-4" />
                {selectedCamera?.label || "Selecionar câmera"}
                <ChevronDown className="w-4 h-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full min-w-[200px]">
              {availableCameras.map((camera, index) => (
                <DropdownMenuItem
                  key={camera.deviceId}
                  onClick={() => handleCameraSelect(camera)}
                  className={cn(selectedCamera?.deviceId === camera.deviceId && "bg-primary/10")}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  <span className="flex-1 truncate">{camera.label || `Câmera ${index + 1}`}</span>
                  {camera.facing === "user" && <span className="text-xs text-muted-foreground ml-2">Frontal</span>}
                  {camera.facing === "environment" && <span className="text-xs text-muted-foreground ml-2">Traseira</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Camera View / Captured Image */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {state !== "captured" && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover", facing === "user" && "scale-x-[-1]")}
            style={{ WebkitTransform: facing === "user" ? "scaleX(-1)" : undefined }}
          />
        )}

        {state === "captured" && capturedImage && (
          <img
            src={capturedImage}
            alt="Captured"
            className={cn("w-full h-full object-cover", facing === "user" && "scale-x-[-1]")}
          />
        )}

        {(state === "idle" || state === "starting") && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Camera className="w-12 h-12 animate-pulse text-muted-foreground" />
          </div>
        )}

        {flashEnabled && state === "streaming" && (
          <div className="absolute top-4 left-4 bg-amber-500 px-3 py-1 rounded-full flex items-center gap-2">
            <Zap className="w-4 h-4 text-black" />
            <span className="text-xs font-medium text-black">Flash Ligado</span>
          </div>
        )}

        {/* Shutter button overlay - native camera style */}
        {state === "streaming" && (
          <div className="absolute bottom-0 left-0 right-0 pb-6 pt-4 flex items-center justify-center gap-6"
               style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
            {/* Flash toggle (left) */}
            {facing === "environment" ? (
              <button
                onClick={toggleFlash}
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                  flashEnabled ? "bg-amber-500 text-black" : "bg-white/20 backdrop-blur-sm text-white"
                )}
              >
                {flashEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
              </button>
            ) : (
              <div className="w-12" /> 
            )}

            {/* Shutter button (center) - circular like native camera */}
            <button
              onClick={capturePhoto}
              className="w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center active:scale-90 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="w-[60px] h-[60px] rounded-full bg-white" />
            </button>

            {/* Manual test shortcut (right) */}
            <button
              onClick={switchToManual}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Controls - only for captured state */}
      {state === "captured" && (
        <div className="p-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}>
          <Button variant="outline" size="lg" className="w-full h-12 gap-3" onClick={retake}>
            <RefreshCw className="w-5 h-5" /> Tirar Outra
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => onFail({ 
                facing, mode: "auto", hasCapturedImage: true, resolution, flashUsed: flashTested,
                selectedCamera: selectedCamera?.label, availableCameras: availableCameras.length,
              })}
            >
              <X className="w-5 h-5" /> Problema
            </Button>
            <Button
              className="flex-1 h-12 gap-2"
              onClick={() => onPass({ 
                facing, mode: "auto", hasCapturedImage: true, resolution, flashUsed: flashTested,
                selectedCamera: selectedCamera?.label, availableCameras: availableCameras.length,
              })}
            >
              <Check className="w-5 h-5" /> OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
