/**
 * SISTEMA DE AUDITORIA E LOGS DE SEGURANÇA
 * Registra todas as ações críticas e eventos de segurança
 * Implementa conformidade com LGPD e boas práticas de auditoria
 */

import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  id?: string;
  event_type: SecurityEventType;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  resource_type?: string;
  resource_id?: string;
  action: string;
  details: Record<string, any>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: string;
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  // Autenticação
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  ACCOUNT_LOCKED = 'account_locked',
  
  // Autorização
  ACCESS_DENIED = 'access_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // Dados
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  DATA_EXPORT = 'data_export',
  SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
  
  // Uploads
  FILE_UPLOAD = 'file_upload',
  FILE_DOWNLOAD = 'file_download',
  FILE_DELETION = 'file_deletion',
  MALICIOUS_FILE_BLOCKED = 'malicious_file_blocked',
  
  // Sistema
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_VIOLATION = 'security_violation',
  CONFIGURATION_CHANGE = 'configuration_change',
  
  // Compliance
  GDPR_REQUEST = 'gdpr_request',
  DATA_RETENTION_ACTION = 'data_retention_action',
  CONSENT_CHANGE = 'consent_change'
}

class SecurityAuditLogger {
  private static instance: SecurityAuditLogger;
  private sessionId: string;
  private userId: string | undefined;
  private ipAddress: string | undefined;
  private userAgent: string | undefined;
  private eventQueue: SecurityEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private consecutiveFailures: number = 0;
  private isCircuitOpen: boolean = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeClientInfo();
    this.startPeriodicFlush();
    
