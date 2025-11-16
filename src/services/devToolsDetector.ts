/**
 * Sistema Robusto de Detecção de Ferramentas do Desenvolvedor
 * Implementa múltiplos métodos de detecção com ações graduais
 */

export interface DevToolsEvent {
  type: 'window_resize' | 'console_access' | 'debugger_statement' | 'timing_anomaly';
  timestamp: number;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

export interface DevToolsConfig {
  enableWindowDetection: boolean;
  enableConsoleDetection: boolean;
  enableDebuggerDetection: boolean;
  enableTimingDetection: boolean;
  thresholdCount: number;
  actionDelay: number;
  logToServer: boolean;
}

class DevToolsDetector {
  private isDetectionActive = false;
  private detectionCount = 0;
  private lastDetectionTime = 0;
  private windowSizeThreshold = 160;
  private timingThreshold = 100;
  private callbacks: Array<(event: DevToolsEvent) => void> = [];
  
  private config: DevToolsConfig = {
    enableWindowDetection: true,
    enableConsoleDetection: true,
    enableDebuggerDetection: true,
    enableTimingDetection: true,
    thresholdCount: 3,
    actionDelay: 2000,
    logToServer: false // Desabilitado para evitar erros de endpoint inexistente
  };

  constructor(config?: Partial<DevToolsConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Inicia o sistema de detecção
   */
  public startDetection(): void {
    if (this.isDetectionActive) return;
    
    this.isDetectionActive = true;
    
    if (this.config.enableWindowDetection) {
      this.setupWindowDetection();
    }
    
    if (this.config.enableConsoleDetection) {
      this.setupConsoleDetection();
    }
    
    if (this.config.enableDebuggerDetection) {
      this.setupDebuggerDetection();
    }
    
    if (this.config.enableTimingDetection) {
      this.setupTimingDetection();
    }

    // Sistema ativado silenciosamente
  }

  /**
   * Para o sistema de detecção
   */
  public stopDetection(): void {
    this.isDetectionActive = false;
    this.detectionCount = 0;
    // Sistema desativado silenciosamente
  }

  /**
   * Adiciona callback para eventos de detecção
   */
  public onDetection(callback: (event: DevToolsEvent) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Detecção baseada em mudanças de tamanho da janela
   */
  private setupWindowDetection(): void {
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const checkWindowSize = () => {
      if (!this.isDetectionActive) return;

      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      
      const widthDiff = Math.abs(currentWidth - lastWidth);
      const heightDiff = Math.abs(currentHeight - lastHeight);
      
      // Detecta se DevTools foi aberto (mudança significativa na altura)
      if (heightDiff > this.windowSizeThreshold || widthDiff > this.windowSizeThreshold) {
        const isDevToolsOpen = (
          (currentHeight < lastHeight && heightDiff > this.windowSizeThreshold) ||
          (currentWidth < lastWidth && widthDiff > this.windowSizeThreshold)
        );

        if (isDevToolsOpen) {
          this.triggerDetection({
            type: 'window_resize',
            timestamp: Date.now(),
            details: {
              previousSize: { width: lastWidth, height: lastHeight },
              currentSize: { width: currentWidth, height: currentHeight },
              difference: { width: widthDiff, height: heightDiff }
            },
            severity: 'medium'
          });
        }
      }

      lastWidth = currentWidth;
      lastHeight = currentHeight;
    };

    window.addEventListener('resize', checkWindowSize);
    
    // Verificação periódica adicional
    setInterval(checkWindowSize, 1000);
  }

  /**
   * Detecção de acesso ao console
   */
  private setupConsoleDetection(): void {
    const originalConsole = { ...console };
    
    // Intercepta métodos do console
    ['log', 'warn', 'error', 'info', 'debug'].forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        if (this.isDetectionActive) {
          this.triggerDetection({
            type: 'console_access',
            timestamp: Date.now(),
            details: {
              method,
              argsCount: args.length,
              stackTrace: new Error().stack?.split('\n').slice(0, 5)
            },
            severity: 'low'
          });
        }
        
        return (originalConsole as any)[method].apply(console, args);
      };
    });

    // Detecção de toString() em objetos (técnica avançada)
    const devToolsChecker = {
      toString: () => {
        if (this.isDetectionActive) {
          this.triggerDetection({
            type: 'console_access',
            timestamp: Date.now(),
            details: {
              method: 'toString_trap',
              description: 'Object inspection detected'
            },
            severity: 'high'
          });
        }
        return '';
      }
    };

    // Expõe objeto armadilha no console
    (window as any).__devtools_check__ = devToolsChecker;
  }

