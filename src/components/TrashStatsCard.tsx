import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useTrashStats } from '@/hooks/useTrashStats';
import { 
  Trash2, 
  Clock, 
  AlertTriangle, 
  History
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TrashStatsCard: React.FC = () => {
  const { data: stats, isLoading, error } = useTrashStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Estatísticas da Lixeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Carregando estatísticas...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Estatísticas da Lixeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            Erro ao carregar estatísticas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Estatísticas da Lixeira
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas gerais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-muted-foreground">
              {stats.totalDeleted}
            </div>
            <div className="text-xs text-muted-foreground">Total na lixeira</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.deletedToday}
            </div>
            <div className="text-xs text-muted-foreground">Excluídas hoje</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.deletedThisWeek}
            </div>
            <div className="text-xs text-muted-foreground">Esta semana</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.deletedThisMonth}
            </div>
            <div className="text-xs text-muted-foreground">Este mês</div>
          </div>
        </div>

        {/* Alertas de expiração */}
        {(stats.expiringIn3Days > 0 || stats.expiringIn7Days > 0) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Alertas de Expiração
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.expiringIn3Days > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.expiringIn3Days} expira{stats.expiringIn3Days !== 1 ? 'm' : ''} em 3 dias
                </Badge>
              )}
              {stats.expiringIn7Days > 0 && (
                <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3" />
                  {stats.expiringIn7Days} expira{stats.expiringIn7Days !== 1 ? 'm' : ''} em 7 dias
                </Badge>
              )}
            </div>
          </div>
        )}



        {/* Última limpeza */}
        {stats.lastCleanupDate && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Última limpeza automática:</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-blue-600">
                {stats.lastCleanupCount} ordem{stats.lastCleanupCount !== 1 ? 's' : ''} excluída{stats.lastCleanupCount !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(stats.lastCleanupDate), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </div>
            </div>
          </div>
        )}

        {/* Informação sobre política de retenção */}
        <div className="text-xs text-gray-300 text-center p-2 bg-gray-800 rounded">
          <Clock className="h-3 w-3 inline mr-1" />
          Ordens são mantidas na lixeira por 30 dias antes da exclusão automática
        </div>
      </CardContent>
    </Card>
  );
};

export { TrashStatsCard };