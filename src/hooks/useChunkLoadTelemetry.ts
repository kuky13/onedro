import { useEffect } from "react";

function isChunkFailureMessage(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch dynamically imported module") ||
    m.includes("loading chunk") ||
    m.includes("chunkloaderror")
  );
}

/**
 * Captura falhas típicas de carregamento de chunks (tela branca) e dispara o evento
 * `chunk-load-failed` consumido pelo `ChunkLoadRecoveryBanner`.
 */
export function useChunkLoadTelemetry() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      const message = String(ev.message ?? "");
      if (!isChunkFailureMessage(message)) return;

      window.dispatchEvent(
        new CustomEvent("chunk-load-failed", {
          detail: { message, url: String((ev as any)?.filename ?? "") },
        })
      );
    };

    const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
      const reason = ev.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "");
      if (!isChunkFailureMessage(message)) return;

      window.dispatchEvent(
        new CustomEvent("chunk-load-failed", {
          detail: { message, url: window.location.href },
        })
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
}
