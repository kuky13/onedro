import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuration for real-time monitoring
const MONITORING_CONFIG = {
  // Alert thresholds
  thresholds: {
    failedLoginsPerHour: 10,
    rapidLicenseActivations: 5,
    highRiskEventsPerHour: 3,
    suspiciousIpActivity: 20,
    criticalEventsImmediate: 1
  },
  
  // Monitoring intervals
  intervals: {
    patternDetection: 60000, // 1 minute
    alertProcessing: 30000,  // 30 seconds
    healthCheck: 300000      // 5 minutes
  },
  
  // Alert channels
  alertChannels: {
    email: true,
    webhook: true,
    database: true,
    realtime: true
  },
  
  // Event types to monitor
  monitoredEvents: [
    'user_login',
    'license_activation',
    'license_validation',
    'security_violation',
    'rate_limit_exceeded',
    'suspicious_activity',
    'admin_action'
  ],
  
  // Risk levels
  riskLevels: {
    low: { min: 0, max: 30, color: '#22c55e' },
    medium: { min: 31, max: 60, color: '#f59e0b' },
    high: { min: 61, max: 80, color: '#ef4444' },
    critical: { min: 81, max: 100, color: '#dc2626' }
  }
}

// Types
interface MonitoringAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  data: any
  timestamp: string
  resolved: boolean
  actions?: string[]
}

interface SecurityMetrics {
  totalEvents: number
  failedEvents: number
  highRiskEvents: number
  uniqueUsers: number
  uniqueIps: number
  avgRiskScore: number
  topEventTypes: Array<{ event_type: string; count: number }>
  riskDistribution: Record<string, number>
}

// Utility functions
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getRiskLevel(score: number): string {
  for (const [level, config] of Object.entries(MONITORING_CONFIG.riskLevels)) {
    if (score >= config.min && score <= config.max) {
      return level
    }
  }
  return 'low'
}

function sanitizeData(data: any): any {
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth']
  
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const sanitized = { ...data }
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  return sanitized
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown'
}

// Core monitoring functions
async function detectSuspiciousPatterns(supabase: any): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = []
  const now = new Date().toISOString()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  try {
    // Detect multiple failed logins from same IP
    const { data: failedLogins } = await supabase
      .from('audit_logs')
      .select('ip_address, count(*)')
      .eq('event_type', 'user_login')
      .eq('success', false)
      .gte('created_at', oneHourAgo)
      .group('ip_address')
      .having('count(*) >= ?', [MONITORING_CONFIG.thresholds.failedLoginsPerHour])
    
    if (failedLogins?.length > 0) {
      for (const login of failedLogins) {
        alerts.push({
          id: generateAlertId(),
          type: 'multiple_failed_logins',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          description: `${login.count} failed login attempts from IP ${login.ip_address} in the last hour`,
          data: sanitizeData(login),
          timestamp: now,
          resolved: false,
          actions: ['block_ip', 'investigate_user', 'notify_admin']
        })
      }
    }
    
    // Detect rapid license activations
    const { data: rapidActivations } = await supabase
      .from('audit_logs')
      .select('user_id, count(*)')
      .eq('event_type', 'license_activation')
      .eq('success', true)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .group('user_id')
      .having('count(*) >= ?', [MONITORING_CONFIG.thresholds.rapidLicenseActivations])
    
    if (rapidActivations?.length > 0) {
      for (const activation of rapidActivations) {
        alerts.push({
          id: generateAlertId(),
          type: 'rapid_license_activations',
          severity: 'medium',
          title: 'Rapid License Activations',
          description: `User ${activation.user_id} activated ${activation.count} licenses in 10 minutes`,
          data: sanitizeData(activation),
          timestamp: now,
          resolved: false,
          actions: ['review_user', 'check_licenses', 'notify_admin']
        })
      }
    }
    
    // Detect high-risk events
    const { data: highRiskEvents } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('risk_score', 80)
      .gte('created_at', oneHourAgo)
    
    if (highRiskEvents?.length >= MONITORING_CONFIG.thresholds.highRiskEventsPerHour) {
      alerts.push({
        id: generateAlertId(),
        type: 'high_risk_events',
        severity: 'critical',
        title: 'High Risk Security Events',
        description: `${highRiskEvents.length} high-risk events detected in the last hour`,
        data: sanitizeData({ count: highRiskEvents.length, events: highRiskEvents.slice(0, 5) }),
        timestamp: now,
        resolved: false,
        actions: ['immediate_review', 'security_lockdown', 'notify_security_team']
      })
    }
    
    // Detect suspicious IP activity
    const { data: suspiciousIps } = await supabase
      .from('audit_logs')
      .select('ip_address, count(*)')
      .gte('created_at', oneHourAgo)
      .group('ip_address')
      .having('count(*) >= ?', [MONITORING_CONFIG.thresholds.suspiciousIpActivity])
    
    if (suspiciousIps?.length > 0) {
      for (const ip of suspiciousIps) {
        alerts.push({
          id: generateAlertId(),
          type: 'suspicious_ip_activity',
          severity: 'high',
          title: 'Suspicious IP Activity',
          description: `IP ${ip.ip_address} generated ${ip.count} events in the last hour`,
          data: sanitizeData(ip),
          timestamp: now,
          resolved: false,
          actions: ['analyze_ip', 'consider_blocking', 'investigate_pattern']
        })
      }
    }
    
  } catch (error) {
    console.error('Error detecting suspicious patterns:', error)
    alerts.push({
      id: generateAlertId(),
      type: 'monitoring_error',
      severity: 'medium',
      title: 'Monitoring System Error',
      description: 'Error occurred while detecting suspicious patterns',
      data: sanitizeData({ error: error.message }),
      timestamp: now,
      resolved: false
    })
  }
  
  return alerts
}