    // Listener para mudanças de autenticação
    supabase.auth.onAuthStateChange((event, session) => {
      this.userId = session?.user?.id ?? undefined;
      
      if (event === 'SIGNED_IN') {
        this.logSecurityEvent({
          event_type: SecurityEventType.LOGIN_SUCCESS,
          action: 'user_authenticated',
          details: {
            method: session?.user?.app_metadata?.provider || 'email',
            email: session?.user?.email
          },
          risk_level: 'low'
        });
      } else if (event === 'SIGNED_OUT') {
        this.logSecurityEvent({
          event_type: SecurityEventType.LOGOUT,
          action: 'user_logged_out',
          details: {},
          risk_level: 'low'
        });
      }
    });
  }

  public static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger();
    }
    return SecurityAuditLogger.instance;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeClientInfo() {
    // IP deve vir do backend, não de serviço externo (elimina fetch bloqueante ao api.ipify.org)
    this.userAgent = navigator.userAgent;
    this.ipAddress = 'unknown';
  }

  /**
   * Registra um evento de segurança
   */
  public async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'session_id' | 'user_id' | 'ip_address' | 'user_agent'>): Promise<void> {
    const fullEvent: SecurityEvent = {
      ...event,
      ...(this.userId ? { user_id: this.userId } : {}),
      session_id: this.sessionId,
      ...(this.ipAddress ? { ip_address: this.ipAddress } : {}),
      ...(this.userAgent ? { user_agent: this.userAgent } : {}),
      timestamp: new Date().toISOString(),
      metadata: {
        client_timestamp: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen_resolution: `${screen.width}x${screen.height}`,
        ...(event.metadata ?? {})
      }
    };

    // Adicionar à fila
    this.eventQueue.push(fullEvent);

    // Para eventos críticos, enviar imediatamente
    if (event.risk_level === 'critical' || event.risk_level === 'high') {
      await this.flushEvents();
    }

    // Log local para desenvolvimento
    if (import.meta.env.DEV) {
      console.log('🔒 Security Event:', fullEvent);
    }
  }

  /**
   * Envia eventos em lote para o backend
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    // Circuit breaker: se falhou muitas vezes (ex: tabela inexistente), para de tentar
    if (this.isCircuitOpen) {
      if (this.eventQueue.length > 100) {
        // Limpar fila se ficar muito grande enquanto circuito está aberto
        this.eventQueue = []; 
      }
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Preferir token do usuário (RLS) quando disponível.
      // Se não houver sessão, cai para o anon key (pode ser bloqueado por RLS, mas evita crash).
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Usar a URL diretamente com fetch para evitar qualquer interferência do SDK do Supabase
      // e usar um nome de parâmetro que não seja 'columns' se possível.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (supabase as any).supabaseUrl;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || (supabase as any).supabaseKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        if (import.meta.env.DEV) console.warn('SecurityLogger: Supabase URL or Key missing');
        return;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/site_events`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(eventsToSend),
        keepalive: true // Garantir que a requisição continue mesmo se a página for fechada/navegada
      });

      if (!response.ok) {
        // 400/401/403/404 normalmente indica schema/perm/endpoint incorreto.
        // Abrir circuito para não ficar spammando requests e console.
        if ([400, 401, 403, 404].includes(response.status)) {
          this.isCircuitOpen = true;
          this.eventQueue = []; // descartar fila para não crescer indefinidamente
          
          if (import.meta.env.DEV) {
            console.warn(`SecurityLogger: Circuit breaker opened due to HTTP ${response.status}. Logging disabled.`);
          }
        }
        return; // Sair silenciosamente para evitar ERR_ABORTED visível no console
      }

      this.consecutiveFailures = 0;
    } catch (error: any) {
      // Ignorar erros de aborto/cancelamento silenciosamente
      if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('canceled')) {
        // Devolver eventos para a fila se não foi um erro fatal do circuito
        if (!this.isCircuitOpen) {
          this.eventQueue.unshift(...eventsToSend);
        }
        return;
      }

      this.consecutiveFailures++;
      if (this.consecutiveFailures >= 3) {
        this.isCircuitOpen = true;
        if (import.meta.env.DEV) {
          console.warn('SecurityLogger: Circuit breaker opened due to consecutive failures. Logging disabled temporarily.');
        }
      }

      if (import.meta.env.DEV) {
        console.warn('Falha ao enviar logs de auditoria:', error);
      }
      // Se o circuito abriu, não re-enfileirar (evita loop + fila infinita)
      if (!this.isCircuitOpen) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  /**
   * Inicia o flush periódico dos eventos
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, 30000); // Flush a cada 30 segundos
  }

  /**
   * Para o logger e envia eventos pendentes
   */
  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushEvents();
  }

  // Métodos de conveniência para eventos comuns

  public logLoginAttempt(email: string, success: boolean, reason?: string): void {
    this.logSecurityEvent({
      event_type: success ? SecurityEventType.LOGIN_SUCCESS : SecurityEventType.LOGIN_FAILED,
      action: success ? 'login_successful' : 'login_failed',
      details: {
        email,
        reason: reason || (success ? 'valid_credentials' : 'invalid_credentials')
      },
      risk_level: success ? 'low' : 'medium'
    });
  }

  public logDataAccess(resourceType: string, resourceId: string, action: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.DATA_ACCESS,
      resource_type: resourceType,
      resource_id: resourceId,
      action,
      details: {
        access_time: new Date().toISOString()
      },
      risk_level: 'low'
    });
  }

  public logSensitiveDataAccess(resourceType: string, resourceId: string, dataType: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.SENSITIVE_DATA_ACCESS,
      resource_type: resourceType,
      resource_id: resourceId,
      action: 'sensitive_data_accessed',
      details: {
        data_type: dataType,
        access_time: new Date().toISOString()
      },
      risk_level: 'medium'
    });
  }

  public logFileUpload(fileName: string, fileSize: number, fileType: string, bucketName: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.FILE_UPLOAD,
      resource_type: 'file',
      action: 'file_uploaded',
      details: {
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        bucket: bucketName
      },
      risk_level: 'low'
    });
  }

  public logMaliciousFileBlocked(fileName: string, reason: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.MALICIOUS_FILE_BLOCKED,
      action: 'malicious_file_blocked',
      details: {
        file_name: fileName,
        block_reason: reason,
        detection_time: new Date().toISOString()
      },
      risk_level: 'high'
    });
  }

  public logUnauthorizedAccess(resource: string, attemptedAction: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.UNAUTHORIZED_ACCESS,
      resource_type: resource,
      action: 'unauthorized_access_attempt',
      details: {
        attempted_action: attemptedAction,
        blocked_time: new Date().toISOString()
      },
      risk_level: 'high'
    });
  }

  public logRateLimitExceeded(endpoint: string, limit: number): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      action: 'rate_limit_exceeded',
      details: {
        endpoint,
        limit,
        exceeded_time: new Date().toISOString()
      },
      risk_level: 'medium'
    });
  }

  public logSuspiciousActivity(activityType: string, details: Record<string, any>): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      action: 'suspicious_activity_detected',
      details: {
        activity_type: activityType,
        detection_time: new Date().toISOString(),
        ...details
      },
      risk_level: 'high'
    });
  }

  public logGDPRRequest(requestType: string, dataSubject: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.GDPR_REQUEST,
      action: 'gdpr_request_received',
      details: {
        request_type: requestType,
        data_subject: dataSubject,
        request_time: new Date().toISOString()
      },
      risk_level: 'medium'
    });
  }

  public logPasswordChange(userId: string, method: 'self' | 'admin' | 'reset'): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.PASSWORD_CHANGE,
      action: 'password_changed',
      details: {
        target_user_id: userId,
        change_method: method,
        change_time: new Date().toISOString()
      },
      risk_level: method === 'admin' ? 'medium' : 'low'
    });
  }

  public logEmailChange(oldEmail: string, newEmail: string): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.EMAIL_CHANGE,
      action: 'email_changed',
      details: {
        old_email: oldEmail,
        new_email: newEmail,
        change_time: new Date().toISOString()
      },
      risk_level: 'medium'
    });
  }

  public logDataExport(dataType: string, recordCount: number): void {
    this.logSecurityEvent({
      event_type: SecurityEventType.DATA_EXPORT,
      action: 'data_exported',
      details: {
        data_type: dataType,
        record_count: recordCount,
        export_time: new Date().toISOString()
      },
      risk_level: 'medium'
    });
  }
}

