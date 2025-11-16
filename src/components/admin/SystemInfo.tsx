// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  Database,
  Server,
  Activity,
  HardDrive,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BarChart3,
  Zap
} from 'lucide-react';

interface SystemMetrics {
  databaseStatus: 'connected' | 'disconnected' | 'error';
  totalTables: number;
  tableStats: Array<{
    name: string;
    count: number;
  }>;
  storageUsed: number;
  storageLimit: number;
  activeConnections: number;
  recentActivity: Array<{
    action: string;
    timestamp: string;
    user?: string;
  }>;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

const SystemInfo: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemMetrics();
    // Atualizar métricas a cada 30 segundos
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Testar conexão com o banco
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (connectionError) {
        throw new Error('Falha na conexão com o banco de dados');
      }

      // Buscar estatísticas das tabelas principais
      const tableQueries = [
        { name: 'users', query: supabase.from('users').select('*', { count: 'exact', head: true }) },
        { name: 'budgets', query: supabase.from('budgets').select('*', { count: 'exact', head: true }) },
        { name: 'clients', query: supabase.from('clients').select('*', { count: 'exact', head: true }) },
        { name: 'service_orders', query: supabase.from('service_orders').select('*', { count: 'exact', head: true }) },
        { name: 'licenses', query: supabase.from('licenses').select('*', { count: 'exact', head: true }) },
      ];

      const tableStats = await Promise.all(
        tableQueries.map(async ({ name, query }) => {
          try {
            const { count } = await query;
            return { name, count: count || 0 };
          } catch {
            return { name, count: 0 };
          }
        })
      );

      // Buscar atividade recente dos logs de segurança
      const { data: recentLogs } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentActivity = recentLogs?.map(log => ({
        action: log.action || 'Ação desconhecida',
        timestamp: log.created_at,
        user: log.user_id
      })) || [];

      // Simular métricas de sistema (em um ambiente real, essas viriam de APIs específicas)
      const systemHealth = {
        cpu: Math.floor(Math.random() * 30) + 20, // 20-50%
        memory: Math.floor(Math.random() * 40) + 30, // 30-70%
        disk: Math.floor(Math.random() * 20) + 15 // 15-35%
      };

      setMetrics({
        databaseStatus: 'connected',
        totalTables: tableStats.length,
        tableStats,
        storageUsed: 2.4, // GB (simulado)
        storageLimit: 8.0, // GB (simulado)
        activeConnections: Math.floor(Math.random() * 10) + 5,
        recentActivity,
        systemHealth
      });
    } catch (err) {
      console.error('Erro ao buscar métricas do sistema:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setMetrics({
        databaseStatus: 'error',
        totalTables: 0,
        tableStats: [],
        storageUsed: 0,
        storageLimit: 0,
        activeConnections: 0,
        recentActivity: [],
        systemHealth: { cpu: 0, memory: 0, disk: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800">Conectado</Badge>;
      case 'disconnected':
        return <Badge className="bg-red-100 text-red-800">Desconectado</Badge>;
      case 'error':
        return <Badge className="bg-yellow-100 text-yellow-800">Erro</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao Carregar Métricas</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchSystemMetrics}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Tentar Novamente
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status do Banco</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(metrics?.databaseStatus || 'disconnected')}
                  {getStatusBadge(metrics?.databaseStatus || 'disconnected')}
                </div>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Tabelas</p>
                <p className="text-3xl font-bold">{metrics?.totalTables || 0}</p>
              </div>
              <Server className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conexões Ativas</p>
                <p className="text-3xl font-bold">{metrics?.activeConnections || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Uso de Storage</p>
                <p className="text-lg font-bold">
                  {metrics?.storageUsed?.toFixed(1) || 0} GB / {metrics?.storageLimit?.toFixed(1) || 0} GB
                </p>
                <Progress 
                  value={metrics ? (metrics.storageUsed / metrics.storageLimit) * 100 : 0} 
                  className="mt-2" 
                />
              </div>
              <HardDrive className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas das Tabelas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estatísticas das Tabelas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.tableStats.map((table) => (
              <div key={table.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium capitalize">{table.name}</span>
                </div>
                <Badge variant="secondary">{table.count.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saúde do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Saúde do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">CPU</span>
                <span className="text-sm text-muted-foreground">{metrics?.systemHealth.cpu || 0}%</span>
              </div>
              <Progress value={metrics?.systemHealth.cpu || 0} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Memória</span>
                <span className="text-sm text-muted-foreground">{metrics?.systemHealth.memory || 0}%</span>
              </div>
              <Progress value={metrics?.systemHealth.memory || 0} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Disco</span>
                <span className="text-sm text-muted-foreground">{metrics?.systemHealth.disk || 0}%</span>
              </div>
              <Progress value={metrics?.systemHealth.disk || 0} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Recente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics?.recentActivity.length ? (
              metrics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      {activity.user && (
                        <p className="text-sm text-muted-foreground">Usuário: {activity.user}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma atividade recente encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { SystemInfo };