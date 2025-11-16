/**
 * Security Configuration
 * Centralized security settings and validation rules for the licensing system
 */

// Security levels
export const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export type SecurityLevel = typeof SECURITY_LEVELS[keyof typeof SECURITY_LEVELS]

// Rate limiting configuration
export const RATE_LIMITS = {
  // API endpoints
  LICENSE_VALIDATION: {
    requests: 100,
    window: 60000, // 1 minute
    blockDuration: 300000 // 5 minutes
  },
  LICENSE_ACTIVATION: {
    requests: 10,
    window: 60000, // 1 minute
    blockDuration: 600000 // 10 minutes
  },
  AUTH_ATTEMPTS: {
    requests: 5,
    window: 300000, // 5 minutes
    blockDuration: 900000 // 15 minutes
  },
  GENERAL_API: {
    requests: 1000,
    window: 60000, // 1 minute
    blockDuration: 60000 // 1 minute
  }
} as const

// Security validation rules
export const VALIDATION_RULES = {
  LICENSE_KEY: {
    minLength: 16,
    maxLength: 64,
    pattern: /^[A-Z0-9-]+$/,
    requiredSections: 4,
    sectionSeparator: '-'
  },
  DEVICE_ID: {
    minLength: 8,
    maxLength: 128,
    pattern: /^[a-zA-Z0-9-_]+$/
  },
  USER_AGENT: {
    maxLength: 512,
    suspiciousPatterns: [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i
    ]
  },
  IP_ADDRESS: {
    allowedRanges: [
      // Private IP ranges
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ],
    blockedRanges: [
      // Known malicious ranges (examples)
      /^0\./,
      /^169\.254\./,
      /^224\./,
      /^240\./
    ]
  }
} as const

// Audit event types
export const AUDIT_EVENTS = {
  // License events
  LICENSE_VALIDATED: 'license_validated',
  LICENSE_ACTIVATED: 'license_activated',
  LICENSE_DEACTIVATED: 'license_deactivated',
  LICENSE_EXPIRED: 'license_expired',
  LICENSE_INVALID: 'license_invalid',
  
  // Security events
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  BLOCKED_REQUEST: 'blocked_request',
  SECURITY_VIOLATION: 'security_violation',
  
  // Authentication events
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  TOKEN_EXPIRED: 'token_expired',
  
  // System events
  SYSTEM_ERROR: 'system_error',
  CONFIGURATION_CHANGED: 'configuration_changed',
  MAINTENANCE_MODE: 'maintenance_mode'
} as const

export type AuditEventType = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS]

// Security alert types
export const ALERT_TYPES = {
  BRUTE_FORCE: 'brute_force_attack',
  DDOS: 'ddos_attack',
  SUSPICIOUS_LICENSE: 'suspicious_license_activity',
  RATE_LIMIT_ABUSE: 'rate_limit_abuse',
  INVALID_REQUESTS: 'invalid_requests',
  SYSTEM_ANOMALY: 'system_anomaly',
  DATA_BREACH: 'data_breach_attempt',
  UNAUTHORIZED_ACCESS: 'unauthorized_access'
} as const

export type AlertType = typeof ALERT_TYPES[keyof typeof ALERT_TYPES]

// Risk scoring configuration
export const RISK_SCORING = {
  FACTORS: {
    FAILED_ATTEMPTS: 10,
    SUSPICIOUS_USER_AGENT: 15,
    BLOCKED_IP: 25,
    RAPID_REQUESTS: 20,
    INVALID_LICENSE: 30,
    MULTIPLE_DEVICES: 15,
    GEOGRAPHIC_ANOMALY: 20,
    TIME_ANOMALY: 10
  },
  THRESHOLDS: {
    LOW: 30,
    MEDIUM: 60,
    HIGH: 80,
    CRITICAL: 95
  }
} as const

// Security headers configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
} as const

// Edge Function endpoints
export const EDGE_FUNCTIONS = {
  VALIDATE_LICENSE: '/functions/v1/validate-license',
  AUDIT_SYSTEM: '/functions/v1/audit-system',
  RATE_LIMITER: '/functions/v1/rate-limiter',
  MONITORING: '/functions/v1/real-time-monitoring',
  NOTIFICATIONS: '/functions/v1/notification-system'
} as const