  /**
   * Detecção de debugger statements
   */
  private setupDebuggerDetection(): void {
    const checkDebugger = () => {
      if (!this.isDetectionActive) return;

      const start = performance.now();
      
      // Debugger statement que será detectado se DevTools estiver aberto
      debugger;
      
      const end = performance.now();
      const executionTime = end - start;

      // Se o debugger pausou a execução, o tempo será maior
      if (executionTime > 100) {
        this.triggerDetection({
          type: 'debugger_statement',
          timestamp: Date.now(),
          details: {
            executionTime,
            threshold: 100
          },
          severity: 'high'
        });
      }
    };

    // Executa verificação periodicamente
    setInterval(checkDebugger, 5000);
  }

  /**
   * Detecção baseada em anomalias de timing
   */
  private setupTimingDetection(): void {
    let lastTime = performance.now();

    const checkTiming = () => {
      if (!this.isDetectionActive) return;

      const currentTime = performance.now();
      const timeDiff = currentTime - lastTime;

      // Detecta pausas anômalas que podem indicar debugging
      if (timeDiff > this.timingThreshold * 50) {
        this.triggerDetection({
          type: 'timing_anomaly',
          timestamp: Date.now(),
          details: {
            timeDifference: timeDiff,
            threshold: this.timingThreshold * 50,
            possibleCause: 'Execution paused or debugging'
          },
          severity: 'medium'
        });
      }

      lastTime = currentTime;
    };

    setInterval(checkTiming, 1000);
  }

  /**
   * Dispara evento de detecção e executa ações
   */
  private triggerDetection(event: DevToolsEvent): void {
    const now = Date.now();
    
    // Evita spam de detecções
    if (now - this.lastDetectionTime < this.config.actionDelay) {
      return;
    }

    this.lastDetectionTime = now;
    this.detectionCount++;

    // Notifica callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in DevTools detection callback:', error);
      }
    });

    // Executa ações graduais baseadas no número de detecções
    this.executeGradualActions(event);

    // Log para servidor se habilitado
    if (this.config.logToServer) {
      this.logToServer(event);
    }
  }

  /**
   * Executa ações graduais baseadas no número de detecções
   */
  private executeGradualActions(event: DevToolsEvent): void {
    if (this.detectionCount === 1) {
      // Primeira detecção: apenas log
      // Detecção silenciosa - primeira ocorrência
    } else if (this.detectionCount === this.config.thresholdCount) {
      // Múltiplas detecções: aviso visual
      this.showWarningMessage();
    } else if (this.detectionCount > this.config.thresholdCount * 2) {
      // Muitas detecções: ação mais restritiva
      this.executeRestrictiveAction();
    }
  }

  /**
   * Exibe mensagem de aviso
   */
  private showWarningMessage(): void {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    warningDiv.innerHTML = `
      <strong>⚠️ Aviso de Segurança</strong><br>
      Atividade de ferramentas de desenvolvedor detectada.<br>
      Por favor, feche as ferramentas para continuar.
    `;

    document.body.appendChild(warningDiv);

    // Remove aviso após 5 segundos
    setTimeout(() => {
      if (warningDiv.parentNode) {
        warningDiv.parentNode.removeChild(warningDiv);
      }
    }, 5000);
  }

  /**
   * Executa ação restritiva
   */
  private executeRestrictiveAction(): void {
    console.warn('🔒 Excessive developer tools usage detected - implementing restrictions');
    
    // Pode implementar ações como:
    // - Blur da tela
    // - Redirecionamento
    // - Bloqueio temporário
    // - Logout forçado
    
    // Exemplo: blur da tela
    document.body.style.filter = 'blur(5px)';
    
    setTimeout(() => {
      document.body.style.filter = '';
    }, 3000);
  }

  /**
   * Registra evento de detecção localmente
   */
  private async logToServer(event: DevToolsEvent): Promise<void> {
    try {
      // Log local para desenvolvimento - não faz chamadas HTTP
      const logData = {
        ...event,
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.getSessionId()
      };

      // Log silencioso para desenvolvimento
      // console.log('🔒 DevTools Detection Event:', logData);
      
      // TODO: Implementar envio para endpoint de segurança quando disponível
      // await fetch('/api/security/devtools-detection', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(logData)
      // });
    } catch (error) {
      console.error('Failed to log DevTools detection:', error);
    }
  }

  /**
   * Obtém ID da sessão
   */
  private getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'anonymous';
  }

  /**
   * Obtém estatísticas de detecção
   */
  public getStats(): { detectionCount: number; isActive: boolean; lastDetection: number } {
    return {
      detectionCount: this.detectionCount,
      isActive: this.isDetectionActive,
      lastDetection: this.lastDetectionTime
    };
  }
}

// Instância singleton
export const devToolsDetector = new DevToolsDetector();

// Auto-inicialização em produção
if (process.env.NODE_ENV === 'production') {
  devToolsDetector.startDetection();
}

export default DevToolsDetector;