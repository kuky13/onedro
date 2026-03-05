import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Play, Square, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AudioMicTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

type MicState = "idle" | "recording" | "recorded" | "playing" | "error";

export function AudioMicTest({ onPass, onFail, onSkip }: AudioMicTestProps) {
  const [state, setState] = useState<MicState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [maxLevel, setMaxLevel] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const smoothedLevelRef = useRef(0);

  // Smooth audio level visualization - optimized for fluidity
  const updateAudioLevel = useCallback(() => {
    const analyzer = analyzerRef.current;
    
    if (analyzer) {
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      analyzer.getByteFrequencyData(dataArray);

      // Calculate average level from frequency data (more responsive)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] ?? 0;
      }
      const average = sum / dataArray.length / 255;
      
      // Smooth the level for fluid animation (lerp)
      const smoothFactor = 0.3;
      smoothedLevelRef.current = smoothedLevelRef.current + (average - smoothedLevelRef.current) * smoothFactor;
      
      const level = Math.min(1, smoothedLevelRef.current * 2);
      setAudioLevel(level);
      setMaxLevel(prev => Math.max(prev, average));
    }

    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      streamRef.current = stream;
      smoothedLevelRef.current = 0;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 128; // Smaller for better performance
      analyzer.smoothingTimeConstant = 0.4;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      animationRef.current = requestAnimationFrame(updateAudioLevel);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") 
        ? "audio/webm" 
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/wav";
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setMaxLevel(0);
      setAudioLevel(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioUrlRef.current = URL.createObjectURL(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        analyzerRef.current = null;
        setAudioLevel(0);
        
        setState("recorded");
      };

      mediaRecorder.start(100);
      setState("recording");
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 100);
      }, 100);

      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      }, 5000);

    } catch (err) {
      console.error("Mic error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Permissão negada");
      } else {
        setError("Microfone indisponível");
      }
      setState("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const playRecording = () => {
    if (!audioUrlRef.current) return;

    const audio = new Audio(audioUrlRef.current);
    audioRef.current = audio;
    
    audio.onended = () => setState("recorded");
    audio.play();
    setState("playing");
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState("recorded");
  };

  const getQuality = () => {
    if (maxLevel < 0.05) return { label: "Muito baixo", ok: false };
    if (maxLevel < 0.15) return { label: "Baixo", ok: false };
    return { label: "OK", ok: true };
  };

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (state === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6">{error}</p>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" onClick={onSkip}>Pular</Button>
          <Button size="sm" onClick={() => { setState("idle"); setError(null); }}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const quality = getQuality();

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      {/* Waveform Visualizer */}
      <div className="relative mb-10">
        {/* Pulsing rings when recording */}
        {state === "recording" && (
          <>
            <div 
              className="absolute inset-0 rounded-full border-2 border-primary/30 -z-10"
              style={{ 
                transform: `scale(${1.2 + audioLevel * 0.4})`,
                opacity: 0.6 - audioLevel * 0.3,
                transition: 'transform 0.15s ease-out, opacity 0.15s ease-out'
              }}
            />
            <div 
              className="absolute inset-0 rounded-full border border-primary/20 -z-10"
              style={{ 
                transform: `scale(${1.5 + audioLevel * 0.6})`,
                opacity: 0.4 - audioLevel * 0.2,
                transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
              }}
            />
            <div 
              className="absolute inset-0 rounded-full border border-primary/10 -z-10"
              style={{ 
                transform: `scale(${1.8 + audioLevel * 0.8})`,
                opacity: 0.2,
                transition: 'transform 0.25s ease-out, opacity 0.25s ease-out'
              }}
            />
          </>
        )}

        <div className={cn(
          "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-200",
          state === "recording" ? "bg-primary/10 shadow-[0_0_30px_rgba(var(--primary),0.2)]" : "bg-muted/30"
        )}
        style={state === "recording" ? { 
          transform: `scale(${1 + audioLevel * 0.08})`,
          transition: 'transform 0.1s ease-out'
        } : undefined}
        >
          {state === "recording" ? (
            <div className="flex items-center justify-center gap-[3px]">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const center = 3;
                const dist = Math.abs(i - center);
                const baseHeight = 8;
                const wave = Math.sin((Date.now() / 200) + i * 0.5) * 3;
                const dynamicHeight = audioLevel * 48 * (1 - dist * 0.12) + wave;
                return (
                  <div 
                    key={i}
                    className="w-[3px] rounded-full bg-primary"
                    style={{ 
                      height: `${Math.max(baseHeight, baseHeight + dynamicHeight)}px`,
                      opacity: 0.6 + audioLevel * 0.4,
                      transition: 'height 0.06s ease-out',
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <Mic className={cn(
              "w-10 h-10",
              state === "playing" ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>
        
        {/* Glow effect when recording */}
        {state === "recording" && (
          <div 
            className="absolute inset-0 rounded-full bg-primary/25 blur-2xl -z-10"
            style={{ 
              opacity: 0.4 + audioLevel * 0.6,
              transform: `scale(${1.1 + audioLevel * 0.5})`,
              transition: 'opacity 0.1s ease-out, transform 0.1s ease-out'
            }}
          />
        )}
      </div>

      {/* Timer - minimal */}
      {state === "recording" && (
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="font-mono text-sm tabular-nums">
            {(recordingDuration / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* Quality indicator after recording */}
      {state === "recorded" && (
        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-medium mb-4",
          quality.ok ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
        )}>
          Nível: {quality.label}
        </div>
      )}

      {/* Title */}
      <h3 className="text-lg font-semibold mb-1">
        {state === "idle" && "Microfone"}
        {state === "recording" && "Gravando"}
        {state === "recorded" && "Pronto"}
        {state === "playing" && "Reproduzindo"}
      </h3>
      <p className="text-xs text-muted-foreground mb-8">
        {state === "idle" && "Grave até 5 segundos de áudio"}
        {state === "recording" && "Fale algo..."}
        {state === "recorded" && "Toque para ouvir a gravação"}
        {state === "playing" && "Ouvindo sua gravação..."}
      </p>

      {/* Actions */}
      {state === "idle" && (
        <Button size="lg" className="w-full max-w-xs gap-2" onClick={startRecording}>
          <Mic className="w-4 h-4" />
          Gravar
        </Button>
      )}

      {state === "recording" && (
        <Button size="lg" variant="destructive" className="w-full max-w-xs gap-2" onClick={stopRecording}>
          <Square className="w-4 h-4" />
          Parar
        </Button>
      )}

      {state === "recorded" && (
        <Button size="lg" variant="outline" className="w-full max-w-xs gap-2 mb-6" onClick={playRecording}>
          <Play className="w-4 h-4" />
          Reproduzir
        </Button>
      )}

      {state === "playing" && (
        <Button size="lg" variant="outline" className="w-full max-w-xs gap-2 mb-6" onClick={stopPlaying}>
          <Square className="w-4 h-4" />
          Parar
        </Button>
      )}

      {/* Result Buttons */}
      {(state === "recorded" || state === "playing") && (
        <div className="w-full max-w-xs">
          <p className="text-xs text-center text-muted-foreground mb-3">
            Funcionou corretamente?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 gap-2 text-destructive border-destructive/30"
              onClick={() => onFail({ recordingDuration, maxLevel: maxLevel.toFixed(2), quality: quality.label })}
            >
              <X className="w-4 h-4" />
              Não
            </Button>
            <Button
              className="h-11 gap-2"
              onClick={() => onPass({ recordingDuration, maxLevel: maxLevel.toFixed(2), quality: quality.label })}
            >
              <Check className="w-4 h-4" />
              Sim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
