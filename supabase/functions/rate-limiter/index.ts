import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Different rate limit strategies
  strategies: {
    // IP-based rate limiting
    ip: {
      window: 60000, // 1 minute
      maxRequests: 60,
      blockDuration: 300000 // 5 minutes
    },
    
    // User-based rate limiting
    user: {
      window: 60000, // 1 minute
      maxRequests: 100,
      blockDuration: 600000 // 10 minutes
    },
    
    // Endpoint-specific rate limiting
    endpoints: {
      '/validate-license': {
        window: 60000,
        maxRequests: 30,
        blockDuration: 300000
      },
      '/activate-license': {
        window: 300000, // 5 minutes
        maxRequests: 5,
        blockDuration: 900000 // 15 minutes
      },
      '/admin-actions': {
        window: 60000,
        maxRequests: 20,
        blockDuration: 1800000 // 30 minutes
      },
      '/user-login': {
        window: 300000, // 5 minutes
        maxRequests: 5,
        blockDuration: 900000 // 15 minutes
      }
    },
    
    // Global rate limiting
    global: {
      window: 60000,
      maxRequests: 1000,
      blockDuration: 600000
    }
  },
  
  // Anti-spam patterns
  antiSpam: {
    // Suspicious patterns
    patterns: {
      rapidRequests: {
        threshold: 10,
        timeWindow: 10000, // 10 seconds
        penalty: 300000 // 5 minutes block
      },
      
      repeatedFailures: {
        threshold: 5,
        timeWindow: 300000, // 5 minutes
        penalty: 900000 // 15 minutes block
      },
      
      suspiciousUserAgent: {
        blockedAgents: [
          'bot', 'crawler', 'spider', 'scraper',
          'curl', 'wget', 'python-requests'
        ],
        penalty: 3600000 // 1 hour block
      },
      
      maliciousPayload: {
        patterns: [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi,
          /'\s*(or|and)\s*'\w*'\s*=\s*'\w*'/gi,
          /union\s+select/gi,
          /drop\s+table/gi
        ],
        penalty: 1800000 // 30 minutes block
      }
    },
    
    // Whitelist for trusted IPs/users
    whitelist: {
      ips: [
        '127.0.0.1',
        '::1'
      ],
      userRoles: ['admin', 'system']
    },
    
    // Progressive penalties
    progressivePenalties: {
      enabled: true,
      multiplier: 2,
      maxPenalty: 86400000 // 24 hours
    }
  },
  
  // Storage configuration
  storage: {
    cleanupInterval: 3600000, // 1 hour
    maxEntries: 10000
  }
}

// Types
interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
  blocked: boolean
  blockUntil?: number
  violations: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  reason?: string
  violationType?: string
}

interface AntiSpamResult {
  blocked: boolean
  reason?: string
  penalty?: number
  pattern?: string
}

// In-memory storage for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, RateLimitEntry>()
const blockedEntities = new Map<string, { until: number; reason: string; violations: number }>()

// Utility functions
function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown'
}

function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}

function generateKey(type: string, identifier: string, endpoint?: string): string {
  return endpoint ? `${type}:${identifier}:${endpoint}` : `${type}:${identifier}`
}

function isWhitelisted(ip: string, userRole?: string): boolean {
  if (RATE_LIMIT_CONFIG.antiSpam.whitelist.ips.includes(ip)) {
    return true
  }
  
  if (userRole && RATE_LIMIT_CONFIG.antiSpam.whitelist.userRoles.includes(userRole)) {
    return true
  }
  
  return false
}

function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  // Clean up rate limit entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.blockUntil && entry.blockUntil < now) {
      entry.blocked = false
      entry.blockUntil = undefined
    }
    
    // Remove old entries
    if (now - entry.lastRequest > RATE_LIMIT_CONFIG.storage.cleanupInterval) {
      rateLimitStore.delete(key)
    }
  }
  
  // Clean up blocked entities
  for (const [key, block] of blockedEntities.entries()) {
    if (block.until < now) {
      blockedEntities.delete(key)
    }
  }
  
  // Limit storage size
  if (rateLimitStore.size > RATE_LIMIT_CONFIG.storage.maxEntries) {
    const entries = Array.from(rateLimitStore.entries())
    entries.sort((a, b) => a[1].lastRequest - b[1].lastRequest)
    
    const toDelete = entries.slice(0, Math.floor(RATE_LIMIT_CONFIG.storage.maxEntries * 0.1))
    for (const [key] of toDelete) {
      rateLimitStore.delete(key)
    }
  }
}

