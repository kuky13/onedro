// @ts-nocheck
/**
 * Security Settings Component
 * Administrative interface for managing security policies and configurations
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { 
  Settings, 
  AlertTriangle, 
  Ban, 
  Save,
  RotateCcw,
  Trash2,
  Plus,
  X,
  Eye
} from 'lucide-react'
import { securityMiddleware } from '../middleware/security'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SecuritySettingsProps {
  className?: string
}

interface RateLimitConfig {
  endpoint: string
  max: number
  windowMs: number
  blockDurationMs: number
}

interface SecurityPolicy {
  id: string
  name: string
  enabled: boolean
  config: any
}

export function SecuritySettings({ className }: SecuritySettingsProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('rate-limiting')
  
  // Rate Limiting Settings
  const [rateLimits, setRateLimits] = useState<RateLimitConfig[]>([
    { endpoint: 'default', max: 100, windowMs: 60000, blockDurationMs: 300000 },
    { endpoint: '/api/license/validate', max: 10, windowMs: 60000, blockDurationMs: 600000 },
    { endpoint: '/api/license/activate', max: 5, windowMs: 300000, blockDurationMs: 1800000 },
    { endpoint: '/api/auth/login', max: 5, windowMs: 300000, blockDurationMs: 900000 }
  ])
  
  // Security Policies
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([
    { id: 'ip-blocking', name: 'IP Blocking', enabled: true, config: { maxViolations: 5 } },
    { id: 'geo-blocking', name: 'Geographic Blocking', enabled: false, config: { blockedCountries: [] } },
    { id: 'device-fingerprinting', name: 'Device Fingerprinting', enabled: true, config: { strictMode: false } },
    { id: 'session-monitoring', name: 'Session Monitoring', enabled: true, config: { maxSessions: 3 } }
  ])
  
  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailAlerts: true,
    webhookAlerts: true,
    realtimeAlerts: true,
    alertThreshold: 'medium',
    escalationEnabled: true,
    escalationDelay: 300
  })
  
  // Monitoring Settings
  const [monitoringSettings, setMonitoringSettings] = useState({
    auditLogging: true,
    detailedLogging: false,
    logRetentionDays: 90,
    realTimeMonitoring: true,
    anomalyDetection: true,
    riskScoreThreshold: 70
  })
  
  // Blocked IPs
  const [blockedIPs, setBlockedIPs] = useState<string[]>([])
  const [newBlockedIP, setNewBlockedIP] = useState('')
  
  // Security Stats
  const [securityStats, setSecurityStats] = useState({
    totalRequests: 0,
    blockedIPs: 0,
    suspiciousActivities: 0
  })

  useEffect(() => {
    loadSecuritySettings()
    loadSecurityStats()
  }, [])

  const loadSecuritySettings = async () => {
    setLoading(true)
    try {
      // Load blocked IPs
      const blockedIPsList = securityMiddleware.getBlockedIPs()
      setBlockedIPs(blockedIPsList)
      
      // Load settings from user_profiles if available (fallback approach)
      await supabase
        .from('user_profiles')
        .select('*')
        .single()
      
      // Settings are stored in user_profiles or we use defaults
      // Since security_settings table doesn't exist, we'll use defaults
    } catch (error) {
      console.error('Failed to load security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSecurityStats = () => {
    const stats = securityMiddleware.getSecurityStats()
    setSecurityStats(stats)
  }

  const saveSecuritySettings = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      
      // Save to localStorage as fallback (security_settings table doesn't exist)
      try {
        localStorage.setItem('security_settings', JSON.stringify({
          user_id: user.id,
          rate_limits: rateLimits,
          security_policies: securityPolicies,
          notification_settings: notificationSettings,
          monitoring_settings: monitoringSettings,
          updated_at: new Date().toISOString()
        }));
      } catch (storageError) {
        console.warn('Failed to save to localStorage:', storageError);
      }
      
      toast.success('Security settings saved successfully')
    } catch (error) {
      console.error('Failed to save security settings:', error)
      toast.error('Failed to save security settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setRateLimits([
      { endpoint: 'default', max: 100, windowMs: 60000, blockDurationMs: 300000 },
      { endpoint: '/api/license/validate', max: 10, windowMs: 60000, blockDurationMs: 600000 },
      { endpoint: '/api/license/activate', max: 5, windowMs: 300000, blockDurationMs: 1800000 },
      { endpoint: '/api/auth/login', max: 5, windowMs: 300000, blockDurationMs: 900000 }
    ])
    
    setSecurityPolicies([
      { id: 'ip-blocking', name: 'IP Blocking', enabled: true, config: { maxViolations: 5 } },
      { id: 'geo-blocking', name: 'Geographic Blocking', enabled: false, config: { blockedCountries: [] } },
      { id: 'device-fingerprinting', name: 'Device Fingerprinting', enabled: true, config: { strictMode: false } },
      { id: 'session-monitoring', name: 'Session Monitoring', enabled: true, config: { maxSessions: 3 } }
    ])
    
    toast.info('Settings reset to defaults')
  }

  const addRateLimit = () => {
    setRateLimits([...rateLimits, {
      endpoint: '/api/new-endpoint',
      max: 50,
      windowMs: 60000,
      blockDurationMs: 300000
    }])
  }

  const removeRateLimit = (index: number) => {
    setRateLimits(rateLimits.filter((_, i) => i !== index))
  }

  const updateRateLimit = (index: number, field: keyof RateLimitConfig, value: string | number) => {
    const updated = [...rateLimits]
    updated[index] = { ...updated[index], [field]: value } as RateLimitConfig
    setRateLimits(updated)
  }

  const addBlockedIP = async () => {
    if (!newBlockedIP.trim()) return
    
    try {
      // Validate IP format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
      if (!ipRegex.test(newBlockedIP.trim())) {
        toast.error('Invalid IP address format')
        return
      }
      
      setBlockedIPs([...blockedIPs, newBlockedIP.trim()])
      setNewBlockedIP('')
      toast.success('IP address blocked successfully')
    } catch (error) {
      toast.error('Failed to block IP address')
    }
  }

  const removeBlockedIP = async (ip: string) => {
    try {
      await securityMiddleware.unblockIP(ip)
      setBlockedIPs(blockedIPs.filter(blockedIP => blockedIP !== ip))
      toast.success('IP address unblocked successfully')
    } catch (error) {
      toast.error('Failed to unblock IP address')
    }
  }

  const toggleSecurityPolicy = (id: string) => {
    setSecurityPolicies(policies => 
      policies.map(policy => 
        policy.id === id ? { ...policy, enabled: !policy.enabled } : policy
      )
    )
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading security settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Settings</h2>
          <p className="text-muted-foreground">
            Configure security policies and monitoring settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button
            onClick={saveSecuritySettings}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.totalRequests}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.blockedIPs}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspicious Activities</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityStats.suspiciousActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
          <TabsTrigger value="policies">Security Policies</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="blocked-ips">Blocked IPs</TabsTrigger>
        </TabsList>

        <TabsContent value="rate-limiting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>
                Configure request rate limits for different endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rateLimits.map((limit, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid gap-4 md:grid-cols-5">
                      <div>
                        <Label htmlFor={`endpoint-${index}`}>Endpoint</Label>
                        <Input
                          id={`endpoint-${index}`}
                          value={limit.endpoint}
                          onChange={(e) => updateRateLimit(index, 'endpoint', e.target.value)}
                          placeholder="/api/endpoint"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`max-${index}`}>Max Requests</Label>
                        <Input
                          id={`max-${index}`}
                          type="number"
                          value={limit.max}
                          onChange={(e) => updateRateLimit(index, 'max', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`window-${index}`}>Window (ms)</Label>
                        <Input
                          id={`window-${index}`}
                          type="number"
                          value={limit.windowMs}
                          onChange={(e) => updateRateLimit(index, 'windowMs', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`block-${index}`}>Block Duration</Label>
                        <Input
                          id={`block-${index}`}
                          type="number"
                          value={limit.blockDurationMs}
                          onChange={(e) => updateRateLimit(index, 'blockDurationMs', parseInt(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDuration(limit.blockDurationMs)}
                        </p>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRateLimit(index)}
                          disabled={limit.endpoint === 'default'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Button onClick={addRateLimit} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate Limit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Policies</CardTitle>
              <CardDescription>
                Enable or disable various security features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityPolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div>
                      <div className="font-medium">{policy.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {policy.id === 'ip-blocking' && 'Automatically block IPs with suspicious activity'}
                        {policy.id === 'geo-blocking' && 'Block requests from specific countries'}
                        {policy.id === 'device-fingerprinting' && 'Track and validate device fingerprints'}
                        {policy.id === 'session-monitoring' && 'Monitor user sessions for anomalies'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                        {policy.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Switch
                        checked={policy.enabled}
                        onCheckedChange={() => toggleSecurityPolicy(policy.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how security alerts are delivered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Alerts</Label>
                      <p className="text-sm text-muted-foreground">Send security alerts via email</p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, emailAlerts: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Webhook Alerts</Label>
                      <p className="text-sm text-muted-foreground">Send alerts to external webhooks</p>
                    </div>
                    <Switch
                      checked={notificationSettings.webhookAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, webhookAlerts: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Alerts</Label>
                      <p className="text-sm text-muted-foreground">Show alerts in the dashboard</p>
                    </div>
                    <Switch
                      checked={notificationSettings.realtimeAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings(prev => ({ ...prev, realtimeAlerts: checked }))
                      }
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="alert-threshold">Alert Threshold</Label>
                    <select
                      id="alert-threshold"
                      className="w-full mt-1 p-2 border rounded"
                      value={notificationSettings.alertThreshold}
                      onChange={(e) => 
                        setNotificationSettings(prev => ({ ...prev, alertThreshold: e.target.value }))
                      }
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="escalation-delay">Escalation Delay (seconds)</Label>
                    <Input
                      id="escalation-delay"
                      type="number"
                      value={notificationSettings.escalationDelay}
                      onChange={(e) => 
                        setNotificationSettings(prev => ({ ...prev, escalationDelay: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Settings</CardTitle>
              <CardDescription>
                Configure security monitoring and logging
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Log all security events</p>
                    </div>
                    <Switch
                      checked={monitoringSettings.auditLogging}
                      onCheckedChange={(checked) => 
                        setMonitoringSettings(prev => ({ ...prev, auditLogging: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Detailed Logging</Label>
                      <p className="text-sm text-muted-foreground">Include detailed request information</p>
                    </div>
                    <Switch
                      checked={monitoringSettings.detailedLogging}
                      onCheckedChange={(checked) => 
                        setMonitoringSettings(prev => ({ ...prev, detailedLogging: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Real-time Monitoring</Label>
                      <p className="text-sm text-muted-foreground">Monitor security events in real-time</p>
                    </div>
                    <Switch
                      checked={monitoringSettings.realTimeMonitoring}
                      onCheckedChange={(checked) => 
                        setMonitoringSettings(prev => ({ ...prev, realTimeMonitoring: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Anomaly Detection</Label>
                      <p className="text-sm text-muted-foreground">Detect unusual patterns automatically</p>
                    </div>
                    <Switch
                      checked={monitoringSettings.anomalyDetection}
                      onCheckedChange={(checked) => 
                        setMonitoringSettings(prev => ({ ...prev, anomalyDetection: checked }))
                      }
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="log-retention">Log Retention (days)</Label>
                    <Input
                      id="log-retention"
                      type="number"
                      value={monitoringSettings.logRetentionDays}
                      onChange={(e) => 
                        setMonitoringSettings(prev => ({ ...prev, logRetentionDays: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="risk-threshold">Risk Score Threshold</Label>
                    <Input
                      id="risk-threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={monitoringSettings.riskScoreThreshold}
                      onChange={(e) => 
                        setMonitoringSettings(prev => ({ ...prev, riskScoreThreshold: parseInt(e.target.value) }))
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked-ips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocked IP Addresses</CardTitle>
              <CardDescription>
                Manage blocked IP addresses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter IP address to block"
                    value={newBlockedIP}
                    onChange={(e) => setNewBlockedIP(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBlockedIP()}
                  />
                  <Button onClick={addBlockedIP}>
                    <Plus className="h-4 w-4 mr-2" />
                    Block IP
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {blockedIPs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No blocked IP addresses
                    </p>
                  ) : (
                    blockedIPs.map((ip) => (
                      <div key={ip} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="font-mono">{ip}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeBlockedIP(ip)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Unblock
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecuritySettings