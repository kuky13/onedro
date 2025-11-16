import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Notification configuration
const NOTIFICATION_CONFIG = {
  // Email settings
  email: {
    enabled: true,
    provider: 'smtp', // smtp, sendgrid, ses
    templates: {
      security_alert: {
        subject: '[SECURITY ALERT] {{severity}} - {{title}}',
        template: `
          <h2>Security Alert: {{title}}</h2>
          <p><strong>Severity:</strong> {{severity}}</p>
          <p><strong>Risk Score:</strong> {{risk_score}}/100</p>
          <p><strong>Description:</strong> {{description}}</p>
          <p><strong>Time:</strong> {{created_at}}</p>
          
          {{#if affected_entities}}
          <h3>Affected Entities:</h3>
          <ul>
            {{#each affected_entities}}
            <li>{{@key}}: {{this}}</li>
            {{/each}}
          </ul>
          {{/if}}
          
          <p><strong>Correlation ID:</strong> {{correlation_id}}</p>
          
          <hr>
          <p><em>This is an automated security alert from the License Management System.</em></p>
        `
      },
      license_violation: {
        subject: '[LICENSE VIOLATION] Unauthorized usage detected',
        template: `
          <h2>License Violation Detected</h2>
          <p>Unauthorized license usage has been detected in your system.</p>
          <p><strong>Details:</strong> {{description}}</p>
          <p><strong>Time:</strong> {{created_at}}</p>
          <p><strong>Risk Level:</strong> {{severity}}</p>
        `
      },
      system_health: {
        subject: '[SYSTEM HEALTH] {{title}}',
        template: `
          <h2>System Health Alert</h2>
          <p>{{description}}</p>
          <p><strong>Status:</strong> {{severity}}</p>
          <p><strong>Time:</strong> {{created_at}}</p>
        `
      }
    },
    recipients: {
      admin: ['admin@company.com'],
      security: ['security@company.com'],
      operations: ['ops@company.com']
    },
    rateLimiting: {
      maxPerHour: 50,
      maxPerDay: 200
    }
  },
  
  // Webhook settings
  webhook: {
    enabled: true,
    endpoints: {
      slack: {
        url: Deno.env.get('SLACK_WEBHOOK_URL'),
        enabled: true,
        severities: ['high', 'critical'],
        format: 'slack'
      },
      discord: {
        url: Deno.env.get('DISCORD_WEBHOOK_URL'),
        enabled: false,
        severities: ['critical'],
        format: 'discord'
      },
      teams: {
        url: Deno.env.get('TEAMS_WEBHOOK_URL'),
        enabled: false,
        severities: ['high', 'critical'],
        format: 'teams'
      },
      custom: {
        url: Deno.env.get('CUSTOM_WEBHOOK_URL'),
        enabled: false,
        severities: ['low', 'medium', 'high', 'critical'],
        format: 'json'
      }
    },
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 2000 // 2 seconds
  },
  
  // Real-time settings
  realtime: {
    enabled: true,
    channels: {
      security_alerts: 'security_alerts',
      system_health: 'system_health',
      license_events: 'license_events'
    },
    severityFilters: {
      admin: ['low', 'medium', 'high', 'critical'],
      user: ['medium', 'high', 'critical'],
      public: ['high', 'critical']
    }
  },
  
  // SMS settings (future implementation)
  sms: {
    enabled: false,
    provider: 'twilio',
    numbers: {
      emergency: ['+1234567890']
    },
    severities: ['critical']
  },
  
  // Notification rules
  rules: {
    // Escalation rules
    escalation: {
      enabled: true,
      levels: [
        {
          level: 1,
          delay: 300000, // 5 minutes
          channels: ['email', 'webhook'],
          recipients: ['admin']
        },
        {
          level: 2,
          delay: 900000, // 15 minutes
          channels: ['email', 'webhook', 'sms'],
          recipients: ['admin', 'security']
        },
        {
          level: 3,
          delay: 1800000, // 30 minutes
          channels: ['email', 'webhook', 'sms'],
          recipients: ['admin', 'security', 'operations']
        }
      ]
    },
    
    // Severity-based routing
    severityRouting: {
      critical: {
        immediate: true,
        channels: ['email', 'webhook', 'realtime', 'sms'],
        recipients: ['admin', 'security']
      },
      high: {
        immediate: true,
        channels: ['email', 'webhook', 'realtime'],
        recipients: ['admin']
      },
      medium: {
        immediate: false,
        delay: 300000, // 5 minutes
        channels: ['email', 'realtime'],
        recipients: ['admin']
      },
      low: {
        immediate: false,
        delay: 900000, // 15 minutes
        channels: ['realtime'],
        recipients: []
      }
    },
    
    // Deduplication
    deduplication: {
      enabled: true,
      window: 300000, // 5 minutes
      fields: ['alert_type', 'affected_entities']
    }
  }
}

