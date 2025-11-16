/**
 * Security Dashboard Component
 * Real-time monitoring dashboard for security metrics and alerts
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Progress } from './ui/progress'
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Server, 
  Bell,
  RefreshCw
} from 'lucide-react'
import { useSecurity } from '../hooks/useSecurity'
import { toast } from 'sonner'

interface SecurityDashboardProps {
  className?: string
}

export function SecurityDashboard({ className }: SecurityDashboardProps) {
  const {
    securityState,
    metrics,
    recentAlerts,
    auditLogs,
    loading,
    error,
    getSecurityMetrics,
    getRecentAlerts,
    getAuditLogs,
    testNotifications,
    clearError
  } = useSecurity()
  
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        getSecurityMetrics(),
        getRecentAlerts(10),
        getAuditLogs({ limit: 20 })
      ])
    } catch (err) {
      toast.error('Failed to refresh security data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleTestNotifications = async () => {
    try {
      const result = await testNotifications()
      if (result.success) {
        toast.success('Test notification sent successfully')
      } else {
        toast.error('Failed to send test notification')
      }
    } catch (err) {
      toast.error('Failed to test notifications')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600'
    if (score >= 60) return 'text-orange-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Security Dashboard Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-2" 
            onClick={clearError}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and security analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestNotifications}
            disabled={loading}
          >
            <Bell className="h-4 w-4 mr-2" />
            Test Alerts
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {securityState.securityLevel}
            </div>
            <Badge variant={getSeverityColor(securityState.securityLevel)} className="mt-1">
              Risk Score: {securityState.riskScore}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.blockedRequests} blocked ({((metrics.blockedRequests / metrics.totalRequests) * 100 || 0).toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limiting Status */}
      {securityState.isRateLimited && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Rate Limit Active</AlertTitle>
          <AlertDescription>
            Your requests are currently rate limited. 
            {securityState.blockedUntil && (
              <> Blocked until {formatTimestamp(securityState.blockedUntil.toISOString())}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Score Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>
                  Current security risk level based on recent activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Risk Score</span>
                    <span className={`text-sm font-bold ${getRiskScoreColor(securityState.riskScore)}`}>
                      {securityState.riskScore}/100
                    </span>
                  </div>
                  <Progress value={securityState.riskScore} className="w-full" />
                  <div className="text-xs text-muted-foreground">
                    Security Level: <span className="capitalize font-medium">{securityState.securityLevel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest security events and system activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditLogs.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(log.severity)} className="text-xs">
                          {log.severity}
                        </Badge>
                        <span className="font-medium">{log.event_type.replace('_', ' ')}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>
                Recent security alerts and incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="font-medium">{alert.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {alert.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Type: {alert.alert_type}</span>
                          <span>Status: {alert.status}</span>
                          <span>{formatTimestamp(alert.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {recentAlerts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No security alerts found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                Detailed audit trail of system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.map((log, index) => (
                  <div key={index} className="border rounded p-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getSeverityColor(log.severity)} className="text-xs">
                          {log.severity}
                        </Badge>
                        <span className="font-medium">{log.event_type}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>IP: {log.ip_address}</div>
                      <div>User Agent: {log.user_agent?.substring(0, 50)}...</div>
                      {Object.keys(log.event_details).length > 0 && (
                        <div>Details: {JSON.stringify(log.event_details, null, 2).substring(0, 100)}...</div>
                      )}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No audit logs found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Requests</span>
                    <span className="font-bold">{metrics.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blocked Requests</span>
                    <span className="font-bold text-red-600">{metrics.blockedRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span className="font-bold text-green-600">
                      {((1 - metrics.blockedRequests / metrics.totalRequests) * 100 || 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Risk Score</span>
                    <span className={`font-bold ${getRiskScoreColor(metrics.riskScore)}`}>
                      {metrics.riskScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recent Alerts</span>
                    <span className="font-bold">{metrics.recentAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Security Level</span>
                    <span className="font-bold capitalize">{securityState.securityLevel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SecurityDashboard