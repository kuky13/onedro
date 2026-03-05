import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { resetServiceWorkerAndCaches } from "@/utils/pwaReset";
import { securityLogger } from "@/utils/securityAuditLogger";

type ChunkFailDetail = {
  message?: string;
  url?: string;
};

/**
 * Banner discreto para recuperar falha de import dinâmico (tela branca/chunk desatualizado).
 * Exibe botão: "Limpar cache e recarregar".
 */
export function ChunkLoadRecoveryBanner() {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState<ChunkFailDetail | null>(null);

  const title = useMemo(() => {
    if (!detail?.message) return "Falha ao carregar atualização";
    return "Falha ao carregar módulo";
  }, [detail?.message]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<ChunkFailDetail>;
      setDetail(e.detail ?? null);
      setVisible(true);

      // Telemetria sem PII (somente metadados do erro)
      try {
        securityLogger.logSuspiciousActivity("chunk_load_failure", {
          message: String(e.detail?.message ?? ""),
          url: String(e.detail?.url ?? ""),
          path: window.location.pathname,
        });
      } catch {
        // noop
      }
    };

    window.addEventListener("chunk-load-failed", handler as EventListener);
    return () => window.removeEventListener("chunk-load-failed", handler as EventListener);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">
            Se a tela ficou em branco, limpe o cache e recarregue para pegar a versão mais recente.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => resetServiceWorkerAndCaches()}
          >
            Limpar cache e recarregar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisible(false)}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
