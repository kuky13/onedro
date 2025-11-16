/**
 * Security Middleware
 * Centralized security layer for request validation and monitoring
 */

import { supabase } from '@/integrations/supabase/client'
import { SECURITY_CONFIG, SecurityValidator } from '../utils/security-config'

interface SecurityContext {
  userId?: string
  userRole?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

interface SecurityCheckResult {
  allowed: boolean
  reason?: string
  riskScore: number
  requiresAuth?: boolean
  rateLimited?: boolean
  blockedUntil?: Date
}

interface RequestMetadata {
  endpoint: string
  method: string
  timestamp: Date
  context: SecurityContext
  payload?: any
}

class SecurityMiddleware {
  private validator: SecurityValidator
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map()
  private blockedIPs: Set<string> = new Set()
  private suspiciousActivity: Map<string, number> = new Map()

  constructor() {
    this.validator = new SecurityValidator()
    this.startCleanupInterval()
  }

  /**
   * Main security check for incoming requests
   */
  async checkSecurity(metadata: RequestMetadata): Promise<SecurityCheckResult> {
    const { endpoint, method, context } = metadata
    const key = this.generateKey(context.ipAddress || 'unknown', context.userId)
    
    try {
      // 1. Check if IP is blocked
      if (context.ipAddress && this.blockedIPs.has(context.ipAddress)) {
        await this.logSecurityEvent('blocked_ip_attempt', metadata, 'high')
        return {
          allowed: false,
          reason: 'IP address is blocked',
          riskScore: 100,
          rateLimited: true
        }
      }

      // 2. Check rate limiting
      const rateLimitResult = await this.checkRateLimit(endpoint, key, context)
      if (!rateLimitResult.allowed) {
        return rateLimitResult
      }

      // 3. Validate request format and content
      const validationResult = this.validateRequest(metadata)
      if (!validationResult.allowed) {
        await this.logSecurityEvent('validation_failed', metadata, 'medium')
        return validationResult
      }

      // 4. Check for suspicious patterns
      const suspiciousResult = await this.checkSuspiciousActivity(metadata)
      if (!suspiciousResult.allowed) {
        return suspiciousResult
      }

      // 5. Calculate overall risk score
      const riskScore = this.calculateRiskScore(metadata)
      
      // 6. Log successful request
      await this.logSecurityEvent('request_allowed', metadata, 'info')
      
      return {
        allowed: true,
        riskScore,
        requiresAuth: this.requiresAuthentication(endpoint)
      }
    } catch (error) {
      console.error('Security check failed:', error)
      await this.logSecurityEvent('security_check_error', metadata, 'high')
      
      // Fail secure - deny access on error
      return {
        allowed: false,
        reason: 'Security check failed',
        riskScore: 80
      }
    }
  }

  /**
   * Check rate limiting for the request
   */
  private async checkRateLimit(
    endpoint: string, 
    key: string, 
    context: SecurityContext
  ): Promise<SecurityCheckResult> {
    const limits = SECURITY_CONFIG.RATE_LIMITS[endpoint] || SECURITY_CONFIG.RATE_LIMITS.GENERAL_API
    const now = Date.now()
    const windowStart = now - (limits.windowMs || 60000)
    
    // Get current count for this key
    const current = this.requestCounts.get(key)
    if (!current || current.resetTime < windowStart) {
      // Reset or initialize counter
      this.requestCounts.set(key, { count: 1, resetTime: now })
      return { allowed: true, riskScore: 0 }
    }

    // Increment counter
    current.count++
    this.requestCounts.set(key, current)

    // Check if limit exceeded
    if (current.count > limits.max) {
      const blockedUntil = new Date(now + (limits.blockDurationMs || 300000))
      
      // Add to suspicious activity
      const suspiciousCount = this.suspiciousActivity.get(key) || 0
      this.suspiciousActivity.set(key, suspiciousCount + 1)
      
      // Block IP if too many violations
      if (suspiciousCount > 5 && context.ipAddress) {
        this.blockedIPs.add(context.ipAddress)
        await this.logSecurityEvent('ip_blocked', {
          endpoint: 'security',
          method: 'POST',
          timestamp: new Date(),
          context
        }, 'critical')
      }

      await this.logSecurityEvent('rate_limit_exceeded', {
        endpoint,
        method: 'POST',
        timestamp: new Date(),
        context,
        payload: { limit: limits.max, current: current.count }
      }, 'high')

      return {
        allowed: false,
        reason: `Rate limit exceeded. Try again after ${new Date(blockedUntil).toLocaleTimeString()}`,
        riskScore: 90,
        rateLimited: true,
        blockedUntil
      }
    }

    return { allowed: true, riskScore: (current.count / limits.max) * 30 }
  }

