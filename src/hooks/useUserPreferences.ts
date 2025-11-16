/**
 * Hook para Preferências do Usuário
 * OneDrip - Hook para gerenciar preferências de popup do usuário
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  UserUpdatePreference, 
  UseUserPreferencesReturn 
} from '@/types/update';

export const useUserPreferences = (): UseUserPreferencesReturn => {
  const [preferences, setPreferences] = useState<UserUpdatePreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Carregar preferências do usuário
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('user_update_preferences')
        .select(`
          *,
          updates:update_id (
            id,
            title,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setPreferences(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar preferências';
      setError(errorMessage);
      console.error('Erro ao carregar preferências:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Verificar se usuário dismissou uma atualização específica
  const hasUserDismissed = useCallback(async (updateId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .rpc('user_dismissed_update', { update_id: updateId });

      return Boolean(data);
    } catch (err) {
      console.error('Erro ao verificar dismissal:', err);
      return false;
    }
  }, [user]);

  // Dismissar uma atualização
  const dismissUpdate = useCallback(async (updateId: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    setError(null);

    try {
      const { error } = await supabase
        .rpc('dismiss_update', { update_id: updateId });

      if (error) {
        throw new Error(error.message);
      }

      // Recarregar preferências para refletir a mudança
      await loadPreferences();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao dismissar atualização';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadPreferences]);

  // Reativar uma atualização (remover dismissal)
  const reactivateUpdate = useCallback(async (updateId: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    setError(null);

    try {
      const { error } = await supabase
        .from('user_update_preferences')
        .delete()
        .eq('user_id', user.id)
        .eq('update_id', updateId);

      if (error) {
        throw new Error(error.message);
      }

      // Recarregar preferências para refletir a mudança
      await loadPreferences();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao reativar atualização';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadPreferences]);

  // Obter estatísticas das preferências do usuário
  const getUserStats = useCallback(async () => {
    if (!user) return null;

    try {
      const { count: totalDismissed, error: dismissedError } = await supabase
        .from('user_update_preferences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('dismissed', true);

      if (dismissedError) {
        throw new Error(dismissedError.message);
      }

      const { count: totalUpdates, error: updatesError } = await supabase
        .from('updates')
        .select('*', { count: 'exact', head: true });

      if (updatesError) {
        throw new Error(updatesError.message);
      }

      return {
        total_dismissed: totalDismissed || 0,
        total_updates: totalUpdates || 0,
        dismissal_rate: totalUpdates ? ((totalDismissed || 0) / totalUpdates) * 100 : 0
      };
    } catch (err) {
      console.error('Erro ao obter estatísticas do usuário:', err);
      return null;
    }
  }, [user]);

  // Limpar todas as preferências do usuário
  const clearAllPreferences = useCallback(async () => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    setError(null);

    try {
      const { error } = await supabase
        .from('user_update_preferences')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      // Recarregar preferências
      await loadPreferences();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao limpar preferências';
      setError(errorMessage);
      throw err;
    }
  }, [user, loadPreferences]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar preferências quando o usuário muda
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Configurar listener para mudanças em tempo real nas preferências
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_preferences_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_update_preferences',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Recarregar quando houver mudanças nas preferências do usuário
          loadPreferences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadPreferences]);

  return {
    preferences,
    isLoading,
    error,
    hasUserDismissed,
    dismissUpdate,
    reactivateUpdate,
    getUserStats,
    clearAllPreferences,
    clearError,
    refreshPreferences: loadPreferences
  };
};