// Anti-spam detection
function detectSpamPatterns(request: Request, body: string, ip: string): AntiSpamResult {
  const userAgent = getUserAgent(request).toLowerCase()
  const patterns = RATE_LIMIT_CONFIG.antiSpam.patterns
  
  // Check suspicious user agent
  for (const blockedAgent of patterns.suspiciousUserAgent.blockedAgents) {
    if (userAgent.includes(blockedAgent)) {
      return {
        blocked: true,
        reason: 'Suspicious user agent detected',
        penalty: patterns.suspiciousUserAgent.penalty,
        pattern: 'suspicious_user_agent'
      }
    }
  }
  
  // Check malicious payload patterns
  for (const pattern of patterns.maliciousPayload.patterns) {
    if (pattern.test(body)) {
      return {
        blocked: true,
        reason: 'Malicious payload detected',
        penalty: patterns.maliciousPayload.penalty,
        pattern: 'malicious_payload'
      }
    }
  }
  
  // Check rapid requests pattern
  const rapidKey = `rapid:${ip}`
  const rapidEntry = rateLimitStore.get(rapidKey)
  const now = Date.now()
  
  if (rapidEntry) {
    if (now - rapidEntry.firstRequest < patterns.rapidRequests.timeWindow) {
      rapidEntry.count++
      rapidEntry.lastRequest = now
      
      if (rapidEntry.count >= patterns.rapidRequests.threshold) {
        return {
          blocked: true,
          reason: 'Rapid requests detected',
          penalty: patterns.rapidRequests.penalty,
          pattern: 'rapid_requests'
        }
      }
    } else {
      // Reset window
      rapidEntry.count = 1
      rapidEntry.firstRequest = now
      rapidEntry.lastRequest = now
    }
  } else {
    rateLimitStore.set(rapidKey, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
      blocked: false,
      violations: 0
    })
  }
  
  return { blocked: false }
}

// Rate limiting logic
function checkRateLimit(
  key: string,
  config: { window: number; maxRequests: number; blockDuration: number }
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  // Check if currently blocked
  if (entry?.blocked && entry.blockUntil && entry.blockUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockUntil,
      retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
      reason: 'Rate limit exceeded - currently blocked'
    }
  }
  
  if (!entry) {
    // First request
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      lastRequest: now,
      blocked: false,
      violations: 0
    })
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.window
    }
  }
  
  // Check if window has expired
  if (now - entry.firstRequest >= config.window) {
    // Reset window
    entry.count = 1
    entry.firstRequest = now
    entry.lastRequest = now
    entry.blocked = false
    entry.blockUntil = undefined
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.window
    }
  }
  
  // Increment count
  entry.count++
  entry.lastRequest = now
  
  if (entry.count > config.maxRequests) {
    // Rate limit exceeded
    entry.blocked = true
    entry.violations++
    
    // Apply progressive penalties
    let blockDuration = config.blockDuration
    if (RATE_LIMIT_CONFIG.antiSpam.progressivePenalties.enabled) {
      const multiplier = Math.pow(
        RATE_LIMIT_CONFIG.antiSpam.progressivePenalties.multiplier,
        entry.violations - 1
      )
      blockDuration = Math.min(
        blockDuration * multiplier,
        RATE_LIMIT_CONFIG.antiSpam.progressivePenalties.maxPenalty
      )
    }
    
    entry.blockUntil = now + blockDuration
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.blockUntil,
      retryAfter: Math.ceil(blockDuration / 1000),
      reason: 'Rate limit exceeded',
      violationType: 'rate_limit'
    }
  }
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.firstRequest + config.window
  }
}

