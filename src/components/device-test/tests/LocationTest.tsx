import { useState, useEffect } from "react";
import { MapPin, Check, X, Loader2, Navigation, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LocationTestProps {
  onPass: (details?: Record<string, any>) => void;
  onFail: (details?: Record<string, any>) => void;
  onSkip: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  city?: string;
  neighborhood?: string;
  state?: string;
  country?: string;
}

type LocationState = "idle" | "requesting" | "success" | "error";

export function LocationTest({ onPass, onFail, onSkip }: LocationTestProps) {
  const [state, setState] = useState<LocationState>("idle");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste dispositivo");
      setState("error");
      return;
    }

    setState("requesting");

    // Reverse geocoding function
    const reverseGeocode = async (lat: number, lon: number): Promise<Partial<LocationData>> => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
          { headers: { 'Accept-Language': 'pt-BR' } }
        );
        const data = await response.json();
        
        if (data.address) {
          return {
            city: data.address.city || data.address.town || data.address.municipality || data.address.village,
            neighborhood: data.address.suburb || data.address.neighbourhood || data.address.district,
            state: data.address.state,
            country: data.address.country,
          };
        }
      } catch (e) {
        console.log("Reverse geocoding failed:", e);
      }
      return {};
    };

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const geoData = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        
        const data: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed,
          timestamp: position.timestamp,
          ...geoData,
        };
        setLocation(data);
        setState("success");
      },
      (err) => {
        console.error("Location error:", err);
        let errorMessage = "Erro ao obter localização";
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = "Permissão de localização negada";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = "Localização indisponível";
            break;
          case err.TIMEOUT:
            errorMessage = "Tempo esgotado ao buscar localização";
            break;
        }
        
        setError(errorMessage);
        setState("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
  };

  const handleConfirm = (works: boolean) => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    if (works && location) {
      onPass({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        heading: location.heading,
        speed: location.speed,
        city: location.city,
        neighborhood: location.neighborhood,
        state: location.state,
        gpsWorking: true,
      });
    } else {
      onFail({
        error: error || "GPS não funcionou corretamente",
        gpsWorking: false,
      });
    }
  };

  const getAccuracyLabel = (accuracy: number): { label: string; color: string } => {
    if (accuracy <= 10) return { label: "Excelente", color: "text-green-500" };
    if (accuracy <= 30) return { label: "Boa", color: "text-green-400" };
    if (accuracy <= 100) return { label: "Moderada", color: "text-amber-500" };
    return { label: "Baixa", color: "text-red-500" };
  };

  if (state === "error") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0 overflow-y-auto">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="font-bold text-lg mb-2">Erro de Localização</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onSkip}>
            Pular Teste
          </Button>
          <Button onClick={() => { setState("idle"); setError(null); }}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 min-h-0 overflow-y-auto">
      {/* Visual Indicator */}
      <div className={cn(
        "relative w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
        state === "success" ? "bg-green-500/10" : "bg-muted/50"
      )}>
        {/* Pulse rings for requesting state */}
        {state === "requesting" && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/15 animate-ping animation-delay-200" />
            <div className="absolute inset-4 rounded-full bg-primary/10 animate-ping animation-delay-400" />
          </>
        )}
        
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-all z-10",
          state === "success" ? "bg-green-500" : state === "requesting" ? "bg-primary" : "bg-muted-foreground/20"
        )}>
          {state === "requesting" ? (
            <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
          ) : state === "success" ? (
            <Navigation className="w-10 h-10 text-white" />
          ) : (
            <MapPin className="w-10 h-10 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold">
          {state === "idle" && "Teste de GPS"}
          {state === "requesting" && "Buscando localização..."}
          {state === "success" && "Localização encontrada!"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {state === "idle" && "Verifique se o GPS está funcionando"}
          {state === "requesting" && "Aguarde enquanto obtemos sua posição"}
          {state === "success" && "O GPS está funcionando corretamente"}
        </p>
      </div>

      {/* Location Data */}
      {state === "success" && location && (
        <div className="w-full max-w-xs bg-muted/30 rounded-2xl p-4 mb-6 space-y-3">
          {/* City & Neighborhood */}
          {(location.city || location.neighborhood) && (
            <div className="bg-primary/10 rounded-xl p-3 text-center border border-primary/20">
              <div className="flex items-center justify-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Localização</span>
              </div>
              <p className="font-semibold text-base">
                {location.neighborhood && <span>{location.neighborhood}</span>}
                {location.neighborhood && location.city && <span>, </span>}
                {location.city && <span>{location.city}</span>}
              </p>
              {location.state && (
                <p className="text-xs text-muted-foreground mt-0.5">{location.state}</p>
              )}
            </div>
          )}

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Latitude</p>
              <p className="font-mono text-sm font-medium">{location.latitude.toFixed(6)}</p>
            </div>
            <div className="bg-background/50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Longitude</p>
              <p className="font-mono text-sm font-medium">{location.longitude.toFixed(6)}</p>
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-background/50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Precisão</span>
              <span className={cn("text-sm font-medium", getAccuracyLabel(location.accuracy).color)}>
                {getAccuracyLabel(location.accuracy).label}
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  location.accuracy <= 10 ? "bg-green-500" :
                  location.accuracy <= 30 ? "bg-green-400" :
                  location.accuracy <= 100 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.max(5, 100 - location.accuracy)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              ±{location.accuracy.toFixed(0)} metros
            </p>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {location.altitude !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Altitude:</span>
                <span className="font-mono">{location.altitude.toFixed(0)}m</span>
              </div>
            )}
            {location.speed !== null && location.speed > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Velocidade:</span>
                <span className="font-mono">{(location.speed * 3.6).toFixed(1)}km/h</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {state === "idle" && (
        <Button size="lg" className="w-full max-w-xs h-14 gap-3" onClick={requestLocation}>
          <MapPin className="w-5 h-5" />
          Verificar Localização
        </Button>
      )}

      {state === "success" && (
        <>
          <p className="text-center text-muted-foreground mb-4 text-sm">
            O GPS está funcionando corretamente?
          </p>
          <div className="flex gap-3 w-full max-w-xs">
            <Button
              variant="outline"
              className="flex-1 h-12 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
              onClick={() => handleConfirm(false)}
            >
              <X className="w-5 h-5" />
              Não
            </Button>
            <Button
              className="flex-1 h-12 gap-2"
              onClick={() => handleConfirm(true)}
            >
              <Check className="w-5 h-5" />
              Sim
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