  /**
   * Validate request format and content
   */
  private validateRequest(metadata: RequestMetadata): SecurityCheckResult {
    const { context, payload } = metadata
    let riskScore = 0
    const issues: string[] = []

    // Validate IP address format
    if (context.ipAddress && !this.validator.isValidIP(context.ipAddress)) {
      issues.push('Invalid IP address format')
      riskScore += 20
    }

    // Validate User Agent
    if (context.userAgent) {
      if (!this.validator.isValidUserAgent(context.userAgent)) {
        issues.push('Suspicious user agent')
        riskScore += 30
      }
    } else {
      issues.push('Missing user agent')
      riskScore += 10
    }

    // Validate payload if present
    if (payload) {
      if (typeof payload === 'string' && payload.length > 10000) {
        issues.push('Payload too large')
        riskScore += 25
      }
      
      // Check for potential injection attempts
      const payloadStr = JSON.stringify(payload).toLowerCase()
      const suspiciousPatterns = ['<script', 'javascript:', 'eval(', 'union select', 'drop table']
      
      for (const pattern of suspiciousPatterns) {
        if (payloadStr.includes(pattern)) {
          issues.push('Potential injection attempt detected')
          riskScore += 50
          break
        }
      }
    }

    if (issues.length > 0) {
      return {
        allowed: riskScore < 50,
        reason: issues.join(', '),
        riskScore
      }
    }

    return { allowed: true, riskScore }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkSuspiciousActivity(metadata: RequestMetadata): Promise<SecurityCheckResult> {
    const { context, endpoint } = metadata
    const key = this.generateKey(context.ipAddress || 'unknown', context.userId)
    let riskScore = 0
    const issues: string[] = []

    // Check for rapid requests from same source
    const recentRequests = await this.getRecentRequests(key)
    if (recentRequests.length > 10) {
      issues.push('Rapid request pattern detected')
      riskScore += 40
    }

    // Check for unusual access patterns
    if (endpoint.includes('admin') && context.userRole !== 'admin') {
      issues.push('Unauthorized admin access attempt')
      riskScore += 60
    }

    // Check for geographic anomalies (simplified)
    if (context.ipAddress && this.isUnusualLocation(context.ipAddress)) {
      issues.push('Access from unusual location')
      riskScore += 20
    }

    // Check for session anomalies
    if (context.sessionId && await this.hasSessionAnomalies(context.sessionId)) {
      issues.push('Session anomalies detected')
      riskScore += 30
    }

    if (riskScore > 70) {
      await this.logSecurityEvent('suspicious_activity', metadata, 'high')
      return {
        allowed: false,
        reason: issues.join(', '),
        riskScore
      }
    }

    return { allowed: true, riskScore }
  }

  /**
   * Calculate overall risk score for the request
   */
  private calculateRiskScore(metadata: RequestMetadata): number {
    const { context, endpoint } = metadata
    let score = 0

    // Base score based on endpoint sensitivity
    if (endpoint.includes('admin')) score += 20
    if (endpoint.includes('license')) score += 15
    if (endpoint.includes('payment')) score += 25

    // User authentication status
    if (!context.userId) score += 10
    
    // Time-based factors
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) score += 5 // Outside business hours

    // IP reputation (simplified)
    if (context.ipAddress && this.isKnownBadIP(context.ipAddress)) {
      score += 50
    }

    return Math.min(score, 100)
  }

