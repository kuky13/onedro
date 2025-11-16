/**
 * Security Hook
 * React hook for integrating security features in the frontend
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { SECURITY_CONFIG, SecurityValidator, type SecurityLevel, type AuditEventType } from '../utils/security-config'

interface SecurityState {
  isRateLimited: boolean
  riskScore: number
  securityLevel: SecurityLevel
  blockedUntil: Date | null
  lastAuditEvent: string | null
}

interface SecurityMetrics {
  totalRequests: number
  blockedRequests: number
  riskScore: number
  recentAlerts: number
}

interface AuditLogEntry {
  event_type: AuditEventType
  severity: SecurityLevel
  ip_address: string
  user_agent: string
  event_details: Record<string, any>
  created_at: string
}

interface SecurityAlert {
  id: string
  alert_type: string
  severity: SecurityLevel
  title: string
  description: string
  created_at: string
  status: string
}

export function useSecurity() {
  const [securityState, setSecurityState] = useState<SecurityState>({
    isRateLimited: false,
    riskScore: 0,
    securityLevel: 'low',
    blockedUntil: null,
    lastAuditEvent: null
  })
  
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalRequests: 0,
    blockedRequests: 0,
    riskScore: 0,
    recentAlerts: 0
  })
  
  const [recentAlerts, setRecentAlerts] = useState<SecurityAlert[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Check rate limiting status
   */
  const checkRateLimit = useCallback(async (endpoint: string) => {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/rate-limiter?action=check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          endpoint,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSecurityState(prev => ({
          ...prev,
          isRateLimited: data.is_blocked,
          riskScore: data.spam_score || 0,
          securityLevel: SecurityValidator.getSecurityLevel(data.spam_score || 0),
          blockedUntil: data.block_expires_at ? new Date(data.block_expires_at) : null
        }))
        
        return !data.is_blocked
      }
      
      return true
    } catch (err) {
      console.error('Rate limit check failed:', err)
      return true // Allow request if check fails
    }
  }, [])

  /**
   * Log audit event
   */
  const logAuditEvent = useCallback(async (
    eventType: AuditEventType,
    details: Record<string, any>,
    severity: SecurityLevel = 'info'
  ) => {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/audit-system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          event_type: eventType,
          event_details: SecurityValidator.sanitizeForLogging(details),
          severity,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSecurityState(prev => ({
          ...prev,
          lastAuditEvent: eventType
        }))
      }
      
      return data.success
    } catch (err) {
      console.error('Audit logging failed:', err)
      return false
    }
  }, [])

  /**
   * Validate license with security checks
   */
  const validateLicense = useCallback(async (
    licenseKey: string,
    deviceId: string
  ) => {
    try {
      // Client-side validation first
      if (!SecurityValidator.validateLicenseKey(licenseKey)) {
        await logAuditEvent('license_invalid', { 
          reason: 'invalid_format',
          license_key: licenseKey.substring(0, 8) + '...' 
        }, 'medium')
        throw new Error('Invalid license key format')
      }
      
      if (!SecurityValidator.validateDeviceId(deviceId)) {
        await logAuditEvent('license_invalid', { 
          reason: 'invalid_device_id',
          device_id: deviceId.substring(0, 8) + '...' 
        }, 'medium')
        throw new Error('Invalid device ID format')
      }
      
      // Check rate limiting
      const canProceed = await checkRateLimit('/validate-license')
      if (!canProceed) {
        throw new Error('Rate limit exceeded. Please try again later.')
      }
      
      // Call Edge Function for server-side validation
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/validate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          action: 'validate',
          license_key: licenseKey,
          device_id: deviceId
        })
      })
      
      const data = await response.json()
      
      // Log the validation attempt
      await logAuditEvent(
        data.success ? 'license_validated' : 'license_invalid',
        {
          license_key: licenseKey.substring(0, 8) + '...',
          device_id: deviceId.substring(0, 8) + '...',
          result: data.success ? 'valid' : 'invalid',
          reason: data.error || 'validation_completed'
        },
        data.success ? 'info' : 'medium'
      )
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
      throw err
    }
  }, [checkRateLimit, logAuditEvent])

  /**
   * Get security metrics
   */
  const getSecurityMetrics = useCallback(async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/real-time-monitoring?action=metrics`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMetrics({
          totalRequests: data.metrics.total_requests || 0,
          blockedRequests: data.metrics.blocked_requests || 0,
          riskScore: data.metrics.avg_risk_score || 0,
          recentAlerts: data.metrics.recent_alerts || 0
        })
      }
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get metrics')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get recent security alerts
   */
  const getRecentAlerts = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/real-time-monitoring?action=alerts&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      )
      
      const data = await response.json()
      
      if (data.success) {
        setRecentAlerts(data.alerts || [])
      }
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get alerts')
      throw err
    }
  }, [])

  /**
   * Get audit logs
   */
  const getAuditLogs = useCallback(async (filters?: {
    event_type?: AuditEventType
    severity?: SecurityLevel
    limit?: number
    offset?: number
  }) => {
    try {
      const params = new URLSearchParams()
      if (filters?.event_type) params.append('event_type', filters.event_type)
      if (filters?.severity) params.append('severity', filters.severity)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())
      
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/audit-system?action=query&${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }
      )
      
      const data = await response.json()
      
      if (data.success) {
        setAuditLogs(data.logs || [])
      }
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get audit logs')
      throw err
    }
  }, [])

  /**
   * Test notification system
   */
  const testNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/notification-system?action=test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test notifications')
      throw err
    }
  }, [])

  /**
   * Subscribe to real-time security alerts
   */
  useEffect(() => {
    const channel = supabase
      .channel('security-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_alerts'
        },
        (payload) => {
          const newAlert = payload.new as SecurityAlert
          setRecentAlerts(prev => [newAlert, ...prev.slice(0, 9)])
          
          // Update metrics
          setMetrics(prev => ({
            ...prev,
            recentAlerts: prev.recentAlerts + 1
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    securityState,
    metrics,
    recentAlerts,
    auditLogs,
    loading,
    error,
    
    // Actions
    checkRateLimit,
    logAuditEvent,
    validateLicense,
    getSecurityMetrics,
    getRecentAlerts,
    getAuditLogs,
    testNotifications,
    clearError,
    
    // Utilities
    SecurityValidator,
    SECURITY_CONFIG
  }
}

export default useSecurity