async function getSecurityMetrics(supabase: any, timeframe: string = '24h'): Promise<SecurityMetrics> {
  const intervals = {
    '1h': 1,
    '24h': 24,
    '7d': 24 * 7,
    '30d': 24 * 30
  }
  
  const hours = intervals[timeframe] || 24
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  
  try {
    // Get basic metrics
    const { data: events } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('created_at', startTime)
    
    if (!events) {
      throw new Error('Failed to fetch events')
    }
    
    const totalEvents = events.length
    const failedEvents = events.filter(e => !e.success).length
    const highRiskEvents = events.filter(e => e.risk_score >= 70).length
    const uniqueUsers = new Set(events.map(e => e.user_id).filter(Boolean)).size
    const uniqueIps = new Set(events.map(e => e.ip_address).filter(Boolean)).size
    const avgRiskScore = events.reduce((sum, e) => sum + (e.risk_score || 0), 0) / totalEvents || 0
    
    // Get top event types
    const eventTypeCounts = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1
      return acc
    }, {})
    
    const topEventTypes = Object.entries(eventTypeCounts)
      .map(([event_type, count]) => ({ event_type, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Get risk distribution
    const riskDistribution = events.reduce((acc, event) => {
      const level = getRiskLevel(event.risk_score || 0)
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalEvents,
      failedEvents,
      highRiskEvents,
      uniqueUsers,
      uniqueIps,
      avgRiskScore: Math.round(avgRiskScore * 100) / 100,
      topEventTypes,
      riskDistribution
    }
    
  } catch (error) {
    console.error('Error getting security metrics:', error)
    throw error
  }
}

async function processAlert(supabase: any, alert: MonitoringAlert): Promise<void> {
  try {
    // Store alert in database
    if (MONITORING_CONFIG.alertChannels.database) {
      await supabase
        .from('audit_logs')
        .insert({
          id: alert.id,
          event_type: 'security_alert',
          event_details: alert,
          severity: alert.severity,
          created_at: alert.timestamp,
          success: true,
          risk_score: alert.severity === 'critical' ? 100 : 
                     alert.severity === 'high' ? 80 :
                     alert.severity === 'medium' ? 60 : 30
        })
    }
    
    // Send real-time notification
    if (MONITORING_CONFIG.alertChannels.realtime) {
      await supabase
        .channel('security-alerts')
        .send({
          type: 'broadcast',
          event: 'security_alert',
          payload: alert
        })
    }
    
    // Log alert processing
    console.log(`Alert processed: ${alert.type} - ${alert.severity}`, {
      id: alert.id,
      title: alert.title,
      timestamp: alert.timestamp
    })
    
  } catch (error) {
    console.error('Error processing alert:', error)
  }
}

async function performHealthCheck(supabase: any): Promise<any> {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: false,
      auditLogs: false,
      recentActivity: false
    },
    metrics: {
      uptime: process.uptime(),
      memoryUsage: Deno.memoryUsage(),
      lastAlert: null
    }
  }
  
  try {
    // Check database connection
    const { data: dbCheck } = await supabase
      .from('audit_logs')
      .select('count(*)')
      .limit(1)
    
    healthStatus.checks.database = !!dbCheck
    
    // Check audit logs table
    const { data: auditCheck } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
    
    healthStatus.checks.auditLogs = !!auditCheck
    
    // Check recent activity (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentActivity } = await supabase
      .from('audit_logs')
      .select('count(*)')
      .gte('created_at', fiveMinutesAgo)
    
    healthStatus.checks.recentActivity = !!recentActivity
    
    // Get last alert
    const { data: lastAlert } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('event_type', 'security_alert')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (lastAlert?.[0]) {
      healthStatus.metrics.lastAlert = lastAlert[0].created_at
    }
    
    // Determine overall status
    const allChecksPass = Object.values(healthStatus.checks).every(check => check)
    healthStatus.status = allChecksPass ? 'healthy' : 'degraded'
    
  } catch (error) {
    console.error('Health check failed:', error)
    healthStatus.status = 'unhealthy'
  }
  
  return healthStatus
}

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
    const action = url.searchParams.get('action') || 'monitor'
    const timeframe = url.searchParams.get('timeframe') || '24h'
    
    switch (action) {
      case 'monitor':
        // Detect suspicious patterns and generate alerts
        const alerts = await detectSuspiciousPatterns(supabase)
        
        // Process each alert
        for (const alert of alerts) {
          await processAlert(supabase, alert)
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            alertsGenerated: alerts.length,
            alerts: alerts
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      
      case 'metrics':
        // Get security metrics
        const metrics = await getSecurityMetrics(supabase, timeframe)
        
        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            timeframe,
            metrics
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      
      case 'health':
        // Perform health check
        const health = await performHealthCheck(supabase)
        
        return new Response(
          JSON.stringify({
            success: true,
            health
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: health.status === 'healthy' ? 200 : 503
          }
        )
      
      case 'alerts':
        // Get recent alerts
        const { data: recentAlerts } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('event_type', 'security_alert')
          .order('created_at', { ascending: false })
          .limit(50)
        
        return new Response(
          JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            alerts: recentAlerts || []
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
      
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid action',
            availableActions: ['monitor', 'metrics', 'health', 'alerts']
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Real-time monitoring error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})