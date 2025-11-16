import React from 'react';
import { 
  Users, 
  DollarSign, 
  Activity,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/super-admin/useDashboardStats';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  color = 'blue' 
}) => {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10',
      border: 'border-blue-200/50 dark:border-blue-800/30',
      icon: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-500/25',
      hover: 'hover:shadow-blue-500/10'
    },
    green: {
      gradient: 'from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10',
      border: 'border-green-200/50 dark:border-green-800/30',
      icon: 'from-green-500 to-green-600',
      shadow: 'shadow-green-500/25',
      hover: 'hover:shadow-green-500/10'
    },
    yellow: {
      gradient: 'from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10',
      border: 'border-orange-200/50 dark:border-orange-800/30',
      icon: 'from-orange-500 to-orange-600',
      shadow: 'shadow-orange-500/25',
      hover: 'hover:shadow-orange-500/10'
    },
    red: {
      gradient: 'from-red-50 to-red-100/50 dark:from-red-950/20 dark:to-red-900/10',
      border: 'border-red-200/50 dark:border-red-800/30',
      icon: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/25',
      hover: 'hover:shadow-red-500/10'
    },
    purple: {
      gradient: 'from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10',
      border: 'border-purple-200/50 dark:border-purple-800/30',
      icon: 'from-purple-500 to-purple-600',
      shadow: 'shadow-purple-500/25',
      hover: 'hover:shadow-purple-500/10'
    }
  };

  const colorClass = colorClasses[color];

  return (
    <motion.div
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClass.gradient} border ${colorClass.border} p-6 hover:shadow-xl ${colorClass.hover} transition-all duration-300`}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClass.icon.replace('to-', 'from-').replace('from-', 'to-')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorClass.icon} flex items-center justify-center shadow-lg ${colorClass.shadow}`}>
            <Icon className="h-7 w-7 text-white" />
          </div>
          {trend && (
            <div className={`flex items-center text-xs px-2 py-1 rounded-full ${
              trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${
                !trend.isPositive ? 'rotate-180' : ''
              }`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-3xl font-bold text-foreground mb-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className={`w-2 h-2 bg-gradient-to-r ${colorClass.icon} rounded-full animate-pulse`}></div>
            {description}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SuperAdminDashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive p-8 bg-destructive/10 rounded-lg border border-destructive/20">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
        Erro ao carregar estatísticas: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-orange-500/5 rounded-3xl blur-3xl" />
        <div className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Visão geral das métricas e atividades da plataforma
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total de Usuários"
          value={stats?.total_users || 0}
          description="Usuários registrados"
          icon={Users}
          color="blue"
          trend={{
            value: stats?.users_growth_percentage || 0,
            isPositive: (stats?.users_growth_percentage || 0) >= 0
          }}
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${(stats?.total_revenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          description="Valor total faturado"
          icon={DollarSign}
          color="green"
          trend={{
            value: stats?.revenue_growth_percentage || 0,
            isPositive: (stats?.revenue_growth_percentage || 0) >= 0
          }}
        />
        <StatCard
          title="Usuários Ativos"
          value={stats?.active_users_last_30_days || 0}
          description="Últimos 30 dias"
          icon={Activity}
          color="yellow"
        />
        <StatCard
          title="Taxa de Conversão"
          value={`${(stats?.conversion_rate || 0).toFixed(1)}%`}
          description="Visitantes para clientes"
          icon={TrendingUp}
          color="purple"
          trend={{
            value: stats?.conversion_growth_percentage || 0,
            isPositive: (stats?.conversion_growth_percentage || 0) >= 0
          }}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Atividade Recente</h3>
                <p className="text-muted-foreground text-sm">Últimas ações administrativas no sistema</p>
              </div>
            </div>
            <div className="space-y-3">
              {stats?.recent_activities?.length ? (
                stats.recent_activities.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-border/30">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma atividade recente encontrada
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm border border-border/50 p-6 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Alertas do Sistema</h3>
                <p className="text-muted-foreground text-sm">Notificações importantes</p>
              </div>
            </div>
            <div className="space-y-3">
              {stats?.system_alerts?.length ? (
                stats.system_alerts.map((alert: any, index: number) => (
                  <div key={index} className={`p-3 rounded-xl border backdrop-blur-sm ${
                    alert.type === 'error' ? 'bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30' : 
                    alert.type === 'warning' ? 'bg-orange-50/50 border-orange-200/50 dark:bg-orange-950/20 dark:border-orange-800/30' : 
                    'bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30'
                  }`}>
                    <p className={`text-sm font-medium ${
                      alert.type === 'error' ? 'text-red-700 dark:text-red-300' : 
                      alert.type === 'warning' ? 'text-orange-700 dark:text-orange-300' : 
                      'text-blue-700 dark:text-blue-300'
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum alerta ativo
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};