  /**
   * Log security events to audit system
   */
  private async logSecurityEvent(
    eventType: string, 
    metadata: RequestMetadata, 
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('audit_logs').insert({
        user_id: user?.id || null,
        event_type: eventType,
        severity,
        ip_address: metadata.context.ipAddress,
        user_agent: metadata.context.userAgent,
        endpoint: metadata.endpoint,
        event_details: {
          method: metadata.method,
          timestamp: metadata.timestamp.toISOString(),
          payload: this.validator.sanitizeSensitiveData(metadata.payload || {}),
          context: metadata.context
        }
      })
    } catch (error) {
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Helper methods
   */
  private generateKey(ip: string, userId?: string): string {
    return userId ? `user:${userId}` : `ip:${ip}`
  }

  private requiresAuthentication(endpoint: string): boolean {
    const publicEndpoints = ['/api/health', '/api/public']
    return !publicEndpoints.some(ep => endpoint.startsWith(ep))
  }

  private async getRecentRequests(key: string): Promise<any[]> {
    // Simplified - in real implementation, query from database
    return []
  }

  private isUnusualLocation(ip: string): boolean {
    // Simplified geolocation check
    return false
  }

  private async hasSessionAnomalies(sessionId: string): Promise<boolean> {
    // Check for session hijacking indicators
    return false
  }

  private isKnownBadIP(ip: string): boolean {
    // Check against IP reputation database
    const knownBadIPs = ['127.0.0.1'] // Example
    return knownBadIPs.includes(ip)
  }

  private startCleanupInterval(): void {
    // Clean up old entries every 5 minutes
    setInterval(() => {
      const now = Date.now()
      const fiveMinutesAgo = now - 300000
      
      // Clean request counts
      for (const [key, data] of this.requestCounts.entries()) {
        if (data.resetTime < fiveMinutesAgo) {
          this.requestCounts.delete(key)
        }
      }
      
      // Clean suspicious activity (keep for 1 hour)
      const oneHourAgo = now - 3600000
      for (const [key, timestamp] of this.suspiciousActivity.entries()) {
        if (timestamp < oneHourAgo) {
          this.suspiciousActivity.delete(key)
        }
      }
    }, 300000) // 5 minutes
  }

  /**
   * Public methods for external use
   */
  async checkRateLimitStatus(userId?: string, ipAddress?: string): Promise<{
    isLimited: boolean
    remainingRequests: number
    resetTime: Date
  }> {
    const key = this.generateKey(ipAddress || 'unknown', userId)
    const current = this.requestCounts.get(key)
    const limits = SECURITY_CONFIG.RATE_LIMITS.GENERAL_API
    
    if (!current) {
      return {
        isLimited: false,
        remainingRequests: limits.max,
        resetTime: new Date(Date.now() + limits.windowMs)
      }
    }
    
    return {
      isLimited: current.count >= limits.max,
      remainingRequests: Math.max(0, limits.max - current.count),
      resetTime: new Date(current.resetTime + limits.windowMs)
    }
  }

  async unblockIP(ipAddress: string): Promise<boolean> {
    if (this.blockedIPs.has(ipAddress)) {
      this.blockedIPs.delete(ipAddress)
      await this.logSecurityEvent('ip_unblocked', {
        endpoint: 'security',
        method: 'POST',
        timestamp: new Date(),
        context: { ipAddress }
      }, 'info')
      return true
    }
    return false
  }

  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs)
  }

  getSecurityStats(): {
    totalRequests: number
    blockedIPs: number
    suspiciousActivities: number
  } {
    return {
      totalRequests: this.requestCounts.size,
      blockedIPs: this.blockedIPs.size,
      suspiciousActivities: this.suspiciousActivity.size
    }
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware()

// Export types
export type { SecurityContext, SecurityCheckResult, RequestMetadata }

// Utility function for easy integration
export async function validateRequest(
  endpoint: string,
  method: string = 'GET',
  context: Partial<SecurityContext> = {},
  payload?: any
): Promise<SecurityCheckResult> {
  const metadata: RequestMetadata = {
    endpoint,
    method,
    timestamp: new Date(),
    context: {
      ipAddress: context.ipAddress || 'unknown',
      userAgent: context.userAgent || navigator.userAgent,
      ...context
    },
    payload
  }
  
  return securityMiddleware.checkSecurity(metadata)
}

// React hook for easy component integration
export function useSecurityMiddleware() {
  const checkRequest = async (
    endpoint: string,
    options: {
      method?: string
      payload?: any
      showToast?: boolean
    } = {}
  ) => {
    const { method = 'GET', payload, showToast = true } = options
    
    const result = await validateRequest(endpoint, method, {}, payload)
    
    if (!result.allowed && showToast) {
      // Note: Toast should be handled by the calling component using useToast hook
      console.warn('Security policy violation:', result.reason || 'Request blocked by security policy')
    }
    
    return result
  }
  
  const getRateLimitStatus = async () => {
    return securityMiddleware.checkRateLimitStatus()
  }
  
  const getSecurityStats = () => {
    return securityMiddleware.getSecurityStats()
  }
  
  return {
    checkRequest,
    getRateLimitStatus,
    getSecurityStats
  }
}