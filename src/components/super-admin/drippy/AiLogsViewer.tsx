import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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

interface WhatsAppPipelineLog {
  id: string;
  created_at: string;
  status: string;
  error_message: string | null;
  raw_message: string | null;
  from_phone: string | null;
  chat_id: string | null;
}

interface InteractionLog {
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
  summary: string | null;
}

type StatusFilter = 'all' | 'success' | 'processing' | 'ignored' | 'error';

const SUCCESS_STATUSES = new Set(['success', 'processed', 'budget_created', 'budget_replaced', 'reply_sent']);
const PROCESSING_STATUSES = new Set(['received_raw', 'processing', 'pending']);

function getStatusBucket(status: string): Exclude<StatusFilter, 'all'> {
  if (SUCCESS_STATUSES.has(status)) return 'success';
  if (PROCESSING_STATUSES.has(status)) return 'processing';
  if (status.startsWith('ignored') || status.startsWith('blocked') || status === 'not_allowed_sender') return 'ignored';
  return 'error';
}

function buildSummary(log: WhatsAppPipelineLog) {
  const raw = (log.raw_message || '').replace(/\s+/g, ' ').trim();
  if (raw) return raw;
  if (log.error_message) return log.error_message;
  return log.from_phone || log.chat_id || null;
}

export function AiLogsViewer() {
  const { user } = useAuth();
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['ai-logs', user?.id, filterProvider, filterSource, filterStatus],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase
        .from('ai_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterProvider !== 'all') query = query.eq('provider', filterProvider);
      if (filterSource !== 'all') query = query.eq('source', filterSource);

      const shouldLoadWhatsappPipeline = filterSource === 'all' || filterSource === 'whatsapp';

      const [aiResult, whatsappResult] = await Promise.all([
        query,
        shouldLoadWhatsappPipeline
          ? supabase
              .from('whatsapp_zapi_logs')
              .select('id, created_at, status, error_message, raw_message, from_phone, chat_id')
              .eq('owner_id', user!.id)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (aiResult.error) throw aiResult.error;
      if (whatsappResult.error) throw whatsappResult.error;

      const aiLogs: InteractionLog[] = (aiResult.data as AILog[]).map((log) => ({
        ...log,
        summary: log.error_message,
      }));

      const whatsappLogs: InteractionLog[] = ((whatsappResult.data ?? []) as WhatsAppPipelineLog[]).map((log) => ({
        id: `whatsapp-${log.id}`,
        created_at: log.created_at,
        provider: 'pipeline',
        model: log.from_phone || log.chat_id || 'whatsapp',
        source: 'whatsapp',
        input_tokens: null,
        output_tokens: null,
        duration_ms: null,
        status: log.status,
        error_message: log.error_message,
        summary: buildSummary(log),
      }));

      return [...aiLogs, ...whatsappLogs]
        .filter((log) => filterStatus === 'all' || getStatusBucket(log.status) === filterStatus)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 150);
    },
    refetchInterval: 30000,
  });

  // Stats
  const totalLogs = logs?.length || 0;
  const successCount = logs?.filter((l) => getStatusBucket(l.status) === 'success').length || 0;
  const errorCount = logs?.filter((l) => getStatusBucket(l.status) === 'error').length || 0;
  const avgDuration = logs?.length
    ? Math.round(logs.filter((l) => l.duration_ms).reduce((a, b) => a + (b.duration_ms || 0), 0) / logs.filter((l) => l.duration_ms).length)
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
              <CardTitle>Logs de Interação IA</CardTitle>
              <CardDescription>Histórico de mensagens do WhatsApp processadas, ignoradas e chamadas reais da IA</CardDescription>
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

              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="ignored">Ignorados</SelectItem>
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
                      <TableHead>Mensagem / detalhe</TableHead>
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
                      <TableCell className="text-xs max-w-[260px] truncate" title={log.summary || ''}>
                        {log.summary || '-'}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.input_tokens || '-'} / {log.output_tokens || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBucket(log.status) === 'error' ? 'destructive' : 'secondary'}
                          className="text-xs"
                          title={log.error_message || ''}
                        >
                          {log.status}
                        </Badge>
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
