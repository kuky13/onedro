/**
 * Hook de Rotação Automática de Tokens
 * OneDrip - Sistema de Segurança Avançado
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';

interface TokenRotationConfig {
  // Tempo antes da expiração para renovar (em minutos)
  refreshBeforeExpiry: number;
  // Intervalo de verificação (em minutos)
  checkInterval: number;
  // Máximo de tentativas de renovação
  maxRetries: number;
  // Callback para quando o token é renovado
  onTokenRefreshed?: (newToken: string) => void;
  // Callback para quando falha a renovação
  onRefreshFailed?: (error: Error) => void;
}

const DEFAULT_CONFIG: TokenRotationConfig = {
  refreshBeforeExpiry: 5, // 5 minutos antes da expiração
  checkInterval: 5, // Verificar a cada 5 minutos (Supabase SDK já faz auto-refresh)
  maxRetries: 3,
};

export const useTokenRotation = (config: Partial<TokenRotationConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastRefreshRef = useRef<number>(0);

  // Função para verificar se o token precisa ser renovado
  const checkTokenExpiry = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLogger.warn('TokenRotation', 'Erro ao obter sessão', { error: error.message });
        return false;
      }

      if (!session?.access_token) {
        debugLogger.log('TokenRotation', 'Nenhuma sessão ativa encontrada');
        return false;
      }

      const tokenPart = session.access_token.split('.')[1];
      if (!tokenPart) return false;
      const tokenPayload = JSON.parse(atob(tokenPart));
      const expiryTime = (Number(tokenPayload?.exp || 0) * 1000) || 0;
      if (!expiryTime) return false;

      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      const refreshThreshold = finalConfig.refreshBeforeExpiry * 60 * 1000; // Converter para milliseconds

      debugLogger.log('TokenRotation', 'Verificação de token', {
        expiryTime: new Date(expiryTime).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60), // em minutos
        refreshThreshold: Math.round(refreshThreshold / 1000 / 60), // em minutos
        needsRefresh: timeUntilExpiry <= refreshThreshold
      });

      // Se o token expira em menos tempo que o threshold, renovar
      if (timeUntilExpiry <= refreshThreshold) {
        return await refreshToken();
      }

      return true;
    } catch (error: any) {
      // Ignorar erros de aborto silenciosamente
      if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
        return false;
      }
      debugLogger.error('TokenRotation', 'Erro na verificação de token', { error });
      return false;
    }
  }, [finalConfig.refreshBeforeExpiry]);

  // Função para renovar o token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      debugLogger.log('TokenRotation', 'Iniciando renovação de token', {
        attempt: retryCountRef.current + 1,
        maxRetries: finalConfig.maxRetries
      });

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        retryCountRef.current++;
        debugLogger.warn('TokenRotation', 'Falha na renovação de token', {
          error: error.message,
          attempt: retryCountRef.current,
          maxRetries: finalConfig.maxRetries
        });

        if (retryCountRef.current >= finalConfig.maxRetries) {
          const refreshError = new Error(`Falha na renovação após ${finalConfig.maxRetries} tentativas: ${error.message}`);
          finalConfig.onRefreshFailed?.(refreshError);
          debugLogger.error('TokenRotation', 'Máximo de tentativas de renovação excedido', {
            error: error.message,
            attempts: retryCountRef.current
          });
          return false;
        }

        // Tentar novamente após um delay exponencial
        const delay = Math.pow(2, retryCountRef.current) * 1000; // 2s, 4s, 8s...
        setTimeout(() => refreshToken(), delay);
        return false;
      }

      if (data.session?.access_token) {
        retryCountRef.current = 0; // Reset retry counter
        lastRefreshRef.current = Date.now();
        
        debugLogger.log('TokenRotation', 'Token renovado com sucesso', {
          newTokenLength: data.session.access_token.length,
          refreshTime: new Date().toISOString()
        });

        finalConfig.onTokenRefreshed?.(data.session.access_token);
        
        // Log de segurança
        debugLogger.log('SecurityAudit', 'Token JWT renovado automaticamente', {
          userId: data.session.user?.id,
          timestamp: new Date().toISOString(),
          tokenType: 'access_token'
        });

        return true;
      }

      return false;
    } catch (error) {
      retryCountRef.current++;
      debugLogger.error('TokenRotation', 'Erro inesperado na renovação', { error });
      
      if (retryCountRef.current >= finalConfig.maxRetries) {
        finalConfig.onRefreshFailed?.(error as Error);
      }
      
      return false;
    }
  }, [finalConfig]);

  // Função para limpar tokens expirados do localStorage
  const cleanupExpiredTokens = useCallback(() => {
    try {
      const keys = Object.keys(localStorage);
      let cleanedCount = 0;

      keys.forEach(key => {
        if (key.includes('supabase') && key.includes('auth-token')) {
          try {
            const tokenData = localStorage.getItem(key);
            if (tokenData) {
              const parsed = JSON.parse(tokenData);
              if (parsed.expires_at && new Date(parsed.expires_at) < new Date()) {
                localStorage.removeItem(key);
                cleanedCount++;
              }
            }
          } catch {
            // Token inválido, remover
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });

      if (cleanedCount > 0) {
        debugLogger.log('TokenRotation', 'Tokens expirados limpos', { count: cleanedCount });
      }
    } catch (error) {
      debugLogger.warn('TokenRotation', 'Erro na limpeza de tokens', { error });
    }
  }, []);

  // Iniciar o sistema de rotação
  const startRotation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    debugLogger.log('TokenRotation', 'Sistema de rotação iniciado', {
      checkInterval: finalConfig.checkInterval,
      refreshBeforeExpiry: finalConfig.refreshBeforeExpiry
    });

    // Verificação inicial
    checkTokenExpiry();
    cleanupExpiredTokens();

    // Configurar verificação periódica
    intervalRef.current = setInterval(() => {
      checkTokenExpiry();
      cleanupExpiredTokens();
    }, finalConfig.checkInterval * 60 * 1000); // Converter para milliseconds

  }, [checkTokenExpiry, cleanupExpiredTokens, finalConfig.checkInterval]);

  // Parar o sistema de rotação
  const stopRotation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      debugLogger.log('TokenRotation', 'Sistema de rotação parado');
    }
  }, []);

  // Forçar renovação manual
  const forceRefresh = useCallback(async () => {
    debugLogger.log('TokenRotation', 'Renovação manual solicitada');
    return await refreshToken();
  }, [refreshToken]);

  // Iniciar automaticamente quando o hook é montado
  useEffect(() => {
    startRotation();

    // Cleanup quando o componente é desmontado
    return () => {
      stopRotation();
    };
  }, [startRotation, stopRotation]);

  // Retornar funções e estado
  return {
    startRotation,
    stopRotation,
    forceRefresh,
    isActive: intervalRef.current !== null,
    lastRefresh: lastRefreshRef.current,
    retryCount: retryCountRef.current
  };
}