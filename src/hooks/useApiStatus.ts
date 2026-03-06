import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/services/api/apiClient';

type VpsStatus = 'online' | 'offline' | 'checking';

export const useApiStatus = (intervalMs = 60_000) => {
  const [status, setStatus] = useState<VpsStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);

      const res = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timer);

      if (res.ok) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch {
      setStatus('offline');
    }
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    checkHealth();
    timerRef.current = setInterval(checkHealth, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkHealth, intervalMs]);

  return {
    isVpsOnline: status === 'online',
    isVpsOffline: status === 'offline',
    isChecking: status === 'checking',
    status,
    lastChecked,
    recheck: checkHealth,
  };
};
