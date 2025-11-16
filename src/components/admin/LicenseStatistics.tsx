import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Key, 
  Users, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  Download,
  Gift,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAdminLicense } from '@/hooks/useAdminLicense';
import { useTrialLicense } from '@/hooks/useTrialLicense';

interface LicenseStatsData {
  days: number;
  total_licenses: number;
  active_licenses: number;
  expired_licenses: number;
  unused_licenses: number;
}

interface TrialStatsData {
  total_trial_licenses: number;
  active_trial_licenses: number;
  expired_trial_licenses: number;
  converted_trial_licenses: number;
  conversion_rate: number;
}

export const LicenseStatistics = () => {
  const [licenseStats, setLicenseStats] = useState<LicenseStatsData[]>([]);
  const [trialStats, setTrialStats] = useState<TrialStatsData | null>(null);
  const [databaseStats, setDatabaseStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { getLicenseStatsByDays, getDatabaseStats } = useAdminLicense();
  const { getTrialStatistics } = useTrialLicense();

  const loadAllStats = async () => {
    setIsLoading(true);
    try {
      const [licenseData, trialData, dbData] = await Promise.all([
        getLicenseStatsByDays(),
        getTrialStatistics(),
        getDatabaseStats()
      ]);
      
      setLicenseStats(licenseData || []);
      setTrialStats(trialData);
      setDatabaseStats(dbData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
  }, []);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const pieData = licenseStats.map((stat, index) => ({
    name: `${stat.days} dias`,
    value: stat.total_licenses,
    color: COLORS[index % COLORS.length]
  }));

  const totalLicenses = licenseStats.reduce((sum, stat) => sum + stat.total_licenses, 0);
  const totalActiveLicenses = licenseStats.reduce((sum, stat) => sum + stat.active_licenses, 0);
  const totalExpiredLicenses = licenseStats.reduce((sum, stat) => sum + stat.expired_licenses, 0);
  const totalUnusedLicenses = licenseStats.reduce((sum, stat) => sum + stat.unused_licenses, 0);

  const exportStats = () => {
    const data = {
      timestamp: new Date().toISOString(),
      license_statistics: licenseStats,
      trial_statistics: trialStats,
      database_statistics: databaseStats,
      summary: {
        total_licenses: totalLicenses,
        active_licenses: totalActiveLicenses,
        expired_licenses: totalExpiredLicenses,
        unused_licenses: totalUnusedLicenses
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `license_statistics_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando estatísticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estatísticas de Licenças</h1>
          <p className="text-muted-foreground">
            Análise detalhada do sistema de licenças
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadAllStats} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={exportStats} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Key className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Licenças</p>
                <p className="text-3xl font-bold">{totalLicenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Licenças Ativas</p>
                <p className="text-3xl font-bold">{totalActiveLicenses}</p>
                <p className="text-xs text-muted-foreground">
                  {totalLicenses > 0 ? ((totalActiveLicenses / totalLicenses) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Licenças Expiradas</p>
                <p className="text-3xl font-bold">{totalExpiredLicenses}</p>
                <p className="text-xs text-muted-foreground">
                  {totalLicenses > 0 ? ((totalExpiredLicenses / totalLicenses) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Gift className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Não Utilizadas</p>
                <p className="text-3xl font-bold">{totalUnusedLicenses}</p>
                <p className="text-xs text-muted-foreground">
                  {totalLicenses > 0 ? ((totalUnusedLicenses / totalLicenses) * 100).toFixed(1) : 0}% do total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Licenças de Teste */}
      {trialStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5" />
              <span>Estatísticas de Licenças de Teste</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{trialStats.total_trial_licenses}</p>
                <p className="text-sm text-muted-foreground">Total de Testes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{trialStats.active_trial_licenses}</p>
                <p className="text-sm text-muted-foreground">Testes Ativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{trialStats.expired_trial_licenses}</p>
                <p className="text-sm text-muted-foreground">Testes Expirados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{trialStats.converted_trial_licenses}</p>
                <p className="text-sm text-muted-foreground">Convertidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">{trialStats.conversion_rate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Licenças por Dias */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Duração</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={licenseStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="days" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_licenses" fill="#8884d8" name="Total" />
                <Bar dataKey="active_licenses" fill="#82ca9d" name="Ativas" />
                <Bar dataKey="expired_licenses" fill="#ffc658" name="Expiradas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição Total */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Total por Duração</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Duração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Duração</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Ativas</th>
                  <th className="text-right p-2">Expiradas</th>
                  <th className="text-right p-2">Não Utilizadas</th>
                  <th className="text-right p-2">Taxa de Uso</th>
                </tr>
              </thead>
              <tbody>
                {licenseStats.map((stat, index) => {
                  const usageRate = stat.total_licenses > 0 
                    ? ((stat.active_licenses + stat.expired_licenses) / stat.total_licenses * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <Badge variant="outline">{stat.days} dias</Badge>
                      </td>
                      <td className="text-right p-2 font-medium">{stat.total_licenses}</td>
                      <td className="text-right p-2 text-green-600">{stat.active_licenses}</td>
                      <td className="text-right p-2 text-orange-600">{stat.expired_licenses}</td>
                      <td className="text-right p-2 text-gray-600">{stat.unused_licenses}</td>
                      <td className="text-right p-2">
                        <Badge variant={parseFloat(usageRate) > 50 ? "default" : "secondary"}>
                          {usageRate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas do Banco de Dados */}
      {databaseStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Estatísticas do Banco de Dados</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{databaseStats.total_users || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">{databaseStats.users_with_licenses || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários com Licenças</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">
                  {databaseStats.total_users > 0 
                    ? ((databaseStats.users_with_licenses / databaseStats.total_users) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Adoção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};