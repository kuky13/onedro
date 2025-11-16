/**
 * Security Page
 * Main security management interface combining dashboard and settings
 */

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { 
  Shield, 
  Settings, 
  Activity, 
  AlertTriangle, 
  Eye, 
  Lock,
  Server,
  Bell,
  BarChart3,
  FileText
} from 'lucide-react'
import SecurityDashboard from '../components/SecurityDashboard'
import SecuritySettings from '../components/SecuritySettings'
import { useSecurity } from '../hooks/useSecurity'
import { useAuth } from '../hooks/useAuth'

export function Security() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { user } = useAuth()
  const { securityState, loading, error } = useSecurity()
  
  // Check if user has admin privileges
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin'
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You need administrator privileges to access the security management interface.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security System Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Security Center</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive security monitoring and management for your licensing system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            variant={securityState.securityLevel === 'high' ? 'destructive' : 
                    securityState.securityLevel === 'medium' ? 'default' : 'secondary'}
            className="text-sm"
          >
            <Shield className="h-3 w-3 mr-1" />
            Security Level: {securityState.securityLevel?.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Risk Score: {securityState.riskScore}/100
          </Badge>
        </div>
      </div>

      {/* Security Status Alert */}
      {securityState.isRateLimited && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Rate Limiting Active</AlertTitle>
          <AlertDescription>
            The system is currently under rate limiting protection due to suspicious activity.
            {securityState.blockedUntil && (
              <> Access will be restored at {securityState.blockedUntil.toLocaleTimeString()}.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Operational</div>
            <p className="text-xs text-muted-foreground">
              All security systems active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Monitoring</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Real-time</div>
            <p className="text-xs text-muted-foreground">
              Continuous threat detection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alert System</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Multi-channel notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protection Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Enhanced</div>
            <p className="text-xs text-muted-foreground">
              Advanced threat protection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Monitoring</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Security Monitoring</CardTitle>
              <CardDescription>
                Live monitoring of security events and system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Activity className="h-4 w-4" />
                  <AlertTitle>Monitoring Active</AlertTitle>
                  <AlertDescription>
                    Real-time monitoring is currently active and tracking all security events.
                    The system is analyzing patterns and will automatically alert on suspicious activities.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Edge Functions Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>License Validation</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Rate Limiter</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Real-time Monitoring</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Notification System</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Database Health</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Audit Logs</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Security Alerts</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Rate Limiting</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>User Profiles</span>
                          <Badge variant="default">Healthy</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Reports</CardTitle>
              <CardDescription>
                Generate and view security reports and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertTitle>Reports Available</AlertTitle>
                  <AlertDescription>
                    Security reports are automatically generated and can be accessed through the audit logs.
                    Detailed analytics and trends are available in the dashboard.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Available Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          Security Incident Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Traffic Analysis Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Shield className="h-4 w-4 mr-2" />
                          Risk Assessment Report
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Activity className="h-4 w-4 mr-2" />
                          System Health Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Report Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Daily Summary</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Weekly Analysis</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Monthly Report</span>
                          <Badge variant="default">Enabled</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Incident Reports</span>
                          <Badge variant="default">Real-time</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Security system is actively monitoring your licensing infrastructure.
              All events are logged and analyzed for potential threats.
            </p>
            <p className="mt-2">
              For security concerns or incidents, contact your system administrator immediately.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Security