// Instância singleton
export const securityLogger = SecurityAuditLogger.getInstance();

// Hook para React
export function useSecurityLogger() {
  return {
    logEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp' | 'session_id' | 'user_id' | 'ip_address' | 'user_agent'>) => 
      securityLogger.logSecurityEvent(event),
    logLoginAttempt: (email: string, success: boolean, reason?: string) => 
      securityLogger.logLoginAttempt(email, success, reason),
    logDataAccess: (resourceType: string, resourceId: string, action: string) => 
      securityLogger.logDataAccess(resourceType, resourceId, action),
    logSensitiveDataAccess: (resourceType: string, resourceId: string, dataType: string) => 
      securityLogger.logSensitiveDataAccess(resourceType, resourceId, dataType),
    logFileUpload: (fileName: string, fileSize: number, fileType: string, bucketName: string) => 
      securityLogger.logFileUpload(fileName, fileSize, fileType, bucketName),
    logMaliciousFileBlocked: (fileName: string, reason: string) => 
      securityLogger.logMaliciousFileBlocked(fileName, reason),
    logUnauthorizedAccess: (resource: string, attemptedAction: string) => 
      securityLogger.logUnauthorizedAccess(resource, attemptedAction),
    logRateLimitExceeded: (endpoint: string, limit: number) => 
      securityLogger.logRateLimitExceeded(endpoint, limit),
    logSuspiciousActivity: (activityType: string, details: Record<string, any>) => 
      securityLogger.logSuspiciousActivity(activityType, details),
    logGDPRRequest: (requestType: string, dataSubject: string) => 
      securityLogger.logGDPRRequest(requestType, dataSubject),
    logPasswordChange: (userId: string, method: 'self' | 'admin' | 'reset') => 
      securityLogger.logPasswordChange(userId, method),
    logEmailChange: (oldEmail: string, newEmail: string) => 
      securityLogger.logEmailChange(oldEmail, newEmail),
    logDataExport: (dataType: string, recordCount: number) => 
      securityLogger.logDataExport(dataType, recordCount)
  };
}

// Cleanup ao sair da página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    securityLogger.shutdown();
  });
}

// Detectar atividades suspeitas automaticamente
if (typeof window !== 'undefined') {
  // Em produção isso pode gerar muitos eventos e, se o endpoint falhar, vira ruído.
  // Mantemos o detector apenas em DEV (ou quando explicitamente habilitado).
  const enabled = !import.meta.env.DEV; // Desabilitado em DEV para evitar ruído
  if (!enabled) {
    // noop
  } else {
  // Detectar tentativas de abertura de DevTools
  const devtools = { open: false, orientation: null };
  const threshold = 160;
  
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true;
        securityLogger.logSuspiciousActivity('devtools_opened', {
          window_dimensions: {
            outer: { width: window.outerWidth, height: window.outerHeight },
            inner: { width: window.innerWidth, height: window.innerHeight }
          }
        });
      }
    } else {
      devtools.open = false;
    }
  }, 500);

  // Detectar tentativas de copiar/colar em massa
  let clipboardEvents = 0;
  const resetClipboardCounter = () => { clipboardEvents = 0; };
  
  document.addEventListener('copy', () => {
    clipboardEvents++;
    if (clipboardEvents > 10) {
      securityLogger.logSuspiciousActivity('excessive_clipboard_usage', {
        events_count: clipboardEvents,
        time_window: '1_minute'
      });
    }
  });
  
  setInterval(resetClipboardCounter, 60000); // Reset a cada minuto

  // Detectar tentativas de injeção de script
  const originalEval = window.eval;
  window.eval = function(code: string) {
    securityLogger.logSuspiciousActivity('eval_usage_detected', {
      code_snippet: code.substring(0, 100),
      stack_trace: new Error().stack
    });
    return originalEval.call(this, code);
  };
  }
}