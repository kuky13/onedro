import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Listener<T extends { [key: string]: any }> = (payload: RealtimePostgresChangesPayload<T>) => void;

type ChannelKeyParams = {
  schema: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string | undefined;
};

type ChannelEntry = {
  channel: RealtimeChannel;
  listeners: Map<string, Listener<any>>;
  subscribed: boolean;
};

const registry = new Map<string, ChannelEntry>();

const getKey = (params: ChannelKeyParams) => {
  const filterPart = params.filter ? `|${params.filter}` : '';
  return `${params.schema}.${params.table}|${params.event}${filterPart}`;
};

const getListenerId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

export const subscribePostgresChanges = <T extends Record<string, any> = Record<string, any>>(
  params: ChannelKeyParams,
  listener: Listener<T>
) => {
  const key = getKey(params);
  const listenerId = getListenerId();

  let entry = registry.get(key);
  if (!entry) {
    const config: any = {
      event: params.event,
      schema: params.schema,
      table: params.table,
      ...(params.filter ? { filter: params.filter } : {}),
    };

    const channel = (supabase as any)
      .channel(`rt:${key}`)
      .on('postgres_changes' as any, config, (payload: RealtimePostgresChangesPayload<T>) => {
        const current = registry.get(key);
        if (!current) return;
        for (const cb of current.listeners.values()) {
          try {
            cb(payload as any);
          } catch {
            void 0;
          }
        }
      });

    entry = { channel, listeners: new Map(), subscribed: false };
    registry.set(key, entry);
  }

  entry.listeners.set(listenerId, listener as any);

  if (!entry.subscribed) {
    entry.channel.subscribe();
    entry.subscribed = true;
  }

  return () => {
    const current = registry.get(key);
    if (!current) return;
    current.listeners.delete(listenerId);
    if (current.listeners.size === 0) {
      (supabase as any).removeChannel(current.channel);
      registry.delete(key);
    }
  };
};
