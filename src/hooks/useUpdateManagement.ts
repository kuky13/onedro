/**
 * Hook para Gerenciamento de Atualizações
 * OneDrip - Hook para administradores gerenciarem atualizações do sistema
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Update, 
  UpdateStats, 
  CreateUpdateRequest, 
  UpdateUpdateRequest,
  UseUpdateManagementReturn 
} from '@/types/update';

export const useUpdateManagement = (): UseUpdateManagementReturn => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [currentUpdate, setCurrentUpdate] = useState<Update | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const { showSuccess, showError } = useToast();
  const { hasRole } = useAuth();

  const sanitizeUpdate = useCallback((row: any): Update => {
    return {
      ...row,
      link_text: row?.link_text ?? '',
      link_url: row?.link_url ?? '',
      is_active: Boolean(row?.is_active),
    } as Update;
  }, []);
  
  // Refs para controlar requisições simultâneas
  const loadingUpdatesRef = useRef(false);
  const loadingStatsRef = useRef(false);

  // Carregar todas as atualizações
  const loadUpdates = useCallback(async () => {
    if (loadingUpdatesRef.current) return; // Previne múltiplas requisições
    
    loadingUpdatesRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setUpdates((data || []).map(sanitizeUpdate));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar atualizações';
      setError(errorMessage);
      showError({ title: errorMessage });
    } finally {
      setIsLoading(false);
      loadingUpdatesRef.current = false;
    }
  }, [showError]);

  // Carregar estatísticas
  const loadStats = useCallback(async () => {
    if (loadingStatsRef.current) return; // Previne múltiplas requisições
    
    loadingStatsRef.current = true;
    
    try {
      // Buscar estatísticas básicas
      const { data: updatesData, error: updatesError } = await supabase
        .from('updates')
        .select('id, is_active, created_at');

      if (updatesError) {
        // Se a tabela updates não existir ou der erro de rede, apenas logar e continuar
        // Não lançar erro para não quebrar a UI
        console.warn('Tabela updates inacessível ou erro de rede:', updatesError.message);
        setStats({
          total_views: 0,
          total_dismissals: 0,
          active_updates: 0,
          last_update: null
        });
        return;
      }

      let dismissalsCount = 0;

      // Verificar se o usuário é admin antes de buscar estatísticas de dismissals
      if (hasRole('admin')) {
        try {
          // Para admins, usar RPC function para obter estatísticas globais
          const { data: dismissalsData, error: dismissalsError } = await supabase
            .rpc('get_dismissals_count');

          if (dismissalsError) {
            // Silenciosamente falhar se a RPC não existir ou der erro de permissão
            // Tentar consulta direta com tratamento de erro
            try {
              const { count, error: countError } = await supabase
                .from('user_update_preferences')
                .select('*', { count: 'exact', head: true })
                .eq('dismissed', true);
              
              if (!countError) {
                dismissalsCount = count || 0;
              }
            } catch (innerErr) {
               // Ignorar erros de rede na consulta secundária
            }
          } else {
            dismissalsCount = dismissalsData || 0;
          }
        } catch (err) {
          // Ignorar erros globais de admin stats
        }
      }

      const activeUpdates = updatesData?.filter(u => u.is_active).length || 0;
      const lastUpdate = updatesData?.[0]?.created_at || null;

      setStats({
        total_views: 0, // Implementar se necessário
        total_dismissals: dismissalsCount,
        active_updates: activeUpdates,
        last_update: lastUpdate
      });
    } catch (err) {
      console.warn('Erro silencioso ao carregar estatísticas:', err);
      // Não setar erro visível para o usuário em falhas de background stats
    } finally {
      loadingStatsRef.current = false;
    }
  }, [hasRole]);

  // Criar nova atualização
  const createUpdate = useCallback(async (data: CreateUpdateRequest) => {
    if (isSaving) return; // Previne múltiplas requisições
    
    setIsSaving(true);
    setError(null);

    try {
      const { data: newUpdate, error: supabaseError } = await supabase
        .from('updates')
        .insert([{
          title: data.title,
          content: data.content,
          link_text: data.link_text || 'Para mais detalhes',
          link_url: data.link_url || 'https://onedrip.com.br',
          is_active: data.is_active
        }])
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const safeNewUpdate = sanitizeUpdate(newUpdate);
      setUpdates(prev => [safeNewUpdate, ...prev]);
      showSuccess({ title: 'Atualização criada com sucesso!' });
      // Recarregar stats sem usar await para evitar loops
      loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar atualização';
      setError(errorMessage);
      showError({ title: errorMessage });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, showSuccess, showError, loadStats]);

  // Atualizar atualização existente
  const updateUpdate = useCallback(async (data: UpdateUpdateRequest) => {
    if (isSaving) return; // Previne múltiplas requisições
    
    setIsSaving(true);
    setError(null);

    try {
      const updatePayload: Record<string, any> = {};
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.content !== undefined) updatePayload.content = data.content;
      if (data.link_text !== undefined) updatePayload.link_text = data.link_text ?? null;
      if (data.link_url !== undefined) updatePayload.link_url = data.link_url ?? null;
      if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

      const { data: updatedUpdate, error: supabaseError } = await supabase
        .from('updates')
        .update(updatePayload)
        .eq('id', data.id)
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const safeUpdatedUpdate = sanitizeUpdate(updatedUpdate);
      setUpdates(prev => prev.map(u => u.id === data.id ? safeUpdatedUpdate : u));
      setCurrentUpdate(safeUpdatedUpdate);
      showSuccess({ title: 'Atualização salva com sucesso!' });
      // Recarregar stats sem usar await para evitar loops
      loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar';
      setError(errorMessage);
      showError({ title: errorMessage });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, showSuccess, showError, loadStats]);

  // Deletar atualização
  const deleteUpdate = useCallback(async (id: string) => {
    if (isSaving) return; // Previne múltiplas requisições
    
    setIsSaving(true);
    setError(null);

    try {
      const { error: supabaseError } = await supabase
        .from('updates')
        .delete()
        .eq('id', id);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setUpdates(prev => prev.filter(u => u.id !== id));
      if (currentUpdate?.id === id) {
        setCurrentUpdate(null);
      }
      showSuccess({ title: 'Atualização excluída com sucesso!' });
      // Recarregar stats sem usar await para evitar loops
      loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir atualização';
      setError(errorMessage);
      showError({ title: errorMessage });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, currentUpdate, showSuccess, showError, loadStats]);

  // Alternar status ativo/inativo
  const toggleUpdateStatus = useCallback(async (id: string) => {
    if (isSaving) return; // Previne múltiplas requisições
    
    setIsSaving(true);
    setError(null);

    try {
      const update = updates.find(u => u.id === id);
      if (!update) {
        throw new Error('Atualização não encontrada');
      }

      const { data: updatedUpdate, error: supabaseError } = await supabase
        .from('updates')
        .update({ is_active: !update.is_active })
        .eq('id', id)
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      const safeUpdatedUpdate = sanitizeUpdate(updatedUpdate);
      setUpdates(prev => prev.map(u => u.id === id ? safeUpdatedUpdate : u));
      if (currentUpdate?.id === id) {
        setCurrentUpdate(safeUpdatedUpdate);
      }
      
      const statusText = safeUpdatedUpdate.is_active ? 'ativada' : 'desativada';
      showSuccess({ title: `Atualização ${statusText} com sucesso!` });
      // Recarregar stats sem usar await para evitar loops
      loadStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao alterar status';
      setError(errorMessage);
      showError({ title: errorMessage });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, updates, currentUpdate, showSuccess, showError, loadStats]);

  // Carregar atualização específica
  const loadUpdate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('updates')
        .select('*')
        .eq('id', id)
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setCurrentUpdate(sanitizeUpdate(data));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar atualização';
      setError(errorMessage);
      showError({ title: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Carregar dados iniciais - CORRIGIDO: sem dependências que causam loops
  useEffect(() => {
    loadUpdates();
    loadStats();
  }, []); // Array vazio para executar apenas uma vez

  return {
    updates,
    currentUpdate,
    isLoading,
    isSaving,
    error,
    stats,
    createUpdate,
    updateUpdate,
    deleteUpdate,
    toggleUpdateStatus,
    loadUpdate,
    loadStats,
    clearError
  };
};