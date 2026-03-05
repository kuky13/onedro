import { supabase } from '../integrations/supabase/client';

interface AccessLogEntry {
  user_id: string;
  attempted_path: string;
  reason: string;
  timestamp: string;
  user_agent: string;
  ip_address?: string;
  session_id?: string;
  additional_data?: Record<string, any>;
}

interface UserActivityLogEntry {
  user_id: string;
  activity_type: 'login' | 'logout' | 'license_check' | 'access_denied' | 'redirect';
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent: string;
}

/**
 * Serviço centralizado para logging de segurança e atividades do usuário
 * Implementa logging assíncrono para não impactar a performance
 */
class SecurityLogger {
  private static instance: SecurityLogger;
  private logQueue: Array<AccessLogEntry | UserActivityLogEntry> = [];
  private isProcessing = false;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 segundos
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicFlush();
  }

  static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  /**
   * Registra tentativa de acesso não autorizado
   */
  async logUnauthorizedAccess(
    userId: string,
    attemptedPath: string,
    reason: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    const sessionId = this.getSessionId();

    const logEntry: AccessLogEntry = {
      user_id: userId,
      attempted_path: attemptedPath,
      reason,
      timestamp: new Date().toISOString(),
      user_agent: this.getUserAgent(),
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(additionalData ? { additional_data: additionalData } : {})
    };

    this.addToQueue(logEntry);
    
    // Log no console para debug
    console.warn(`🚫 [SecurityLogger] Acesso negado: ${reason} - Usuário: ${userId} - Rota: ${attemptedPath}`);
  }

  /**
   * Registra atividade do usuário
   */
  async logUserActivity(
    userId: string,
    activityType: UserActivityLogEntry['activity_type'],
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const logEntry: UserActivityLogEntry = {
      user_id: userId,
      activity_type: activityType,
      description: description,
      ...(metadata ? { metadata } : {}),
      timestamp: new Date().toISOString(),
      user_agent: this.getUserAgent()
    };

    this.addToQueue(logEntry);
    
    // Log no console para debug
    console.info(`📊 [SecurityLogger] Atividade: ${activityType} - ${description} - Usuário: ${userId}`);
  }

  /**
   * Registra tentativa de acesso com licença inativa
   */
  async logInactiveLicenseAccess(
    userId: string,
    attemptedPath: string,
    licenseStatus: 'inactive' | 'expired' | 'not_found'
  ): Promise<void> {
    await this.logUnauthorizedAccess(
      userId,
      attemptedPath,
      `license_${licenseStatus}`,
      {
        license_status: licenseStatus,
        redirect_to: '/verify-licenca'
      }
    );

    await this.logUserActivity(
      userId,
      'access_denied',
      `Acesso negado por licença ${licenseStatus}`,
      {
        attempted_path: attemptedPath,
        license_status: licenseStatus
      }
    );
  }

  /**
   * Registra redirecionamento automático
   */
  async logAutoRedirect(
    userId: string,
    fromPath: string,
    toPath: string,
    reason: string
  ): Promise<void> {
    await this.logUserActivity(
      userId,
      'redirect',
      `Redirecionamento automático: ${fromPath} → ${toPath}`,
      {
        from_path: fromPath,
        to_path: toPath,
        reason: reason
      }
    );
  }

  /**
   * Registra verificação de licença
   */
  async logLicenseCheck(
    userId: string,
    licenseStatus: 'active' | 'inactive' | 'expired' | 'not_found',
    checkReason: string = 'routine_check'
  ): Promise<void> {
    await this.logUserActivity(
      userId,
      'license_check',
      `Verificação de licença: ${licenseStatus}`,
      {
        license_status: licenseStatus,
        check_reason: checkReason
      }
    );
  }

  /**
   * Adiciona entrada à fila de processamento
   */
  private addToQueue(entry: AccessLogEntry | UserActivityLogEntry): void {
    this.logQueue.push(entry);
    
    // Se a fila está cheia, processar imediatamente
    if (this.logQueue.length >= this.BATCH_SIZE) {
      this.flushQueue();
    }
  }

  /**
   * Processa a fila de logs
   */
  private async flushQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.logQueue.splice(0, this.BATCH_SIZE);

    try {
      // Verificar se temos sessão antes de tentar inserir logs
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Se houver erro ou não houver sessão, recolocar logs na fila e aguardar
        if (sessionError && !sessionError.message.includes('aborted')) {
          console.warn('⚠️ [SecurityLogger] Erro ao obter sessão:', sessionError.message);
        }
        this.logQueue.unshift(...batch);
        this.isProcessing = false;
        return;
      }

      // Separar logs por tipo
      const accessLogs = batch.filter(entry => 'attempted_path' in entry) as AccessLogEntry[];
      const activityLogs = batch.filter(entry => 'activity_type' in entry) as UserActivityLogEntry[];

      // Inserir logs de acesso
      if (accessLogs.length > 0) {
        const { error: accessError } = await supabase
          .from('access_logs')
          .insert(accessLogs);

        if (accessError) {
          console.error('❌ [SecurityLogger] Erro ao inserir access_logs:', accessError);
          // Recolocar na fila para tentar novamente
          this.logQueue.unshift(...accessLogs);
        } else {
          console.log(`✅ [SecurityLogger] ${accessLogs.length} access_logs inseridos`);
        }
      }

      // Inserir logs de atividade
      if (activityLogs.length > 0) {
        const { error: activityError } = await supabase
          .from('user_activity_logs')
          .insert(activityLogs);

        if (activityError) {
          console.error('❌ [SecurityLogger] Erro ao inserir user_activity_logs:', activityError);
          // Recolocar na fila para tentar novamente
          this.logQueue.unshift(...activityLogs);
        } else {
          console.log(`✅ [SecurityLogger] ${activityLogs.length} user_activity_logs inseridos`);
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('aborted')) {
        console.error('❌ [SecurityLogger] Erro geral ao processar fila:', error);
      }
      // Recolocar todos os logs na fila
      this.logQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Inicia o flush periódico da fila
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Para o flush periódico
   */
  public stopPeriodicFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Força o processamento imediato da fila
   */
  public async forceFlush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * Obtém o User Agent do navegador
   */
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Unknown';
  }

  /**
   * Obtém o ID da sessão atual
   */
  private getSessionId(): string | undefined {
    // Evitar depender de getSession() async aqui (e evitar setar undefined explicitamente em campos opcionais)
    return undefined;
  }

  /**
   * Obtém estatísticas do logger
   */
  public getStats(): {
    queueSize: number;
    isProcessing: boolean;
    flushInterval: number;
    batchSize: number;
  } {
    return {
      queueSize: this.logQueue.length,
      isProcessing: this.isProcessing,
      flushInterval: this.FLUSH_INTERVAL,
      batchSize: this.BATCH_SIZE
    };
  }

  /**
   * Limpa a fila de logs (usar com cuidado)
   */
  public clearQueue(): void {
    this.logQueue = [];
    console.warn('⚠️ [SecurityLogger] Fila de logs limpa');
  }
}

// Instância singleton
export const securityLogger = SecurityLogger.getInstance();

export default SecurityLogger;