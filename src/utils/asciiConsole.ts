/**
 * Sistema de interceptação de console para exibir arte ASCII
 * Substitui logs de debug por uma arte ASCII elegante
 */

const ASCII_ART = `⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢰⡿⠻⣷⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣿⠁⠀⠈⠻⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣼⡇⠀⠀⠀⠀⠹⣿⣦⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢰⣿⡇⠀⠀⠀⠀⠀⣿⣿⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⡟⣿⣦⣀⠀⣀⣼⠁⣿⣿⠀⠲⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⡇⠈⢛⣿⠿⢿⣿⡄⠘⢻⡇⠀⢹⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠘⡇⣴⠋⠀⠀⣀⠈⠙⣄⠈⡇⠀⢰⠀⣀⠤⠐⠶⠤⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠹⣇⢰⣷⣾⠷⢶⣤⡘⣤⠇⠀⠞⠋⠀⠀⣀⣨⣤⣴⣶⣶⣶⣶⣦⣤⣀⡀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠙⢦⣿⣧⣄⡀⠙⣿⣿⣠⡟⢀⡤⠒⠉⠉⠉⠉⠛⣫⠟⠋⠉⠉⠉⠛⠻⢿⣶⣄
⠀⠀⠀⢀⣤⣶⣾⣿⣿⠶⠿⠿⢦⣙⣦⣿⣿⣿⣾⣟⣉⡉⠉⠙⠶⣶⣿⡇⠀⠀⠀⠀⠀⠀⢐⣴⡿⠁
⠀⢀⣴⣿⣿⣿⣟⣁⣀⣀⣤⠔⢒⣿⣿⣿⣿⠿⣍⡀⠉⠻⣶⡆⠀⠘⣿⣷⣄⠀⠀⠀⣂⣴⠿⠋⠀⠀
⢠⡾⠋⠁⠀⢹⣿⡿⠋⣡⣏⠤⠋⣱⡿⢻⡟⡓⢦⣽⣦⣴⣿⣧⠂⢠⡏⠙⠻⢿⣿⣿⠟⠁⠀⠀
⣿⣧⣤⣤⣤⣾⡯⠤⠚⠋⠁⠀⢰⠟⠀⡞⢀⡇⠈⢿⡟⠯⣭⣤⣴⣋⣠⡤⠶⠛⠉⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠋⠀⠀⣧⠊⣧⠀⢸⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠇⣰⣿⣧⣸⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣷⡿⠟⠻⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⡇⠀⠀⢸⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢻⣄⣠⡿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠻⠏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀

🎯 Estamos contratando :D
💧 beba água`;

class ASCIIConsoleInterceptor {
  private static instance: ASCIIConsoleInterceptor;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  };
  private hasShownArt = false;
  private debugPatterns = [
    /🔒|🛡️|🔐|📋|✅|🧹|⚠️|🔄|📋/,
    /DevTools|Security|Enhanced|Storage|Detection/,
    /\[.*\]/,
    /TokenRotation|PWAUpdate|ReloadMonitor/,
    /devToolsDetector\.ts/,
    /debugLogger\.ts/,
    /useAuth\.tsx/,
    /usePWA\.ts/,
    /net::ERR_ABORTED/,
    /Failed to fetch/,
    /Erro ao carregar imagem.*\.heic/i
  ];

  private constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console)
    };
  }

  public static getInstance(): ASCIIConsoleInterceptor {
    if (!ASCIIConsoleInterceptor.instance) {
      ASCIIConsoleInterceptor.instance = new ASCIIConsoleInterceptor();
    }
    return ASCIIConsoleInterceptor.instance;
  }

  private isDebugMessage(message: string): boolean {
    return this.debugPatterns.some(pattern => pattern.test(message));
  }

  // Formata argumentos para evitar logs como "Object" sem contexto
  private formatConsoleArgs(method: 'log' | 'warn' | 'error' | 'info', args: any[]): any[] {
    if (method === 'error') {
      return args.map((arg: any) => {
        if (arg instanceof Error) {
          const name = arg.name || 'Error';
          const message = arg.message || String(arg);
          const stack = arg.stack ? `\n${arg.stack}` : '';
          return `${name}: ${message}${stack}`;
        }
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return '[object]';
          }
        }
        return arg;
      });
    }
    return args;
  }

  private showASCIIArt(): void {
    if (!this.hasShownArt) {
      this.originalConsole.log(
        `%c${ASCII_ART}`,
        'color: #00ff88; font-family: monospace; font-size: 12px; line-height: 1.2;'
      );
      this.hasShownArt = true;
    }
  }

  private interceptConsoleMethod(
    method: 'log' | 'warn' | 'error' | 'info',
    originalMethod: (...args: any[]) => any
  ) {
    return (...args: any[]) => {
      const message = args.join(' ');

      // Se for uma mensagem de debug, mostra a arte ASCII uma vez
      if (this.isDebugMessage(message)) {
        this.showASCIIArt();
        return; // Não mostra a mensagem original
      }

      const formattedArgs = this.formatConsoleArgs(method, args);

      // Para erros críticos, ainda mostra
      if (method === 'error' && !this.isDebugMessage(message)) {
        originalMethod(...formattedArgs);
        return;
      }

      // Para outras mensagens importantes (não debug), mostra normalmente
      if (!this.isDebugMessage(message)) {
        originalMethod(...formattedArgs);
      }
    };
  }

  public initialize(): void {
    // Não interceptar console em produção (mantém logs normais e evita ruído)
    if (!import.meta.env.DEV) return;

    // Intercepta os métodos do console
    console.log = this.interceptConsoleMethod('log', this.originalConsole.log);
    console.warn = this.interceptConsoleMethod('warn', this.originalConsole.warn);
    console.error = this.interceptConsoleMethod('error', this.originalConsole.error);
    console.info = this.interceptConsoleMethod('info', this.originalConsole.info);
  }

  public restore(): void {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
  }

  // Método para logs importantes que devem sempre aparecer
  public forceLog(...args: any[]): void {
    this.originalConsole.log(...args);
  }
}

export const asciiConsole = ASCIIConsoleInterceptor.getInstance();