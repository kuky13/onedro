/**
 * Sistema de logging condicional baseado no ambiente
 * Substitui console.log diretos por logging controlado
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = { enabled: false, level: 'info' }) {
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      ...config
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    return `${timestamp} ${prefix} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: any) {
    // Debug logs silenciados para reduzir spam no console
    // if (this.shouldLog('debug')) {
    //   console.log(this.formatMessage('debug', message), data || '');
    // }
  }

  info(message: string, data?: any) {
    // Info logs silenciados para reduzir spam no console
    // if (this.shouldLog('info')) {
    //   console.info(this.formatMessage('info', message), data || '');
    // }
  }

  warn(message: string, data?: any) {
    // Warning logs silenciados para reduzir spam no console
    // if (this.shouldLog('warn')) {
    //   console.warn(this.formatMessage('warn', message), data || '');
    // }
  }

  error(message: string, data?: any) {
    // Manter apenas logs críticos de erro
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), data || '');
    }
  }
}

// Instâncias pré-configuradas para diferentes módulos
export const serviceOrderLogger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'ServiceOrder' 
});

export const pdfLogger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'PDF' 
});

export const companyLogger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'Company' 
});

export const notificationLogger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'Notification' 
});

export const authLogger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'Auth' 
});

// Logger geral para uso em toda aplicação
export const logger = new Logger({ 
  enabled: false, // Desabilitado para reduzir logs
  level: 'error', // Apenas erros críticos
  prefix: 'App' 
});