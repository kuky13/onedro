// Configuration for license validation Edge Function

export const RATE_LIMITS = {
  // Rate limits per IP address
  validation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute per IP
  },
  activation: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 activations per minute per IP
  },
  global: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 total requests per minute per IP
  },
} as const;

export const SECURITY_CONFIG = {
  // Maximum request body size (in bytes)
  maxBodySize: 1024 * 10, // 10KB
  
  // Required headers for security
  requiredHeaders: ['user-agent'] as const,
  
  // Blocked user agents (basic bot detection)
  blockedUserAgents: [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'curl',
    'wget',
    'python-requests',
  ] as const,
  
  // Suspicious patterns in requests
  suspiciousPatterns: {
    // SQL injection patterns
    sqlInjection: [
      /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i,
    ],
    // XSS patterns
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ],
    // Path traversal
    pathTraversal: [
      /\.\.\//g,
      /\.\.\\/g,
    ],
  },
} as const;

export const AUDIT_CONFIG = {
  // Events to log
  loggedEvents: [
    'license_validate',
    'license_activate', 
    'license_deactivate',
    'security_violation',
    'rate_limit_exceeded',
  ] as const,
  
  // Data retention (in days)
  retentionDays: 90,
  
  // Fields to exclude from logging (for privacy)
  excludeFromLogs: [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
  ] as const,
} as const;

export const VALIDATION_CONFIG = {
  // License validation rules
  maxDevicesPerLicense: 3,
  
  // Grace period for expired licenses (in days)
  gracePeriodDays: 7,
  
  // Minimum time between activations (in minutes)
  minActivationInterval: 5,
  
  // Maximum concurrent validations per user
  maxConcurrentValidations: 5,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  INVALID_REQUEST: 'Invalid request format.',
  UNAUTHORIZED: 'Unauthorized access.',
  LICENSE_NOT_FOUND: 'License not found.',
  LICENSE_EXPIRED: 'License has expired.',
  LICENSE_INACTIVE: 'License is not active.',
  MAX_DEVICES_REACHED: 'Maximum number of devices reached for this license.',
  SECURITY_VIOLATION: 'Security violation detected.',
  INTERNAL_ERROR: 'Internal server error.',
  INVALID_USER_AGENT: 'Invalid or suspicious user agent.',
  SUSPICIOUS_ACTIVITY: 'Suspicious activity detected.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LICENSE_VALID: 'License is valid and active.',
  LICENSE_ACTIVATED: 'License activated successfully.',
  LICENSE_DEACTIVATED: 'License deactivated successfully.',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// CORS configuration
export const CORS_CONFIG = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    // Add production domains here
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Client-Info',
    'apikey',
    'User-Agent',
  ],
  maxAge: 86400, // 24 hours
} as const;