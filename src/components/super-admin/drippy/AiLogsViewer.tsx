import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, AlertCircle, CheckCircle, Clock, RefreshCw, Loader2, Zap, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AILog {
  id: string;
  created_at: string;
  provider: string;
  model: string;
  source: string;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  user_id: string | null;
  metadata: any;
}

export function AiLogsViewer() {
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-logs', filterProvider, filterSource, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('ai_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterProvider !== 'all') query = query.eq('provider', filterProvider);
      if (filterSource !== 'all') query = query.eq('source', filterSource);
      if (filterStatus !== 'all') query = query.eq('status', filterStatus);

      const { data, error } = await query;
      if (error) throw error;
      return data as AILog[];
    },
    refetchInterval: 30000,
  });

  // Stats
  const totalLogs = logs?.length || 0;
  const successCount = logs?.filter(l => l.status === 'success').length || 0;
  const errorCount = logs?.filter(l => l.status === 'error').length || 0;
  const avgDuration = logs?.length
    ? Math.round(logs.filter(l => l.duration_ms).reduce((a, b) => a + (b.duration_ms || 0), 0) / logs.filter(l => l.duration_ms).length)
    : 0;

  const providerStats = logs?.reduce((acc, log) => {
    acc[log.provider] = (acc[log.provider] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const sourceColors: Record<string, string> = {
    chat: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    whatsapp: 'bg-green-500/10 text-green-700 dark:text-green-400',
    analyze: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    triage: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    unknown: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sucesso</p>
                <p className="text-2xl font-bold text-green-600">{successCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Erros</p>
                <p className="text-2xl font-bold text-destructive">{errorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{avgDuration}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider breakdown */}
      {Object.keys(providerStats).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Uso por Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(providerStats).map(([provider, count]) => (
                <Badge key={provider} variant="outline" className="px-3 py-1 text-sm">
                  <Zap className="h-3 w-3 mr-1" />
                  {provider}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Requisições IA</CardTitle>
              <CardDescription>Últimas 100 requisições para provedores de IA</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Providers</SelectItem>
                <SelectItem value="lovable">Lovable</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Sources</SelectItem>
                <SelectItem value="chat">Chat</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="analyze">Analyze</SelectItem>
                <SelectItem value="triage">Triage</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum log encontrado</p>
              <p className="text-sm">Os logs aparecerão aqui quando a IA for utilizada</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Tokens (in/out)</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="capitalize font-medium text-sm">{log.provider}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[150px] truncate">{log.model}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${sourceColors[log.source] || sourceColors.unknown}`}>
                          {log.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.input_tokens || '-'} / {log.output_tokens || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400 text-xs">
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs" title={log.error_message || ''}>
                            Erro
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
