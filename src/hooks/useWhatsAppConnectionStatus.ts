import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeQueryInvalidation } from '@/hooks/useSupabaseRealtime';

type ConnectionStatus = {
  connected: boolean;
  instance_id: string | null;
  connected_phone: string | null;
};

type Options = {
  /** Poll fallback in ms (useful if Realtime is misconfigured). Default: false (no polling). */
  pollMs?: number | false;
};

export function useWhatsAppConnectionStatus(options: Options = {}) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setUserId(null);
          return;
        }
        setUserId(data.user?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setUserId(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ IMPORTANTE: hooks não podem ser condicionais.
  // Mantemos sempre as duas assinaturas e controlamos por `enabled`.
  const connectionQueryKey = ['whatsapp-connection-status'] as const;
  const enabled = Boolean(userId);

  useRealtimeQueryInvalidation({
    channelName: userId ? `whatsapp-settings-${userId}` : 'whatsapp-settings',
    table: 'whatsapp_settings',
    event: '*' as const,
    enabled,
    filter: userId ? `owner_id=eq.${userId}` : undefined,
    queryKey: connectionQueryKey,
    debounceMs: 200,
  });

  useRealtimeQueryInvalidation({
    channelName: userId ? `whatsapp-instances-${userId}` : 'whatsapp-instances',
    table: 'whatsapp_instances',
    event: '*' as const,
    enabled,
    filter: userId ? `user_id=eq.${userId}` : undefined,
    queryKey: connectionQueryKey,
    debounceMs: 200,
  });

  return useQuery({
    queryKey: ['whatsapp-connection-status'],
    queryFn: async (): Promise<ConnectionStatus> => {
      if (!userId) {
        return { connected: false, instance_id: null, connected_phone: null };
      }

      // ✅ Preferir whatsapp_instances (multi-instância). Essa é a instância que a Evolution realmente conhece.
      const { data: activeInstance, error: instErr } = await supabase
        .from('whatsapp_instances')
        .select('instance_name, status, updated_at, connected_phone')
        .eq('user_id', userId)
        .in('status', ['open', 'connected'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (instErr) throw instErr;

      if (activeInstance?.instance_name) {
        return { connected: true, instance_id: activeInstance.instance_name, connected_phone: activeInstance.connected_phone ?? null };
      }

      // ⬇️ Fallback legado (single-instance)
      const { data: settings, error } = await supabase
        .from('whatsapp_settings')
        .select('evolution_instance_id, is_active')
        .eq('owner_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!settings?.evolution_instance_id) {
        return { connected: false, instance_id: null, connected_phone: null };
      }

      return {
        connected: Boolean(settings.is_active),
        instance_id: settings.evolution_instance_id,
        connected_phone: null,
      };
    },
    refetchInterval: options.pollMs ?? false,
  });
}
