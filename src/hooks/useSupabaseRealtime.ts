import { useEffect, useRef } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { subscribePostgresChanges } from '@/integrations/supabase/realtimeRegistry';

interface BaseRealtimeOptions {
  channelName: string;
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string | undefined;
  enabled?: boolean;
}

interface UseSupabaseRealtimeOptions<T extends Record<string, any> = Record<string, any>> extends BaseRealtimeOptions {
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

export const useSupabaseRealtime = <T extends Record<string, any> = Record<string, any>>(
  options: UseSupabaseRealtimeOptions<T>
) => {
  const { table, event = '*', schema = 'public', filter, enabled = true, onPayload } = options;

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribePostgresChanges<T>(
      {
        schema,
        table,
        event,
        filter,
      },
      (payload) => {
        onPayload?.(payload);
      }
    );

    return unsubscribe;
  }, [table, event, schema, filter, enabled, onPayload]);
};

interface RealtimeQueryInvalidationOptions extends BaseRealtimeOptions {
  queryKey: QueryKey;
  debounceMs?: number;
}

export const useRealtimeQueryInvalidation = (options: RealtimeQueryInvalidationOptions) => {
  const { queryKey, channelName, table, event = '*', schema = 'public', filter, enabled = true, debounceMs = 500 } = options;
  const queryClient = useQueryClient();
  const timerRef = useRef<number | null>(null);

  const realtimeOptions: any = {
    channelName,
    table,
    event,
    schema,
    enabled,
    onPayload: () => {
      if (typeof window === 'undefined') {
        queryClient.invalidateQueries({ queryKey });
        return;
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        timerRef.current = null;
      }, debounceMs);
    },
  };

  if (filter) realtimeOptions.filter = filter;

  useSupabaseRealtime(realtimeOptions);
};
