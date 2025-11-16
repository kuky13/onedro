/**
 * Monitor de Recarregamentos
 * Detecta e previne recarregamentos desnecessários
 */

import { useEffect, useRef } from 'react';
import { debugLogger } from '@/utils/debugLogger';

export const ReloadMonitor = () => {
  const mountCountRef = useRef(0);
  const lastReloadRef = useRef(0);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    mountCountRef.current++;
    const now = Date.now();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Configurações diferentes para desenvolvimento e produção
    const FREQUENT_RELOAD_THRESHOLD = isDevelopment ? 30000 : 10000; // 30s em dev, 10s em prod
    const MIN_MOUNTS_FOR_WARNING = isDevelopment ? 5 : 2; // Mais tolerante em dev
    const SESSION_MIN_TIME = 5000; // Mínimo de 5s desde o início da sessão
    
    // Só detectar recarregamentos frequentes após um tempo mínimo da sessão
    // e com um número mínimo de montagens
    const timeSinceSessionStart = now - sessionStartRef.current;
    const timeSinceLastReload = now - lastReloadRef.current;
    
    if (
      mountCountRef.current >= MIN_MOUNTS_FOR_WARNING && 
      timeSinceSessionStart > SESSION_MIN_TIME &&
      timeSinceLastReload < FREQUENT_RELOAD_THRESHOLD &&
      timeSinceLastReload > 1000 // Evitar falsos positivos de re-renderizações muito rápidas
    ) {
      // Em desenvolvimento, usar log em vez de warn para ser menos intrusivo
      const logMethod = isDevelopment ? 'log' : 'warn';
      debugLogger[logMethod]('ReloadMonitor', 'Recarregamento frequente detectado', {
        count: mountCountRef.current,
        timeSinceLastReload,
        timeSinceSessionStart,
        isDevelopment
      });
    }
    
    lastReloadRef.current = now;
    
    // Log apenas a primeira montagem
    if (mountCountRef.current === 1) {
      debugLogger.log('ReloadMonitor', 'Aplicação inicializada', {
        isDevelopment,
        sessionStart: sessionStartRef.current
      });
    }
  }, []);

  return null;
};