import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/services/api/apiClient';

type VpsStatus = 'online' | 'offline' | 'checking';

export const useApiStatus = (options?: { intervalMs?: number; enabled?: boolean }) => {
  const intervalMs = options?.intervalMs ?? 60_000;
  const enabled = options?.enabled ?? true;

  const [status, setStatus] = useState<VpsStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const checkHealth = useCallback(async () => {
    try {
      // Ensure we have a valid token before calling health
      const { data: sessionData } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      const expiresAt = sessionData.session?.expires_at;
      if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60) {
        await (await import('@/integrations/supabase/client')).supabase.auth.refreshSession();
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);

      const token = sessionData.session?.access_token;
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      clearTimeout(timer);

      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    checkHealth();
    timerRef.current = setInterval(checkHealth, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkHealth, intervalMs, enabled]);

  return {
    isVpsOnline: status === 'online',
    isVpsOffline: status === 'offline',
    isChecking: status === 'checking',
    status,
    lastChecked,
    recheck: checkHealth,
  };
};
