// Utility functions for license validation Edge Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { RATE_LIMITS, SECURITY_CONFIG, AUDIT_CONFIG, ERROR_MESSAGES } from './config.ts';

// Types
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface SecurityCheckResult {
  passed: boolean;
  violations: string[];
}

export interface AuditLogData {
  event_type: string;
  user_id?: string;
  license_id?: string;
  ip_address: string;
  user_agent: string;
  request_data?: any;
  response_data?: any;
  success: boolean;
  error_message?: string;
}

// In-memory rate limiting store (for Edge Function)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check rate limits for IP address
 */
export function checkRateLimit(
  ip: string,
  type: 'validation' | 'activation' | 'global'
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const key = `${ip}:${type}`;
  const now = Date.now();
  
  // Clean expired entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetTime <= now) {
      rateLimitStore.delete(k);
    }
  }
  
  const current = rateLimitStore.get(key);
  
  if (!current || current.resetTime <= now) {
    // First request or window expired
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  if (current.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime,
    };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return {
    allowed: true,
    remaining: config.maxRequests - current.count,
    resetTime: current.resetTime,
  };
}

/**
 * Perform security checks on request
 */
export function performSecurityChecks(
  request: Request,
  body?: any
): SecurityCheckResult {
  const violations: string[] = [];
  
  // Check user agent
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  
  if (!userAgent) {
    violations.push('Missing user agent');
  } else {
    // Check for blocked user agents
    for (const blocked of SECURITY_CONFIG.blockedUserAgents) {
      if (userAgent.includes(blocked.toLowerCase())) {
        violations.push(`Blocked user agent: ${blocked}`);
        break;
      }
    }
  }
  
  // Check required headers
  for (const header of SECURITY_CONFIG.requiredHeaders) {
    if (!request.headers.get(header)) {
      violations.push(`Missing required header: ${header}`);
    }
  }
  
  // Check request body for suspicious patterns
  if (body) {
    const bodyStr = JSON.stringify(body).toLowerCase();
    
    // SQL injection check
    for (const pattern of SECURITY_CONFIG.suspiciousPatterns.sqlInjection) {
      if (pattern.test(bodyStr)) {
        violations.push('Potential SQL injection detected');
        break;
      }
    }
    
    // XSS check
    for (const pattern of SECURITY_CONFIG.suspiciousPatterns.xss) {
      if (pattern.test(bodyStr)) {
        violations.push('Potential XSS detected');
        break;
      }
    }
    
    // Path traversal check
    for (const pattern of SECURITY_CONFIG.suspiciousPatterns.pathTraversal) {
      if (pattern.test(bodyStr)) {
        violations.push('Potential path traversal detected');
        break;
      }
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Try various headers for IP address
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (take first one)
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }
  
  // Fallback to a default IP if none found
  return '0.0.0.0';
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitized = { ...data };
  
  // Remove sensitive fields
  for (const field of AUDIT_CONFIG.excludeFromLogs) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value);
    }
  }
  
  return sanitized;
}

/**
 * Log audit event to database
 */
export async function logAuditEvent(
  supabase: any,
  data: AuditLogData
): Promise<void> {
  try {
    // Sanitize sensitive data
    const sanitizedData = {
      ...data,
      request_data: sanitizeForLogging(data.request_data),
      response_data: sanitizeForLogging(data.response_data),
    };
    
    const { error } = await supabase
      .from('license_validation_audit')
      .insert([sanitizedData]);
    
    if (error) {
      console.error('Failed to log audit event:', error);
    }
  } catch (err) {
    console.error('Error logging audit event:', err);
  }
}

/**
 * Validate request body structure
 */
export function validateRequestBody(body: any, requiredFields: string[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    errors.push('Request body must be a valid JSON object');
    return { valid: false, errors };
  }
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check for extra fields (basic validation)
  const allowedFields = [...requiredFields, 'device_info', 'metadata'];
  for (const field of Object.keys(body)) {
    if (!allowedFields.includes(field)) {
      errors.push(`Unexpected field: ${field}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
  details?: any
): Response {
  const errorResponse = {
    success: false,
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    },
  };
  
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Error-Code': status.toString(),
    },
  });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(
  data: any,
  message?: string
): Response {
  const successResponse = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  };
  
  return new Response(JSON.stringify(successResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCORS(request: Request, allowedOrigins: string[]): Response | null {
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    const headers = new Headers();
    
    // Check if origin is allowed
    if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
      headers.set('Access-Control-Allow-Origin', origin);
    }
    
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(null, { status: 204, headers });
  }
  
  return null;
}

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(response: Response, origin: string | null, allowedOrigins: string[]): Response {
  const headers = new Headers(response.headers);
  
  // Add CORS headers
  if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes('*'))) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Info, apikey');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Check if license is within grace period
 */
export function isWithinGracePeriod(expirationDate: string, graceDays: number): boolean {
  const expDate = new Date(expirationDate);
  const now = new Date();
  const gracePeriodEnd = new Date(expDate.getTime() + (graceDays * 24 * 60 * 60 * 1000));
  
  return now <= gracePeriodEnd;
}

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse and validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}