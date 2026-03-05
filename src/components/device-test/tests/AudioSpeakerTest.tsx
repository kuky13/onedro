import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, Check, X, Play, Pause, Smartphone, Speaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioSpeakerTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

type SpeakerMode = "both" | "left" | "right";

const TOTAL_DURATION = 15;
const AUDIO_SRC = "/sounds/iphone-ringtone.m4a";

export function AudioSpeakerTest({ onPass, onFail }: AudioSpeakerTestProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [speakerMode, setSpeakerMode] = useState<SpeakerMode>("both");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const pannerRef = useRef<StereoPannerNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  

  const getPanValue = (mode: SpeakerMode): number => {
    switch (mode) {
      case "left": return -1;
      case "right": return 1;
      default: return 0;
    }
  };

  // Setup audio element once
  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Setup Web Audio panner (skip on iOS if StereoPanner unsupported)
  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sourceNodeRef.current) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      sourceNodeRef.current = source;

      if (typeof StereoPannerNode !== "undefined") {
        const panner = ctx.createStereoPanner();
        panner.pan.value = getPanValue(speakerMode);
        pannerRef.current = panner;
        source.connect(panner);
        panner.connect(ctx.destination);
      } else {
        // Fallback: no panning support
        source.connect(ctx.destination);
      }
    } catch (err) {
      console.warn("Web Audio setup failed, using direct playback:", err);
    }
  }, [speakerMode]);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      ensureAudioGraph();

      // Resume AudioContext (required on iOS after user gesture)
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      audio.currentTime = 0;
      await audio.play();

      startTimeRef.current = Date.now();
      setIsPlaying(true);
      setHasPlayed(true);

      // Auto-stop after duration
      playTimeoutRef.current = setTimeout(() => {
        stop();
        setProgress(1);
      }, TOTAL_DURATION * 1000);
    } catch (err) {
      console.error("Audio play error:", err);
    }
  };

  const stop = useCallback(() => {
    audioRef.current?.pause();

    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  const togglePlayPause = () => {
    if (isPlaying) {
      stop();
    } else {
      setProgress(0);
      play();
    }
  };

  // Update panner when speaker mode changes
  useEffect(() => {
    if (pannerRef.current) {
      pannerRef.current.pan.value = getPanValue(speakerMode);
    }
  }, [speakerMode]);

  // Progress animation
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setProgress(Math.min(1, elapsed / TOTAL_DURATION));
      if (elapsed < TOTAL_DURATION) {
        animationRef.current = requestAnimationFrame(tick);
      }
    };
    animationRef.current = requestAnimationFrame(tick);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying]);

  // Cleanup
  useEffect(() => {
    return () => {
      stop();
      audioContextRef.current?.close().catch(() => {});
    };
  }, [stop]);

  const speakerModes: { id: SpeakerMode; label: string; icon: string }[] = [
    { id: "left", label: "Esquerdo", icon: "🔈" },
    { id: "both", label: "Ambos", icon: "🔊" },
    { id: "right", label: "Direito", icon: "🔉" },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xs">
        {/* Visual Indicator */}
        <div className="relative mb-6">
          <div className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
            isPlaying ? "bg-primary/10" : "bg-muted/30"
          )}>
            {isPlaying ? (
              <Smartphone className="w-8 h-8 text-primary animate-pulse" />
            ) : (
              <Speaker className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          {isPlaying && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/15 blur-xl -z-10 animate-pulse" />
              <div className="absolute inset-[-8px] rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-[-16px] rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold mb-1">Teste de Alto-falante</h3>
        <p className="text-xs text-muted-foreground mb-4 text-center">
          Toque o som e verifique se está limpo e sem distorções
        </p>

        {/* Speaker Mode Selector */}
        <div className="w-full mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center mb-2 font-medium">
            Alto-falante
          </p>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-lg p-1">
            {speakerModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setSpeakerMode(mode.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-1 rounded-md text-xs transition-all",
                  speakerMode === mode.id
                    ? "bg-background shadow-sm font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{mode.icon}</span>
                <span className="text-[10px]">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100 ease-linear rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-mono">
            <span>{Math.floor(progress * TOTAL_DURATION)}s</span>
            <span>{TOTAL_DURATION}s</span>
          </div>
        </div>

        {/* Play/Pause Button */}
        <Button
          size="lg"
          variant={isPlaying ? "outline" : "default"}
          className="w-full gap-2 mb-3"
          onClick={togglePlayPause}
        >
          {isPlaying ? (
            <><Pause className="w-4 h-4" /> Parar</>
          ) : (
            <><Play className="w-4 h-4" /> {hasPlayed ? "Tocar Novamente" : "Tocar Toque"}</>
          )}
        </Button>

        {/* Volume hint */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-4">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Aumente o volume do dispositivo ao máximo</span>
        </div>
      </div>

      {/* Result Buttons */}
      <div className="w-full max-w-xs shrink-0 pt-2 pb-2">
        <p className="text-xs text-center text-muted-foreground mb-2">
          O som está claro e sem chiados?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 gap-2 text-destructive border-destructive/30"
            onClick={() => {
              stop();
              onFail({ hasPlayed, speakerMode, progress: Math.round(progress * 100) });
            }}
          >
            <X className="w-4 h-4" /> Não
          </Button>
          <Button
            className="h-11 gap-2"
            onClick={() => {
              stop();
              onPass({ hasPlayed, speakerMode, progress: Math.round(progress * 100) });
            }}
          >
            <Check className="w-4 h-4" /> Sim
          </Button>
        </div>
      </div>
    </div>
  );
}