// Main rate limiting function
async function enforceRateLimit(
  request: Request,
  body: string,
  supabase: any
): Promise<RateLimitResult> {
  const ip = getClientIp(request)
  const url = new URL(request.url)
  const endpoint = url.pathname
  const authHeader = request.headers.get('authorization')
  
  let userId: string | null = null
  let userRole: string | null = null
  
  // Extract user info if authenticated
  if (authHeader) {
    try {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      if (user) {
        userId = user.id
        
        // Get user role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        userRole = profile?.role
      }
    } catch (error) {
      // Invalid token, continue without user info
    }
  }
  
  // Check whitelist
  if (isWhitelisted(ip, userRole)) {
    return {
      allowed: true,
      remaining: 999999,
      resetTime: Date.now() + 3600000
    }
  }
  
  // Check if IP/user is currently blocked
  const blockKey = userId ? `user:${userId}` : `ip:${ip}`
  const blocked = blockedEntities.get(blockKey)
  if (blocked && blocked.until > Date.now()) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: blocked.until,
      retryAfter: Math.ceil((blocked.until - Date.now()) / 1000),
      reason: blocked.reason
    }
  }
  
  // Anti-spam detection
  const spamResult = detectSpamPatterns(request, body, ip)
  if (spamResult.blocked) {
    // Block the entity
    const blockUntil = Date.now() + (spamResult.penalty || 300000)
    blockedEntities.set(blockKey, {
      until: blockUntil,
      reason: spamResult.reason || 'Spam detected',
      violations: (blocked?.violations || 0) + 1
    })
    
    // Log security event
    await supabase
      .from('audit_logs')
      .insert({
        id: `spam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'spam_detected',
        user_id: userId,
        ip_address: ip,
        event_details: {
          pattern: spamResult.pattern,
          endpoint,
          userAgent: getUserAgent(request)
        },
        severity: 'high',
        success: false,
        error_message: spamResult.reason,
        risk_score: 85
      })
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: blockUntil,
      retryAfter: Math.ceil((spamResult.penalty || 300000) / 1000),
      reason: spamResult.reason,
      violationType: 'spam_detection'
    }
  }
  
  // Apply rate limiting strategies
  const strategies = RATE_LIMIT_CONFIG.strategies
  
  // 1. Global rate limiting
  const globalKey = 'global:all'
  const globalResult = checkRateLimit(globalKey, strategies.global)
  if (!globalResult.allowed) {
    return { ...globalResult, violationType: 'global_limit' }
  }
  
  // 2. IP-based rate limiting
  const ipKey = generateKey('ip', ip)
  const ipResult = checkRateLimit(ipKey, strategies.ip)
  if (!ipResult.allowed) {
    return { ...ipResult, violationType: 'ip_limit' }
  }
  
  // 3. User-based rate limiting (if authenticated)
  if (userId) {
    const userKey = generateKey('user', userId)
    const userResult = checkRateLimit(userKey, strategies.user)
    if (!userResult.allowed) {
      return { ...userResult, violationType: 'user_limit' }
    }
  }
  
  // 4. Endpoint-specific rate limiting
  const endpointConfig = strategies.endpoints[endpoint]
  if (endpointConfig) {
    const endpointKey = generateKey('endpoint', ip, endpoint)
    const endpointResult = checkRateLimit(endpointKey, endpointConfig)
    if (!endpointResult.allowed) {
      return { ...endpointResult, violationType: 'endpoint_limit' }
    }
  }
  
  // All checks passed
  return {
    allowed: true,
    remaining: Math.min(
      globalResult.remaining,
      ipResult.remaining,
      userId ? checkRateLimit(generateKey('user', userId), strategies.user).remaining : Infinity
    ),
    resetTime: Math.max(
      globalResult.resetTime,
      ipResult.resetTime
    )
  }
}

// Statistics and monitoring
async function getRateLimitStats(): Promise<any> {
  const now = Date.now()
  const stats = {
    timestamp: new Date().toISOString(),
    totalEntries: rateLimitStore.size,
    blockedEntities: blockedEntities.size,
    activeBlocks: 0,
    topViolators: [] as any[],
    violationsByType: {} as Record<string, number>,
    memoryUsage: {
      rateLimitStore: rateLimitStore.size,
      blockedEntities: blockedEntities.size
    }
  }
  
  // Count active blocks
  for (const [, block] of blockedEntities) {
    if (block.until > now) {
      stats.activeBlocks++
    }
  }
  
  // Get top violators
  const violators = Array.from(rateLimitStore.entries())
    .filter(([, entry]) => entry.violations > 0)
    .sort((a, b) => b[1].violations - a[1].violations)
    .slice(0, 10)
    .map(([key, entry]) => ({
      key,
      violations: entry.violations,
      lastViolation: new Date(entry.lastRequest).toISOString(),
      blocked: entry.blocked
    }))
  
  stats.topViolators = violators
  
  return stats
}

// Cleanup function
setInterval(cleanupExpiredEntries, RATE_LIMIT_CONFIG.storage.cleanupInterval)

// Main handler
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'check'
    
    if (action === 'stats') {
      // Return rate limiting statistics
      const stats = await getRateLimitStats()
      
      return new Response(
        JSON.stringify({
          success: true,
          stats
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    if (action === 'reset') {
      // Reset rate limits (admin only)
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        )
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (!user) throw new Error('Invalid token')
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profile?.role !== 'admin') {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin access required' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 403
            }
          )
        }
        
        // Reset all rate limits
        rateLimitStore.clear()
        blockedEntities.clear()
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Rate limits reset successfully'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
        
      } catch (error) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication failed' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401
          }
        )
      }
    }
    
    // Default: Check rate limit
    const body = req.method === 'POST' ? await req.text() : ''
    const result = await enforceRateLimit(req, body, supabase)
    
    const responseHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString()
    }
    
    if (result.retryAfter) {
      responseHeaders['Retry-After'] = result.retryAfter.toString()
    }
    
    if (!result.allowed) {
      // Log rate limit violation
      await supabase
        .from('audit_logs')
        .insert({
          id: `rate_limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          event_type: 'rate_limit_exceeded',
          ip_address: getClientIp(req),
          event_details: {
            endpoint: url.pathname,
            violationType: result.violationType,
            userAgent: getUserAgent(req)
          },
          severity: 'medium',
          success: false,
          error_message: result.reason,
          risk_score: 60
        })
    }
    
    return new Response(
      JSON.stringify({
        success: result.allowed,
        rateLimitInfo: result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: responseHeaders,
        status: result.allowed ? 200 : 429
      }
    )
    
  } catch (error) {
    console.error('Rate limiter error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})