// Types
interface NotificationRequest {
  alert_id: string
  type: 'security_alert' | 'license_violation' | 'system_health' | 'custom'
  channels?: string[]
  recipients?: string[]
  immediate?: boolean
  template_data?: Record<string, any>
}

interface NotificationResult {
  success: boolean
  channels_sent: string[]
  channels_failed: string[]
  errors: Record<string, string>
  notification_id: string
}

// Utility functions
function generateNotificationId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         'unknown'
}

function sanitizeData(data: any): any {
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth']
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data }
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }
    
    return sanitized
  }
  
  return data
}

// Template engine (simple Handlebars-like)
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template
  
  // Replace simple variables {{variable}}
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match
  })
  
  // Handle conditional blocks {{#if condition}}
  rendered = rendered.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
    return data[condition] ? content : ''
  })
  
  // Handle each blocks {{#each array}}
  rendered = rendered.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
    const array = data[arrayName]
    if (!Array.isArray(array) && typeof array !== 'object') return ''
    
    if (Array.isArray(array)) {
      return array.map(item => {
        return content.replace(/\{\{this\}\}/g, String(item))
      }).join('')
    } else {
      return Object.entries(array).map(([key, value]) => {
        return content
          .replace(/\{\{@key\}\}/g, key)
          .replace(/\{\{this\}\}/g, String(value))
      }).join('')
    }
  })
  
  return rendered
}

// Email notification
async function sendEmailNotification(
  alert: any,
  recipients: string[],
  template: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!NOTIFICATION_CONFIG.email.enabled || recipients.length === 0) {
      return { success: false, error: 'Email disabled or no recipients' }
    }
    
    const templateConfig = NOTIFICATION_CONFIG.email.templates[template] || NOTIFICATION_CONFIG.email.templates.security_alert
    
    const templateData = {
      ...alert,
      created_at: new Date(alert.created_at).toLocaleString(),
      affected_entities: alert.affected_entities || {}
    }
    
    const subject = renderTemplate(templateConfig.subject, templateData)
    const body = renderTemplate(templateConfig.template, templateData)
    
    // In a real implementation, you would use your email service here
    // For now, we'll just log the email
    console.log('Email notification:', {
      to: recipients,
      subject,
      body: body.substring(0, 200) + '...'
    })
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { success: true }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Webhook notification
async function sendWebhookNotification(
  alert: any,
  webhookConfig: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!webhookConfig.enabled || !webhookConfig.url) {
      return { success: false, error: 'Webhook disabled or no URL' }
    }
    
    if (!webhookConfig.severities.includes(alert.severity)) {
      return { success: false, error: 'Severity not configured for this webhook' }
    }
    
    let payload: any
    
    switch (webhookConfig.format) {
      case 'slack':
        payload = {
          text: `🚨 Security Alert: ${alert.title}`,
          attachments: [{
            color: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : 'good',
            fields: [
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Risk Score', value: `${alert.risk_score}/100`, short: true },
              { title: 'Description', value: alert.description, short: false },
              { title: 'Time', value: new Date(alert.created_at).toLocaleString(), short: true }
            ]
          }]
        }
        break
        
      case 'discord':
        payload = {
          embeds: [{
            title: `🚨 ${alert.title}`,
            description: alert.description,
            color: alert.severity === 'critical' ? 0xFF0000 : alert.severity === 'high' ? 0xFF8C00 : 0x00FF00,
            fields: [
              { name: 'Severity', value: alert.severity, inline: true },
              { name: 'Risk Score', value: `${alert.risk_score}/100`, inline: true },
              { name: 'Time', value: new Date(alert.created_at).toLocaleString(), inline: false }
            ],
            timestamp: alert.created_at
          }]
        }
        break
        
      case 'teams':
        payload = {
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          summary: `Security Alert: ${alert.title}`,
          themeColor: alert.severity === 'critical' ? 'FF0000' : alert.severity === 'high' ? 'FF8C00' : '00FF00',
          sections: [{
            activityTitle: `🚨 ${alert.title}`,
            activitySubtitle: alert.description,
            facts: [
              { name: 'Severity', value: alert.severity },
              { name: 'Risk Score', value: `${alert.risk_score}/100` },
              { name: 'Time', value: new Date(alert.created_at).toLocaleString() }
            ]
          }]
        }
        break
        
      default:
        payload = {
          alert_id: alert.id,
          type: 'security_alert',
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          risk_score: alert.risk_score,
          created_at: alert.created_at,
          affected_entities: alert.affected_entities
        }
    }
    
    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'License-System-Notifications/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NOTIFICATION_CONFIG.webhook.timeout)
    })
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }
    
    return { success: true }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Real-time notification