// Validation functions
export class SecurityValidator {
  /**
   * Validate license key format
   */
  static validateLicenseKey(licenseKey: string): boolean {
    const rules = VALIDATION_RULES.LICENSE_KEY
    
    if (!licenseKey || 
        licenseKey.length < rules.minLength || 
        licenseKey.length > rules.maxLength) {
      return false
    }
    
    if (!rules.pattern.test(licenseKey)) {
      return false
    }
    
    const sections = licenseKey.split(rules.sectionSeparator)
    return sections.length === rules.requiredSections
  }
  
  /**
   * Validate device ID format
   */
  static validateDeviceId(deviceId: string): boolean {
    const rules = VALIDATION_RULES.DEVICE_ID
    
    return deviceId && 
           deviceId.length >= rules.minLength && 
           deviceId.length <= rules.maxLength && 
           rules.pattern.test(deviceId)
  }
  
  /**
   * Check if user agent is suspicious
   */
  static isSuspiciousUserAgent(userAgent: string): boolean {
    if (!userAgent || userAgent.length > VALIDATION_RULES.USER_AGENT.maxLength) {
      return true
    }
    
    return VALIDATION_RULES.USER_AGENT.suspiciousPatterns.some(
      pattern => pattern.test(userAgent)
    )
  }
  
  /**
   * Check if IP address is in blocked range
   */
  static isBlockedIpAddress(ipAddress: string): boolean {
    return VALIDATION_RULES.IP_ADDRESS.blockedRanges.some(
      pattern => pattern.test(ipAddress)
    )
  }
  
  /**
   * Check if IP address is in allowed private range
   */
  static isPrivateIpAddress(ipAddress: string): boolean {
    return VALIDATION_RULES.IP_ADDRESS.allowedRanges.some(
      pattern => pattern.test(ipAddress)
    )
  }
  
  /**
   * Calculate risk score based on multiple factors
   */
  static calculateRiskScore(factors: Partial<Record<keyof typeof RISK_SCORING.FACTORS, number>>): number {
    let score = 0
    
    Object.entries(factors).forEach(([factor, count]) => {
      const weight = RISK_SCORING.FACTORS[factor as keyof typeof RISK_SCORING.FACTORS]
      if (weight && count) {
        score += weight * count
      }
    })
    
    return Math.min(score, 100) // Cap at 100
  }
  
  /**
   * Get security level based on risk score
   */
  static getSecurityLevel(riskScore: number): SecurityLevel {
    if (riskScore >= RISK_SCORING.THRESHOLDS.CRITICAL) return SECURITY_LEVELS.CRITICAL
    if (riskScore >= RISK_SCORING.THRESHOLDS.HIGH) return SECURITY_LEVELS.HIGH
    if (riskScore >= RISK_SCORING.THRESHOLDS.MEDIUM) return SECURITY_LEVELS.MEDIUM
    return SECURITY_LEVELS.LOW
  }
  
  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLogging(data: unknown): unknown {
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'credential']
    
    if (typeof data !== 'object' || data === null) {
      return data
    }
    
    const sanitized = { ...data }
    
    Object.keys(sanitized).forEach(key => {
      const lowerKey = key.toLowerCase()
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeForLogging(sanitized[key])
      }
    })
    
    return sanitized
  }
}

// Security middleware configuration
export const SECURITY_MIDDLEWARE = {
  CORS: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },
  
  RATE_LIMITING: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },
  
  HELMET: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'", 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }
} as const

// Export default configuration
export const SECURITY_CONFIG = {
  LEVELS: SECURITY_LEVELS,
  RATE_LIMITS,
  VALIDATION_RULES,
  AUDIT_EVENTS,
  ALERT_TYPES,
  RISK_SCORING,
  SECURITY_HEADERS,
  EDGE_FUNCTIONS,
  MIDDLEWARE: SECURITY_MIDDLEWARE,
  Validator: SecurityValidator
} as const

export default SECURITY_CONFIG