import { useApiStatus } from '@/hooks/useApiStatus';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export const VpsStatusBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  const { isVpsOffline, isChecking, recheck } = useApiStatus({ enabled: !dismissed });

  if (!isVpsOffline || dismissed || isChecking) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2 text-destructive">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>Servidor VPS indisponível. Downloads e algumas funções podem estar offline.</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => recheck()}
          className="text-destructive hover:text-destructive/80 transition-colors"
          aria-label="Verificar novamente"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default VpsStatusBanner;