async function sendRealtimeNotification(
  alert: any,
  supabase: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!NOTIFICATION_CONFIG.realtime.enabled) {
      return { success: false, error: 'Real-time notifications disabled' }
    }
    
    const channel = NOTIFICATION_CONFIG.realtime.channels.security_alerts
    
    // Send real-time notification via Supabase
    const { error } = await supabase
      .channel(channel)
      .send({
        type: 'broadcast',
        event: 'security_alert',
        payload: {
          id: alert.id,
          type: alert.alert_type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          risk_score: alert.risk_score,
          created_at: alert.created_at,
          affected_entities: sanitizeData(alert.affected_entities)
        }
      })
    
    if (error) {
      throw error
    }
    
    return { success: true }
    
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Main notification function
async function sendNotification(
  request: NotificationRequest,
  supabase: any
): Promise<NotificationResult> {
  const notificationId = generateNotificationId()
  const result: NotificationResult = {
    success: false,
    channels_sent: [],
    channels_failed: [],
    errors: {},
    notification_id: notificationId
  }
  
  try {
    // Get alert details
    const { data: alert, error: alertError } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('id', request.alert_id)
      .single()
    
    if (alertError || !alert) {
      throw new Error(`Alert not found: ${request.alert_id}`)
    }
    
    // Determine notification rules based on severity
    const severityRules = NOTIFICATION_CONFIG.rules.severityRouting[alert.severity] || NOTIFICATION_CONFIG.rules.severityRouting.medium
    
    const channels = request.channels || severityRules.channels
    const recipients = request.recipients || severityRules.recipients
    
    // Check if notification should be delayed
    if (!request.immediate && !severityRules.immediate && severityRules.delay) {
      // Schedule notification for later (in a real implementation)
      console.log(`Notification scheduled for ${severityRules.delay}ms delay`)
    }
    
    // Send notifications through each channel
    for (const channel of channels) {
      try {
        let channelResult: { success: boolean; error?: string }
        
        switch (channel) {
          case 'email':
            const emailRecipients = recipients.flatMap(role => 
              NOTIFICATION_CONFIG.email.recipients[role] || []
            )
            channelResult = await sendEmailNotification(alert, emailRecipients, request.type)
            break
            
          case 'webhook':
            // Send to all enabled webhooks
            const webhookResults = await Promise.allSettled(
              Object.entries(NOTIFICATION_CONFIG.webhook.endpoints)
                .filter(([, config]) => config.enabled)
                .map(([name, config]) => sendWebhookNotification(alert, config))
            )
            
            const webhookSuccess = webhookResults.some(r => r.status === 'fulfilled' && r.value.success)
            const webhookErrors = webhookResults
              .filter(r => r.status === 'rejected' || !r.value.success)
              .map(r => r.status === 'rejected' ? r.reason : r.value.error)
              .join(', ')
            
            channelResult = {
              success: webhookSuccess,
              error: webhookErrors || undefined
            }
            break
            
          case 'realtime':
            channelResult = await sendRealtimeNotification(alert, supabase)
            break
            
          case 'sms':
            // SMS implementation would go here
            channelResult = { success: false, error: 'SMS not implemented' }
            break
            
          default:
            channelResult = { success: false, error: `Unknown channel: ${channel}` }
        }
        
        if (channelResult.success) {
          result.channels_sent.push(channel)
        } else {
          result.channels_failed.push(channel)
          if (channelResult.error) {
            result.errors[channel] = channelResult.error
          }
        }
        
      } catch (error) {
        result.channels_failed.push(channel)
        result.errors[channel] = error.message
      }
    }
    
    // Update alert with notification status
    await supabase
      .from('security_alerts')
      .update({
        notification_sent: result.channels_sent.length > 0,
        notification_channels: result.channels_sent,
        notification_attempts: alert.notification_attempts + 1,
        last_notification_at: new Date().toISOString()
      })
      .eq('id', request.alert_id)
    
    result.success = result.channels_sent.length > 0
    
    // Log notification attempt
    await supabase
      .from('audit_logs')
      .insert({
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_type: 'notification_sent',
        event_details: {
          notification_id: notificationId,
          alert_id: request.alert_id,
          channels_sent: result.channels_sent,
          channels_failed: result.channels_failed,
          errors: result.errors
        },
        severity: 'low',
        success: result.success
      })
    
    return result
    
  } catch (error) {
    result.errors.general = error.message
    return result
  }
}

