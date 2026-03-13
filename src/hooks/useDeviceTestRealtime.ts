import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TestSession } from '@/types/deviceTest';
import { toast } from 'sonner';

interface DeviceTestRealtimeStatus {
  isConnected: boolean;
  connectionType: 'realtime' | 'polling' | 'offline';
  lastUpdate: Date | null;
  errorCount: number;
}

interface UseDeviceTestRealtimeOptions {
  sessionId?: string;
  enabled?: boolean;
  onUpdate?: (session: TestSession) => void;
  pollingInterval?: number;
}

export const useDeviceTestRealtime = ({
  sessionId,
  enabled = true,
  onUpdate,
  pollingInterval = 5000
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

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data, error } = await supabase
        .from('device_test_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (data && onUpdate) {
        onUpdate(data as unknown as TestSession);
        setStatus(prev => ({ ...prev, lastUpdate: new Date() }));
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    }
  }, [sessionId, onUpdate]);

  const setupPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    console.log('🔄 Iniciando polling para sessão de teste:', sessionId);
    pollingRef.current = setInterval(fetchSession, pollingInterval);
    
    setStatus(prev => ({
      ...prev,
      connectionType: 'polling',
      isConnected: true
    }));
  }, [sessionId, pollingInterval, fetchSession]);

  const setupRealtime = useCallback(() => {
    if (!sessionId || !enabled) return;

    // Limpar conexões anteriores
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    console.log('🔌 Conectando realtime para sessão:', sessionId);

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
          console.log('📡 Update recebido:', payload.new?.status);
          if (payload.new && onUpdate) {
            onUpdate(payload.new as unknown as TestSession);
            setStatus(prev => ({
              ...prev,
              lastUpdate: new Date(),
              errorCount: 0
            }));
          }
        }
      )
      .subscribe((status) => {
        console.log('Status da conexão realtime:', status);
        
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
          console.warn('Realtime desconectado, iniciando fallback polling...');
          setStatus(prev => ({
            ...prev,
            errorCount: prev.errorCount + 1
          }));
          setupPolling();
          
          // Tentar reconectar depois
          retryTimeoutRef.current = setTimeout(setupRealtime, 10000);
        }
      });

    subscriptionRef.current = channel;
  }, [sessionId, enabled, onUpdate, setupPolling]);

  useEffect(() => {
    if (sessionId && enabled) {
      fetchSession(); // Carga inicial
      setupRealtime();
    }

    return () => {
      if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [sessionId, enabled, setupRealtime, fetchSession]);

  return status;
};
