/**
 * Reset de cache/SW focado em recuperação de tela branca por chunks desatualizados.
 * Evita apagar localStorage para não causar logout/config reset inesperado.
 */
export async function resetServiceWorkerAndCaches(): Promise<void> {
  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch {
    // noop
  }

  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    // noop
  }

  // Bust simples para evitar servir HTML antigo em caches intermediários
  const url = new URL(window.location.href);
  url.searchParams.set("r", String(Date.now()));
  window.location.replace(url.toString());
}
