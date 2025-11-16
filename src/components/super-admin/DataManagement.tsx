import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  ClipboardList,
  Settings,
  Shield,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { useDataManagement } from '@/hooks/useDataManagement';

export function DataManagement() {
  const {
    isExporting,
    exportProgress,
    tableStats,
    databaseStats,
    isLoadingTableStats,
    isLoadingDatabaseStats,
    exportUsers,
    exportLogs,
    exportBudgets,
    createBackup,
    cleanupOldLogs,
    optimizeTables,
    isExportingUsers,
    isExportingLogs,
    isExportingBudgets,
    isCleaningLogs,
    isOptimizing,
    refetchStats
  } = useDataManagement();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Dados</h1>
        <p className="text-muted-foreground">Backup, exportação e manutenção do banco de dados</p>
      </motion.div>

      {/* Estatísticas gerais */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg">
                <Database className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Tabelas</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingDatabaseStats ? '...' : databaseStats?.total_tables || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600 shadow-lg">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total de Registros</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingDatabaseStats ? '...' : (databaseStats?.total_records || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Tamanho do BD</p>
                <p className="text-2xl font-bold text-foreground">
                  {isLoadingDatabaseStats ? '...' : databaseStats?.database_size || '0 MB'}
                </p>
              </div>
            </div>
          </CardContent>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm border border-orange-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Último Backup</p>
                <p className="text-sm font-bold text-foreground">
                  {isLoadingDatabaseStats ? '...' : formatDate(databaseStats?.last_backup || new Date().toISOString())}
                </p>
                <p className="text-xs text-muted-foreground">Backup automático</p>
              </div>
            </div>
          </CardContent>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="backup" className="space-y-4">
          <TabsList className="bg-background/60 backdrop-blur-sm border border-border/50">
            <TabsTrigger value="backup">Backup &amp; Restauração</TabsTrigger>
            <TabsTrigger value="export">Exportação de Dados</TabsTrigger>
            <TabsTrigger value="tables">Estatísticas de Tabelas</TabsTrigger>
            <TabsTrigger value="maintenance">Manutenção</TabsTrigger>
          </TabsList>

        <TabsContent value="backup" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Shield className="h-5 w-5 mr-2" />
                Backup do Banco de Dados
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Criar e gerenciar backups completos do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Os backups são essenciais para a segurança dos dados. Recomendamos fazer backups diários.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={createBackup} 
                  disabled={isExporting} 
                  className="h-20 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg"
                >
                  <div className="text-center">
                    <Download className="h-6 w-6 mx-auto mb-2" />
                    <div>Criar Backup Completo</div>
                    <div className="text-xs opacity-75">Todas as tabelas e dados</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 border-blue-200/50 hover:bg-blue-50/50"
                  onClick={refetchStats}
                >
                  <div className="text-center">
                    <RefreshCw className="h-6 w-6 mx-auto mb-2" />
                    <div>Atualizar Estatísticas</div>
                    <div className="text-xs opacity-75">Recarregar dados</div>
                  </div>
                </Button>
              </div>

              {isExporting && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Criando backup...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </motion.div>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Download className="h-5 w-5 mr-2" />
                Exportação de Dados
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Exportar dados específicos em diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  onClick={exportUsers} 
                  disabled={isExportingUsers || isExporting}
                  className="h-24 border-green-200/50 hover:bg-green-50/50"
                >
                  <div className="text-center">
                    <Users className="h-6 w-6 mx-auto mb-2" />
                    <div>Exportar Usuários</div>
                    <div className="text-xs opacity-75">
                      {isExportingUsers ? 'Exportando...' : 'CSV/Excel'}
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={exportBudgets} 
                  disabled={isExportingBudgets || isExporting}
                  className="h-24 border-green-200/50 hover:bg-green-50/50"
                >
                  <div className="text-center">
                    <ClipboardList className="h-6 w-6 mx-auto mb-2" />
                    <div>Exportar Orçamentos</div>
                    <div className="text-xs opacity-75">
                      {isExportingBudgets ? 'Exportando...' : 'CSV/Excel'}
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  onClick={exportLogs} 
                  disabled={isExportingLogs || isExporting}
                  className="h-24 border-green-200/50 hover:bg-green-50/50"
                >
                  <div className="text-center">
                    <FileText className="h-6 w-6 mx-auto mb-2" />
                    <div>Exportar Logs</div>
                    <div className="text-xs opacity-75">
                      {isExportingLogs ? 'Exportando...' : 'CSV/JSON'}
                    </div>
                  </div>
                </Button>
              </div>

              {isExporting && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Exportando dados...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <Progress value={exportProgress} className="w-full" />
                </div>
              )}
            </CardContent>
          </motion.div>
        </TabsContent>

        <TabsContent value="tables" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Database className="h-5 w-5 mr-2" />
                Estatísticas das Tabelas
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Informações detalhadas sobre cada tabela do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoadingTableStats ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Carregando estatísticas das tabelas...</p>
                  </div>
                ) : tableStats && tableStats.length > 0 ? (
                  tableStats.map((table, index) => (
                    <motion.div 
                      key={table.table_name} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border border-purple-200/30 rounded-lg bg-gradient-to-r from-purple-50/50 to-transparent hover:from-purple-100/50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg">
                          <Database className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{table.table_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {table.record_count.toLocaleString()} registros • {table.table_size}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Última modificação</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(table.last_modified)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Database className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma estatística de tabela disponível</p>
                  </div>
                )}
              </div>
            </CardContent>
          </motion.div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm border border-orange-200/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <CardHeader>
              <CardTitle className="flex items-center text-foreground">
                <Settings className="h-5 w-5 mr-2" />
                Manutenção do Banco de Dados
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Ferramentas para otimização e limpeza do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200/50 bg-orange-50/30">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-muted-foreground">
                  As operações de manutenção podem afetar a performance temporariamente. Execute durante períodos de baixo tráfego.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 border-orange-200/50 hover:bg-orange-50/50"
                  onClick={optimizeTables}
                  disabled={isOptimizing}
                >
                  <div className="text-center">
                    <RefreshCw className={`h-6 w-6 mx-auto mb-2 ${isOptimizing ? 'animate-spin' : ''}`} />
                    <div>Otimizar Tabelas</div>
                    <div className="text-xs opacity-75">
                      {isOptimizing ? 'Otimizando...' : 'Reorganizar índices'}
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 border-orange-200/50 hover:bg-orange-50/50"
                  onClick={() => cleanupOldLogs(90)}
                  disabled={isCleaningLogs}
                >
                  <div className="text-center">
                    <Trash2 className="h-6 w-6 mx-auto mb-2" />
                    <div>Limpar Logs Antigos</div>
                    <div className="text-xs opacity-75">
                      {isCleaningLogs ? 'Limpando...' : 'Remover logs > 90 dias'}
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 border-orange-200/50 hover:bg-orange-50/50"
                  onClick={refetchStats}
                >
                  <div className="text-center">
                    <Activity className="h-6 w-6 mx-auto mb-2" />
                    <div>Atualizar Estatísticas</div>
                    <div className="text-xs opacity-75">Recarregar dados</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 border-orange-200/50 hover:bg-orange-50/50"
                  onClick={() => cleanupOldLogs(30)}
                  disabled={isCleaningLogs}
                >
                  <div className="text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2" />
                    <div>Limpeza Intensiva</div>
                    <div className="text-xs opacity-75">
                      {isCleaningLogs ? 'Limpando...' : 'Remover logs > 30 dias'}
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </motion.div>
        </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}