// Health check function
async function performHealthCheck(supabase: any): Promise<any> {
  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      database: 'unknown',
      email: 'unknown',
      webhooks: 'unknown',
      realtime: 'unknown'
    },
    metrics: {
      pending_notifications: 0,
      failed_notifications_24h: 0,
      avg_notification_time: 0
    }
  }
  
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('security_alerts')
      .select('count')
      .limit(1)
    
    health.services.database = error ? 'unhealthy' : 'healthy'
    
    // Check pending notifications
    const { data: pending } = await supabase
      .from('security_alerts')
      .select('count')
      .eq('notification_sent', false)
      .eq('status', 'active')
    
    health.metrics.pending_notifications = pending?.[0]?.count || 0
    
    // Check webhook endpoints
    const webhookChecks = await Promise.allSettled(
      Object.entries(NOTIFICATION_CONFIG.webhook.endpoints)
        .filter(([, config]) => config.enabled && config.url)
        .map(async ([name, config]) => {
          try {
            const response = await fetch(config.url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            })
            return { name, status: response.ok ? 'healthy' : 'unhealthy' }
          } catch {
            return { name, status: 'unhealthy' }
          }
        })
    )
    
    const webhookHealth = webhookChecks.every(r => 
      r.status === 'fulfilled' && r.value.status === 'healthy'
    )
    health.services.webhooks = webhookHealth ? 'healthy' : 'degraded'
    
    // Overall status
    const unhealthyServices = Object.values(health.services).filter(s => s === 'unhealthy').length
    if (unhealthyServices > 0) {
      health.status = unhealthyServices > 1 ? 'unhealthy' : 'degraded'
    }
    
    return health
    
  } catch (error) {
    health.status = 'unhealthy'
    health.services.database = 'unhealthy'
    return health
  }
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
    const action = url.searchParams.get('action') || 'send'
    
    if (action === 'health') {
      // Health check
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
    }
    
    if (action === 'config') {
      // Return notification configuration (admin only)
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
        
        // Return sanitized configuration
        const config = {
          email: {
            enabled: NOTIFICATION_CONFIG.email.enabled,
            recipients: NOTIFICATION_CONFIG.email.recipients,
            rateLimiting: NOTIFICATION_CONFIG.email.rateLimiting
          },
          webhook: {
            enabled: NOTIFICATION_CONFIG.webhook.enabled,
            endpoints: Object.fromEntries(
              Object.entries(NOTIFICATION_CONFIG.webhook.endpoints).map(([key, value]) => [
                key,
                {
                  enabled: value.enabled,
                  severities: value.severities,
                  format: value.format,
                  hasUrl: !!value.url
                }
              ])
            )
          },
          realtime: NOTIFICATION_CONFIG.realtime,
          rules: NOTIFICATION_CONFIG.rules
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            config
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
    
    if (action === 'test') {
      // Test notification (admin only)
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
        
        // Create test alert
        const testAlert = {
          id: `test_${Date.now()}`,
          alert_type: 'test_notification',
          severity: 'medium',
          title: 'Test Notification',
          description: 'This is a test notification to verify the notification system is working correctly.',
          risk_score: 50,
          created_at: new Date().toISOString(),
          affected_entities: { test: true },
          correlation_id: `test_${Date.now()}`
        }
        
        // Insert test alert
        await supabase
          .from('security_alerts')
          .insert(testAlert)
        
        // Send test notification
        const notificationRequest: NotificationRequest = {
          alert_id: testAlert.id,
          type: 'security_alert',
          immediate: true
        }
        
        const result = await sendNotification(notificationRequest, supabase)
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Test notification sent',
            result
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        )
        
      } catch (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        )
      }
    }
    
    // Default: Send notification
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405
        }
      )
    }
    
    const body = await req.json()
    
    // Validate request
    if (!body.alert_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'alert_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    const notificationRequest: NotificationRequest = {
      alert_id: body.alert_id,
      type: body.type || 'security_alert',
      channels: body.channels,
      recipients: body.recipients,
      immediate: body.immediate,
      template_data: body.template_data
    }
    
    const result = await sendNotification(notificationRequest, supabase)
    
    return new Response(
      JSON.stringify({
        success: result.success,
        notification_id: result.notification_id,
        channels_sent: result.channels_sent,
        channels_failed: result.channels_failed,
        errors: result.errors,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Notification system error:', error)
    
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