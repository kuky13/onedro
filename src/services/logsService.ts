// ============================================
// SERVIÇO DE LOGS ADMINISTRATIVOS
// Gerencia todos os logs do sistema de forma unificada
// ============================================

import { supabase } from '@/integrations/supabase/client';

// Interfaces para os tipos de logs
export interface UnifiedLog {
  id: string;
  table_source: string;
  log_type: string;
  admin_user_id: string | null;
  admin_name: string;
  target_user_id: string | null;
  target_name: string;
  action: string;
  details: any;
  created_at: string;
  additional_info: any;
}

export interface LogStatistics {
  total_logs: number;
  by_table: {
    admin_logs: number;
    budget_deletion_audit: number;
    license_validation_audit: number;
    file_upload_audit: number;
  };
  last_updated: string;
}

export interface LogType {
  table_name: string;
  display_name: string;
  description: string;
  log_count: number;
}

export interface LogFilters {
  table_filter?: string;
  limit?: number;
  offset?: number;
}

class LogsService {
  /**
   * Busca todos os logs do sistema de forma unificada
   */
  async getAllLogs(filters: LogFilters = {}): Promise<UnifiedLog[]> {
    const { table_filter = null, limit = 100, offset = 0 } = filters;

    const normalize = (rows: any[]): UnifiedLog[] =>
      (rows || []).map((log: any) => ({
        id: String(log.id),
        table_source: String(log.table_source ?? 'admin_logs'),
        log_type: String(log.log_type ?? 'admin_action'),
        admin_user_id: log.admin_user_id ?? null,
        admin_name: String(log.admin_name ?? 'Sistema'),
        target_user_id: log.target_user_id ?? null,
        target_name: String(log.target_name ?? '—'),
        action: String(log.action ?? ''),
        details: log.details ?? null,
        created_at: String(log.created_at ?? log.createdAt ?? new Date().toISOString()),
        additional_info: log.additional_info ?? { source_table: log.table_source ?? 'admin_logs' },
      }));

    try {
      const { data, error } = await supabase.rpc('admin_get_all_logs', {
        p_table_filter: table_filter,
        p_limit: limit,
        p_offset: offset
      });

      if (!error && data) {
        return normalize(data as any[]);
      }
    } catch (error) {
      console.warn('Nova função RPC não disponível, usando fallback:', error);
    }

    // Fallback: usar a função existente admin_get_logs
    try {
      const { data, error } = await supabase.rpc('admin_get_logs');
      
      if (error) {
        throw new Error(`Erro ao buscar logs: ${error.message}`);
      }

      // Converter para o formato unificado
      const unifiedLogs: UnifiedLog[] = (data || []).map((log: any) => ({
        id: log.id,
        table_source: 'admin_logs',
        log_type: 'admin_action',
        admin_user_id: log.admin_user_id,
        admin_name: log.admin_name,
        target_user_id: log.target_user_id,
        target_name: log.target_name,
        action: log.action,
        details: log.details,
        created_at: log.created_at,
        additional_info: { source_table: 'admin_logs' }
      }));

      return unifiedLogs;
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      throw new Error(`Erro ao buscar logs: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca estatísticas dos logs
   */
  async getLogStatistics(): Promise<LogStatistics> {
    try {
      const { data, error } = await supabase.rpc('admin_get_logs_statistics');

      if (!error && data) {
        const row = (Array.isArray(data) ? data[0] : data) as any;
        return {
          total_logs: Number(row?.total_logs ?? row?.total ?? 0),
          by_table: {
            admin_logs: Number(row?.admin_logs ?? 0),
            budget_deletion_audit: Number(row?.budget_deletion_audit ?? row?.budget_deletion_logs ?? 0),
            license_validation_audit: Number(row?.license_validation_audit ?? row?.license_validation_logs ?? 0),
            file_upload_audit: Number(row?.file_upload_audit ?? row?.file_upload_logs ?? 0),
          },
          last_updated: String(row?.last_updated ?? new Date().toISOString()),
        };
      }
    } catch (error) {
      console.warn('Função de estatísticas não disponível:', error);
    }

    return {
      total_logs: 0,
      by_table: {
        admin_logs: 0,
        budget_deletion_audit: 0,
        license_validation_audit: 0,
        file_upload_audit: 0
      },
      last_updated: new Date().toISOString()
    };
  }

  /**
   * Busca tipos de logs disponíveis
   */
  async getLogTypes(): Promise<LogType[]> {
    try {
      const { data, error } = await supabase.rpc('admin_get_log_types');

      if (!error && data) {
        return (data as any[]).map((row: any) => ({
          table_name: String(row?.table_name ?? row?.table ?? 'admin_logs'),
          display_name: String(row?.display_name ?? row?.name ?? 'Logs Administrativos'),
          description: String(row?.description ?? ''),
          log_count: Number(row?.log_count ?? row?.count ?? 0),
        }));
      }
    } catch (error) {
      console.warn('Função de tipos de logs não disponível:', error);
    }

    return [
      {
        table_name: 'admin_logs',
        display_name: 'Logs Administrativos',
        description: 'Ações administrativas realizadas no sistema',
        log_count: 0
      }
    ];
  }

  /**
   * Deleta logs selecionados
   */
  async deleteLogs(tableName: string, logIds?: string[]): Promise<number> {
    try {
      if (logIds && logIds.length > 0) {
        // Deletar logs específicos
        const { data, error } = await supabase.rpc('admin_delete_logs', {
          p_log_ids: logIds
        });

        if (error) {
          console.error('Erro ao deletar logs:', error);
          throw new Error(`Erro ao deletar logs: ${error.message}`);
        }

         if (typeof data === 'number') return data;
         if (Array.isArray(data)) return data.reduce((sum, row: any) => sum + Number(row?.deleted_count ?? 0), 0);
         return logIds.length;
      } else {
        // Deletar todos os logs da tabela
        return this.deleteAllLogsFromTable(tableName);
      }
    } catch (error) {
      console.error('Erro ao deletar logs:', error);
      if (error instanceof Error) {
        throw new Error(`Falha ao deletar logs: ${error.message}`);
      }
      throw new Error('Falha ao deletar logs');
    }
  }

  /**
   * Deleta todos os logs de uma tabela específica
   */
  async deleteAllLogsFromTable(tableName: string): Promise<number> {
    try {
      // Buscar todos os logs da tabela específica
      const allLogs = await this.getAllLogs();
      const tableLogIds = allLogs
        .filter(log => log.table_source === tableName)
        .map(log => log.id);

      if (tableLogIds.length === 0) {
        return 0;
      }

      const { data, error } = await supabase.rpc('admin_delete_logs', {
        p_log_ids: tableLogIds
      });

      if (error) {
        console.error('Erro ao deletar logs da tabela:', error);
        throw new Error(`Erro ao deletar logs da tabela ${tableName}: ${error.message}`);
      }

       if (typeof data === 'number') return data;
       if (Array.isArray(data)) return data.reduce((sum, row: any) => sum + Number(row?.deleted_count ?? 0), 0);
       return tableLogIds.length;
    } catch (error) {
      console.error('Erro ao deletar logs da tabela:', error);
      if (error instanceof Error) {
        throw new Error(`Falha ao deletar logs da tabela ${tableName}: ${error.message}`);
      }
      throw new Error(`Falha ao deletar logs da tabela ${tableName}`);
    }
  }

  /**
   * Deleta todos os logs do sistema
   */
  async deleteAllLogs(): Promise<{ [tableName: string]: number }> {
    const logTypes = await this.getLogTypes();
    const results: { [tableName: string]: number } = {};

    for (const logType of logTypes) {
      if (logType.log_count > 0) {
        try {
          const deletedCount = await this.deleteAllLogsFromTable(logType.table_name);
          results[logType.table_name] = deletedCount;
        } catch (error) {
          console.error(`Erro ao deletar logs da tabela ${logType.table_name}:`, error);
          results[logType.table_name] = 0;
        }
      } else {
        results[logType.table_name] = 0;
      }
    }

    return results;
  }

  /**
   * Formata o nome da ação para exibição
   */
  formatActionName(action: string): string {
    const actionLabels: { [key: string]: string } = {
      // Admin logs
      'user_profile_updated': 'Perfil Atualizado',
      'user_deleted': 'Usuário Deletado',
      'user_created': 'Usuário Criado',
      'user_license_renewed': 'Licença Renovada',
      'logs_cleanup': 'Limpeza de Logs',
      
      // Budget deletion audit
      'budget_deleted_single': 'Orçamento Excluído',
      'budget_deleted_mass': 'Exclusão em Massa',
      'budget_deleted_batch': 'Exclusão em Lote',
      
      // License validation audit
      'license_validation': 'Validação de Licença',
      
      // File upload audit
      'file_upload_success': 'Upload Bem-sucedido',
      'file_upload_failed': 'Falha no Upload',
      'file_upload_error': 'Erro no Upload'
    };

    return actionLabels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Formata o nome da tabela para exibição
   */
  formatTableName(tableName: string): string {
    const tableLabels: { [key: string]: string } = {
      'admin_logs': 'Logs Administrativos',
      'budget_deletion_audit': 'Auditoria de Orçamentos',
      'license_validation_audit': 'Auditoria de Licenças',
      'file_upload_audit': 'Auditoria de Arquivos'
    };

    return tableLabels[tableName] || tableName;
  }

  /**
   * Obtém a cor do badge baseada no tipo de log
   */
  getLogTypeBadgeColor(logType: string): string {
    const colors: { [key: string]: string } = {
      'admin_action': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      'budget_deletion': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
      'license_validation': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
      'file_upload': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
    };

    return colors[logType] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  /**
   * Obtém a cor do badge baseada na ação
   */
  getActionBadgeColor(action: string): string {
    if (action.includes('deleted') || action.includes('error') || action.includes('failed')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    }
    if (action.includes('created') || action.includes('success')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    }
    if (action.includes('updated') || action.includes('renewed')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    }
    if (action.includes('validation') || action.includes('upload')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    }
    
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }

  /**
   * Exporta logs para CSV
   */
  exportLogsToCSV(logs: UnifiedLog[]): string {
    const headers = [
      'ID',
      'Fonte',
      'Tipo',
      'Admin',
      'Usuário Alvo',
      'Ação',
      'Data/Hora',
      'Detalhes'
    ];

    const rows = logs.map(log => [
      log.id,
      this.formatTableName(log.table_source),
      log.log_type,
      log.admin_name,
      log.target_name,
      this.formatActionName(log.action),
      new Date(log.created_at).toLocaleString('pt-BR'),
      JSON.stringify(log.details)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Exporta logs para JSON
   */
  exportLogsToJSON(logs: UnifiedLog[]): string {
    return JSON.stringify(logs, null, 2);
  }
}

// Instância singleton do serviço
export const logsService = new LogsService();
export default logsService;