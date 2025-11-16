import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  admin_email: string;
  action_type: string;
  target_table: string;
  target_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface AuditLogsFilters {
  action?: string;
  adminId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(filters: AuditLogsFilters = {}) {
  const {
    action = '',
    adminId = '',
    dateFrom = '',
    dateTo = '',
    limit = 50,
    offset = 0
  } = filters;

  return useQuery({
    queryKey: ['audit-logs', { action, adminId, dateFrom, dateTo, limit, offset }],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase.rpc('admin_get_audit_logs', {
        p_limit: limit,
        p_offset: offset,
        p_action_filter: action || null,
        p_admin_filter: adminId || null,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      });

      if (error) {
        throw new Error(`Erro ao carregar logs de auditoria: ${error.message}`);
      }

      return data || [];
    },
    staleTime: 30000, // 30 segundos
  });
}