/**
 * Sistema de Debug Logging Otimizado
 * Previne logs excessivos que causam recarregamentos
 */

class DebugLogger {
  private lastLogTime = 0;
  private logCount = 0;
  private readonly LOG_THROTTLE_LIMIT = 5;
  private readonly LOG_RESET_INTERVAL = 1000;
  private isProduction = !import.meta.env.DEV;

  log(category: string, message: string, data?: unknown) {
    if (this.isProduction) return;

    // Marcar como usado (evita TS6133)
    void category;
    void message;
    void data;

    const now = Date.now();

    // Reset contador se passou o intervalo
    if (now - this.lastLogTime > this.LOG_RESET_INTERVAL) {
      this.logCount = 0;
      this.lastLogTime = now;
    }

    // Conta chamadas (throttle) mesmo com logs silenciados
    if (this.logCount < this.LOG_THROTTLE_LIMIT) {
      this.logCount++;
    }
  }

  error(category: string, message: string, error?: Error | unknown) {
    // Manter apenas logs críticos de erro
    console.error(`[${category}] ${message}`, error || '');
  }

  warn(category: string, message: string, data?: unknown) {
    void category;
    void message;
    void data;
    // Silenciar warnings para reduzir spam no console
  }
}

export const debugLogger = new DebugLogger();