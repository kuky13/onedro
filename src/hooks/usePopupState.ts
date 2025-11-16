/**
 * Hook para Estado do Popup
 * OneDrip - Hook para gerenciar estado e visibilidade do popup de atualizações
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Update, 
  PopupState, 
  UsePopupStateReturn 
} from '@/types/update';

export const usePopupState = (): UsePopupStateReturn => {
  const [popupState, setPopupState] = useState<PopupState>({
    isVisible: false,
    currentUpdate: null,
    isLoading: true,
    error: null
  });
  const { user } = useAuth();

  // Verificar se existe atualização ativa e não dismissada pelo usuário
  const checkActiveUpdate = useCallback(async () => {
    if (!user) {
      setPopupState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setPopupState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Buscar atualização ativa mais recente
      const { data: activeUpdates, error: updateError } = await supabase
        .from('updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const activeUpdate = activeUpdates && activeUpdates.length > 0 ? activeUpdates[0] : null;

      if (!activeUpdate) {
        setPopupState(prev => ({ 
          ...prev, 
          isVisible: false, 
          currentUpdate: null, 
          isLoading: false 
        }));
        return;
      }

      // Verificar se o usuário já dismissou esta atualização
      const { data: dismissedRecord } = await supabase
        .from('user_update_preferences')
        .select('dismissed')
        .eq('user_id', user.id)
        .eq('update_id', activeUpdate.id)
        .eq('dismissed', true)
        .single();

      const shouldShow = !dismissedRecord;

      setPopupState(prev => ({
        ...prev,
        isVisible: shouldShow,
        currentUpdate: activeUpdate,
        isLoading: false
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar atualizações';
      setPopupState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isVisible: false
      }));
      console.error('Erro ao verificar atualização ativa:', err);
    }
  }, [user]);

  // Dismissar popup (fechar permanentemente)
  const dismissPopup = useCallback(async () => {
    if (!user || !popupState.currentUpdate) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_update_preferences')
        .upsert({
          user_id: user.id,
          update_id: popupState.currentUpdate.id,
          dismissed: true,
          dismissed_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(error.message);
      }

      setPopupState(prev => ({
        ...prev,
        isVisible: false
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao fechar popup';
      setPopupState(prev => ({
        ...prev,
        error: errorMessage
      }));
      console.error('Erro ao dismissar popup:', err);
    }
  }, [user, popupState.currentUpdate]);

  // Fechar popup temporariamente (apenas ocultar)
  const hidePopup = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  // Mostrar popup novamente
  const showPopup = useCallback(() => {
    if (popupState.currentUpdate) {
      setPopupState(prev => ({
        ...prev,
        isVisible: true
      }));
    }
  }, [popupState.currentUpdate]);

  // Limpar erro
  const clearError = useCallback(() => {
    setPopupState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Recarregar estado do popup
  const refreshPopupState = useCallback(() => {
    checkActiveUpdate();
  }, [checkActiveUpdate]);

  // Verificar atualizações quando o usuário muda ou componente monta
  useEffect(() => {
    checkActiveUpdate();
  }, [checkActiveUpdate]);

  // Configurar listener para mudanças em tempo real nas atualizações
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('updates_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'updates'
        },
        () => {
          // Recarregar quando houver mudanças na tabela updates
          checkActiveUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, checkActiveUpdate]);

  return {
    popupState,
    dismissPopup,
    hidePopup,
    showPopup,
    clearError,
    refreshPopupState
  };
};