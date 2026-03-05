import { lazy } from "react";

type Importer<T> = () => Promise<{ default: T } | any>;

/**
 * Wrapper para React.lazy com retentativa simples.
 * Mitiga casos intermitentes de: "Failed to fetch dynamically imported module".
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: Importer<T>,
  options?: { retries?: number; retryDelayMs?: number }
) {
  const retries = options?.retries ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 350;

  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const mod = await importer();
        // Normaliza para { default: Component }
        if (mod?.default) return mod;
        return { default: mod };
      } catch (err) {
        lastError = err;
        if (attempt >= retries) break;
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }

    // Dispara telemetria/UX de recuperação (banner) para falhas típicas de chunk.
    try {
      const message = lastError instanceof Error ? lastError.message : String(lastError);
      const isChunkLike =
        message.toLowerCase().includes('failed to fetch dynamically imported module') ||
        message.toLowerCase().includes('loading chunk') ||
        message.toLowerCase().includes('chunkloaderror');

      if (isChunkLike) {
        window.dispatchEvent(
          new CustomEvent('chunk-load-failed', {
            detail: {
              message,
              url: window.location.href,
            },
          })
        );
      }
    } catch {
      // noop
    }

    throw lastError;
  });
}
