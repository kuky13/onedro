import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestSession } from '@/types/deviceTest';

interface DeviceTestRealtimeStatus {
  isConnected: boolean;
  connectionType: 'realtime' | 'polling' | 'offline';
  lastUpdate: Date | null;
  errorCount: number;
}

export type UseDeviceTestRealtimeOptions = {
  sessionId?: string | undefined;
  enabled?: boolean;
  onUpdate?: (session: TestSession) => void;
  pollingInterval?: number;
  useRealtime?: boolean;
};

export const useDeviceTestRealtime = ({
  sessionId,
  enabled = true,
  onUpdate,
  pollingInterval = 5000,
  useRealtime = false
}: UseDeviceTestRealtimeOptions) => {
  const [status, setStatus] = useState<DeviceTestRealtimeStatus>({
    isConnected: false,
    connectionType: 'offline',
    lastUpdate: null,
    errorCount: 0
  });

  const subscriptionRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeDisabledRef = useRef(false);
  const mountedRef = useRef(false);
  const onUpdateRef = useRef<UseDeviceTestRealtimeOptions['onUpdate']>(onUpdate);
  const realtimeCloseTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data, error } = await supabase
        .from('device_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
          subscriptionRef.current = null;
        }
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        if (mountedRef.current) {
          setStatus(prev => ({
            ...prev,
            isConnected: false,
            connectionType: 'offline',
            errorCount: prev.errorCount + 1
          }));
        }
        return;
      }

      const cb = onUpdateRef.current;
      if (cb) {
        cb(data as unknown as TestSession);
      }

      if (mountedRef.current) {
        setStatus(prev => ({
          ...prev,
          lastUpdate: new Date(),
          errorCount: 0
        }));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus(prev => {
        const next = prev.errorCount + 1;

        if (next >= 3) {
          if (subscriptionRef.current) {
            supabase.removeChannel(subscriptionRef.current);
            subscriptionRef.current = null;
          }
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = null;
          }
          realtimeDisabledRef.current = true;

          return {
            ...prev,
            isConnected: false,
            connectionType: 'offline',
            errorCount: next,
          };
        }

        return {
          ...prev,
          errorCount: next,
        };
      });
    }
  }, [sessionId]);

  const setupPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(fetchSession, pollingInterval);
    if (mountedRef.current) {
      setStatus(prev => ({
        ...prev,
        connectionType: 'polling',
        isConnected: true
      }));
    }
  }, [sessionId, pollingInterval, fetchSession]);

  const setupRealtime = useCallback(() => {
    if (!sessionId || !enabled) return;
    if (!useRealtime) {
      setupPolling();
      return;
    }
    if (realtimeDisabledRef.current) {
      setupPolling();
      return;
    }

    // Limpar conexões anteriores
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    const channel = supabase
      .channel(`device-test-${sessionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'device_test_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: any) => {
          if (!mountedRef.current) return;
          if (!payload.new) return;

          const cb = onUpdateRef.current;
          if (cb) {
            cb(payload.new as unknown as TestSession);
          }

          setStatus(prev => ({
            ...prev,
            lastUpdate: new Date(),
            errorCount: 0
          }));
        }
      )
      .subscribe((status) => {
        if (!mountedRef.current) return;

        if (status === 'SUBSCRIBED') {
          setStatus(prev => ({
            ...prev,
            isConnected: true,
            connectionType: 'realtime',
            errorCount: 0
          }));
          // Se conectou, para o polling se estiver ativo
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          const now = Date.now();
          const recent = realtimeCloseTimestampsRef.current.filter((t) => now - t < 30_000);
          recent.push(now);
          realtimeCloseTimestampsRef.current = recent;

          if (recent.length >= 2) {
            realtimeDisabledRef.current = true;
          }

          setStatus(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1
          }));
          setupPolling();

          if (!realtimeDisabledRef.current) {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              if (realtimeDisabledRef.current) return;
              setupRealtime();
            }, 10000);
          }
        }
      });

    subscriptionRef.current = channel;
  }, [sessionId, enabled, setupPolling, useRealtime]);

  useEffect(() => {
    if (sessionId && enabled) {
      mountedRef.current = true;
      realtimeDisabledRef.current = false;
      realtimeCloseTimestampsRef.current = [];
      fetchSession(); // Carga inicial
      if (useRealtime) {
        setupRealtime();
      } else {
        setupPolling();
      }
    }

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [sessionId, enabled, setupRealtime, fetchSession, setupPolling, useRealtime]);

  return status;
};
