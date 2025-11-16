
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Shield, Trash2, Download, Filter, BarChart3, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { logsService, UnifiedLog, LogType } from '@/services/logsService';

export const AdminLogs = () => {
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'table' | 'all'>('selected');
  const [selectedTable, setSelectedTable] = useState<string>('');

  const queryClient = useQueryClient();

  // Buscar logs
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['admin-all-logs', tableFilter],
    queryFn: () => logsService.getAllLogs({
      table_filter: tableFilter === 'all' ? undefined : tableFilter,
      limit: 200
    }),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  // Buscar estatísticas
  const { data: statistics } = useQuery({
    queryKey: ['admin-logs-statistics'],
    queryFn: () => logsService.getLogStatistics(),
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  // Buscar tipos de logs
  const { data: logTypes = [] } = useQuery({
    queryKey: ['admin-log-types'],
    queryFn: () => logsService.getLogTypes(),
  });

  // Mutação para deletar logs
  const deleteMutation = useMutation({
    mutationFn: async ({ tableName, logIds }: { tableName: string; logIds?: string[] }) => {
      return logsService.deleteLogs(tableName, logIds);
    },
    onSuccess: (deletedCount, variables) => {
      toast.success(`${deletedCount} log(s) deletado(s) com sucesso`);
      setSelectedLogs(new Set());
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-all-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-log-types'] });
    },
    onError: (error) => {
      toast.error(`${error.message}`);
    },
  });

  // Mutação para deletar todos os logs
  const deleteAllMutation = useMutation({
    mutationFn: () => logsService.deleteAllLogs(),
    onSuccess: (results) => {
      const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0);
      toast.success(`${totalDeleted} log(s) deletado(s) de todas as tabelas`);
      setSelectedLogs(new Set());
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['admin-all-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-logs-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-log-types'] });
    },
    onError: (error) => {
      toast.error(`Erro ao deletar todos os logs: ${error.message}`);
    },
  });

  // Filtrar logs baseado na seleção
  const filteredLogs = useMemo(() => {
    if (tableFilter === 'all') return logs;
    return logs.filter(log => log.table_source === tableFilter);
  }, [logs, tableFilter]);

  // Funções de seleção
  const toggleLogSelection = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const selectAllLogs = () => {
    if (selectedLogs.size === filteredLogs.length) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    }
  };

  // Funções de exclusão
  const handleDeleteSelected = () => {
    if (selectedLogs.size === 0) {
      toast.error('Nenhum log selecionado');
      return;
    }
    setDeleteMode('selected');
    setShowDeleteDialog(true);
  };

  const handleDeleteTable = (tableName: string) => {
    setSelectedTable(tableName);
    setDeleteMode('table');
    setShowDeleteDialog(true);
  };

  const handleDeleteAll = () => {
    setDeleteMode('all');
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteMode === 'all') {
      deleteAllMutation.mutate();
    } else if (deleteMode === 'table') {
      deleteMutation.mutate({ tableName: selectedTable });
    } else if (deleteMode === 'selected') {
      // Agrupar logs selecionados por tabela
      const logsByTable: { [table: string]: string[] } = {};
      filteredLogs.forEach(log => {
        if (selectedLogs.has(log.id)) {
          if (!logsByTable[log.table_source]) {
            logsByTable[log.table_source] = [];
          }
          logsByTable[log.table_source].push(log.id);
        }
      });

      // Deletar logs de cada tabela
      Object.entries(logsByTable).forEach(([tableName, logIds]) => {
        deleteMutation.mutate({ tableName, logIds });
      });
    }
  };

  // Funções de exportação
  const exportLogs = (format: 'csv' | 'json') => {
    const logsToExport = selectedLogs.size > 0 
      ? filteredLogs.filter(log => selectedLogs.has(log.id))
      : filteredLogs;

    if (logsToExport.length === 0) {
      toast.error('Nenhum log para exportar');
      return;
    }

    const content = format === 'csv' 
      ? logsService.exportLogsToCSV(logsToExport)
      : logsService.exportLogsToJSON(logsToExport);

    const blob = new Blob([content], { 
      type: format === 'csv' ? 'text/csv' : 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Logs exportados em formato ${format.toUpperCase()}`);
  };

  if (logsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">


      {/* Estatísticas */}
      {statistics && statistics.total_logs > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Logs</p>
                  <p className="text-2xl font-bold">{statistics.total_logs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(statistics.by_table).map(([table, count]) => (
            <Card key={table}>
              <CardContent className="p-4">
                <div>
                  <p className="text-sm text-muted-foreground">{logsService.formatTableName(table)}</p>
                  <p className="text-xl font-semibold">{count}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Logs do Sistema</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLogs()}
                disabled={logsLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros e ações */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por tabela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {logTypes.map((type) => (
                    <SelectItem key={type.table_name} value={type.table_name}>
                      {type.display_name} ({type.log_count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs('csv')}
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLogs('json')}
                disabled={filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button
                 variant="destructive"
                 size="sm"
                 onClick={handleDeleteSelected}
                 disabled={selectedLogs.size === 0}
               >
                 <Trash2 className="h-4 w-4 mr-2" />
                 Deletar Selecionados ({selectedLogs.size})
               </Button>
               <AlertDialog>
                 <AlertDialogTrigger asChild>
                   <Button 
                     variant="destructive" 
                     size="sm"
                     disabled={filteredLogs.length === 0}
                   >
                     <Trash2 className="h-4 w-4 mr-2" />
                     Deletar Todos
                   </Button>
                 </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar Todos os Logs</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá deletar TODOS os logs de TODAS as tabelas do sistema. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground">
                      Deletar Todos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Seleção em massa */}
          {filteredLogs.length > 0 && (
            <div className="flex items-center space-x-2 mb-4 p-2 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllLogs}
                className="flex items-center space-x-2"
              >
                {selectedLogs.size === filteredLogs.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedLogs.size === filteredLogs.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </span>
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedLogs.size} de {filteredLogs.length} logs selecionados
              </span>
            </div>
          )}

          {/* Lista de logs */}
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={selectedLogs.has(log.id)}
                  onCheckedChange={() => toggleLogSelection(log.id)}
                />
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <Badge className={logsService.getLogTypeBadgeColor(log.log_type)}>
                      {logsService.formatTableName(log.table_source)}
                    </Badge>
                    <Badge className={logsService.getActionBadgeColor(log.action)}>
                      {logsService.formatActionName(log.action)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p>
                      <strong>Admin:</strong> {log.admin_name}
                    </p>
                    <p>
                      <strong>Usuário alvo:</strong> {log.target_name}
                    </p>
                    {log.details && (
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-primary hover:text-primary/80 text-sm">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === 'all' && 'Esta ação irá deletar TODOS os logs de TODAS as tabelas do sistema.'}
              {deleteMode === 'table' && `Esta ação irá deletar todos os logs da tabela "${logsService.formatTableName(selectedTable)}".`}
              {deleteMode === 'selected' && `Esta ação irá deletar ${selectedLogs.size} log(s) selecionado(s).`}
              <br />
              <strong>Esta ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMutation.isPending || deleteAllMutation.isPending}
            >
              {deleteMutation.isPending || deleteAllMutation.isPending ? 'Deletando...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
