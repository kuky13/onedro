import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserCheck, 
  FileText, 
  Building2,
  CreditCard,
  TrendingUp,
  ClipboardList,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface DashboardStats {
  total_users: number;
  active_users: number;
  total_budgets: number;
  total_clients: number;
  total_licenses: number;
}

export function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data, error } = await supabase.rpc('admin_get_dashboard_stats');
      
      if (error) {
        throw new Error(`Erro ao carregar estatísticas: ${error.message}`);
      }
      
      // A função retorna um array com um objeto, então pegamos o primeiro item
      return Array.isArray(data) && data.length > 0 ? data[0] : data;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do sistema</p>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-destructive/10 to-destructive/5 backdrop-blur-sm border border-destructive/20 rounded-2xl shadow-lg"
        >
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-destructive to-destructive/80 shadow-lg mr-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              Erro ao carregar dados
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </CardDescription>
          </CardHeader>
        </motion.div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    trend, 
    color = 'blue' 
  }: {
    title: string;
    value: string | number;
    description: string;
    icon: any;
    trend?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      red: 'from-red-500 to-red-600',
      yellow: 'from-yellow-500 to-yellow-600',
      purple: 'from-purple-500 to-purple-600'
    };

    const backgroundClasses = {
      blue: 'from-blue-500/10 to-blue-600/5',
      green: 'from-green-500/10 to-green-600/5',
      red: 'from-red-500/10 to-red-600/5',
      yellow: 'from-yellow-500/10 to-yellow-600/5',
      purple: 'from-purple-500/10 to-purple-600/5'
    };

    const borderClasses = {
      blue: 'border-blue-200/30',
      green: 'border-green-200/30',
      red: 'border-red-200/30',
      yellow: 'border-yellow-200/30',
      purple: 'border-purple-200/30'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`bg-gradient-to-br ${backgroundClasses[color]} backdrop-blur-sm border ${borderClasses[color]} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {isLoading ? <Skeleton className="h-8 w-20" /> : value}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
            {trend && (
              <span className="text-green-600 font-medium ml-1">
                {trend}
              </span>
            )}
          </p>
        </CardContent>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema One-Drip</p>
      </motion.div>

      {/* Estatísticas principais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <StatCard
          title="Total de Usuários"
          value={stats?.total_users || 0}
          description="Usuários registrados no sistema"
          icon={Users}
          color="blue"
        />
        
        <StatCard
          title="Usuários Ativos"
          value={stats?.active_users || 0}
          description="Usuários com status ativo"
          icon={UserCheck}
          color="green"
        />
        
        <StatCard
          title="Total de Orçamentos"
          value={stats?.total_budgets || 0}
          description="Orçamentos criados no sistema"
          icon={ClipboardList}
          color="purple"
        />
      </motion.div>

      {/* Estatísticas secundárias */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <StatCard
          title="Total de Clientes"
          value={stats?.total_clients || 0}
          description="Clientes cadastrados no sistema"
          icon={Users}
          color="blue"
        />
        
        <StatCard
          title="Licenças Ativas"
          value={stats?.total_licenses || 0}
          description="Licenças ativas no sistema"
          icon={Shield}
          color="green"
        />
      </motion.div>

      {/* Métricas de Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 gap-6"
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 shadow-lg mr-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              Métricas de Performance
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Indicadores de saúde do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de usuários ativos</span>
              <span className="text-lg font-semibold text-green-600">
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  `${stats?.total_users ? Math.round((stats.active_users / stats.total_users) * 100) : 0}%`
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Orçamentos por usuário</span>
              <span className="text-lg font-semibold text-blue-600">
                {isLoading ? (
                  <Skeleton className="h-6 w-16" />
                ) : (
                  `${stats?.total_users && stats.total_users > 0
                    ? (stats.total_budgets / stats.total_users).toFixed(1)
                    : '0'
                  }`
                )}
              </span>
            </div>
          </CardContent>
        </motion.div>
      </motion.div>


    </div>
  );
}