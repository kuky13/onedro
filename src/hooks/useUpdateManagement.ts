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

      setUpdates(data || []);
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
        throw new Error(updatesError.message);
      }

      let dismissalsCount = 0;

      // Verificar se o usuário é admin antes de buscar estatísticas de dismissals
      if (hasRole('admin')) {
        try {
          // Para admins, usar RPC function para obter estatísticas globais
          const { data: dismissalsData, error: dismissalsError } = await supabase
            .rpc('get_dismissals_count');

          if (dismissalsError) {
            console.warn('Erro ao carregar estatísticas de dismissals:', dismissalsError.message);
            // Se a RPC não existir, tentar consulta direta com tratamento de erro
            const { count, error: countError } = await supabase
              .from('user_update_preferences')
              .select('*', { count: 'exact', head: true })
              .eq('dismissed', true);
            
            if (!countError) {
              dismissalsCount = count || 0;
            }
          } else {
            dismissalsCount = dismissalsData || 0;
          }
        } catch (err) {
          console.warn('Erro ao carregar estatísticas de dismissals para admin:', err);
          // Continuar sem as estatísticas de dismissals se houver erro
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
      console.error('Erro ao carregar estatísticas:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar estatísticas';
      setError(errorMessage);
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

      setUpdates(prev => [newUpdate, ...prev]);
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
      const { data: updatedUpdate, error: supabaseError } = await supabase
        .from('updates')
        .update({
          title: data.title,
          content: data.content,
          link_text: data.link_text,
          link_url: data.link_url,
          is_active: data.is_active
        })
        .eq('id', data.id)
        .select()
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setUpdates(prev => prev.map(u => u.id === data.id ? updatedUpdate : u));
      setCurrentUpdate(updatedUpdate);
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

      setUpdates(prev => prev.map(u => u.id === id ? updatedUpdate : u));
      if (currentUpdate?.id === id) {
        setCurrentUpdate(updatedUpdate);
      }
      
      const statusText = updatedUpdate.is_active ? 'ativada' : 'desativada';
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

      setCurrentUpdate(data);
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