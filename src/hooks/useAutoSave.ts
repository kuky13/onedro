// @ts-nocheck
/**
 * Hook para Auto-Save e Recuperação de Sessão
 * Sistema OneDrip - Melhorias UX
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { clearSessionDrafts } from '@/components/SessionPersistence';

interface AutoSaveData {
  [key: string]: any;
}

interface AutoSaveOptions {
  key: string;
  interval?: number; // em milissegundos
  enabled?: boolean;
  /**
   * Quando true, não mostra o aviso de saída da página (beforeunload) em dispositivos mobile.
   * Útil para manter a experiência mais fluida em formulários longos.
   */
  disableBeforeUnloadOnMobile?: boolean;
  onSave?: (data: AutoSaveData) => void;
  onRestore?: (data: AutoSaveData) => void;
  onError?: (error: Error) => void;
}

interface AutoSaveState {
  lastSaved: Date | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: Error | null;
}

/**
 * Hook para implementar auto-save com recuperação de sessão
 */
export const useAutoSave = <T extends AutoSaveData>(
  data: T,
  options: AutoSaveOptions
) => {
  const {
    key,
    interval = 30000, // 30 segundos por padrão
    enabled = true,
    disableBeforeUnloadOnMobile = false,
    onSave,
    onRestore,
    onError
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    lastSaved: null,
    isSaving: false,
    hasUnsavedChanges: false,
    error: null
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string | null>(null);
  const isInitialLoad = useRef(true);

  // Função para salvar no localStorage
  const saveToStorage = useCallback((dataToSave: T) => {
    try {
      const serializedData = JSON.stringify({
        data: dataToSave,
        timestamp: new Date().toISOString(),
        version: '1.0'
      });
      localStorage.setItem(`autosave_${key}`, serializedData);
      return true;
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
      return false;
    }
  }, [key]);

  // Função para carregar do localStorage
  const loadFromStorage = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const savedTime = new Date(parsed.timestamp);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

      // Dados salvos há mais de 7 dias são considerados expirados
      if (hoursDiff > 168) {
        localStorage.removeItem(`autosave_${key}`);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Erro ao carregar do localStorage:', error);
      localStorage.removeItem(`autosave_${key}`);
      return null;
    }
  }, [key]);

  // Mutation para auto-save
  const autoSaveMutation = useMutation({
    mutationFn: async (dataToSave: T) => {
      setState(prev => ({ ...prev, isSaving: true, error: null }));
      
      // Simular delay de rede para feedback visual
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const success = saveToStorage(dataToSave);
      if (!success) {
        throw new Error('Falha ao salvar dados localmente');
      }
      
      return dataToSave;
    },
    onSuccess: (savedData) => {
      setState(prev => ({
        ...prev,
        lastSaved: new Date(),
        isSaving: false,
        hasUnsavedChanges: false,
        error: null
      }));
      
      onSave?.(savedData);
    },
    onError: (error: Error) => {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error
      }));
      
      onError?.(error);
    }
  });

  // Função para limpar dados salvos
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(`autosave_${key}`);
    // Também limpar drafts universais da página atual
    clearSessionDrafts();
    setState(prev => ({
      ...prev,
      lastSaved: null,
      hasUnsavedChanges: false,
      error: null
    }));
  }, [key]);

  // Função para restaurar dados salvos
  const restoreSavedData = useCallback(() => {
    const savedData = loadFromStorage();
    if (savedData) {
      onRestore?.(savedData);
      return savedData;
    }
    return null;
  }, [loadFromStorage, onRestore]);

  // Função para salvar manualmente
  const saveNow = useCallback(() => {
    if (data && enabled) {
      autoSaveMutation.mutate(data);
    }
  }, [data, enabled, autoSaveMutation]);

  // Verificar se há dados salvos na inicialização
  useEffect(() => {
    if (isInitialLoad.current) {
      // Só tentar restaurar se estiver habilitado
      if (!enabled) return;

      const savedData = loadFromStorage();
      // Restauração silenciosa (sem perguntar / sem popup)
      if (savedData) {
        console.log(`[AutoSave] Restaurando dados para ${key}`);
        onRestore?.(savedData);
      }
      isInitialLoad.current = false;
    }
  }, [enabled, loadFromStorage, onRestore, key]);

  // Auto-save quando os dados mudam
  useEffect(() => {
    if (!enabled || !data) return;

    const currentDataString = JSON.stringify(data);
    
    // Inicializar ref na primeira execução com dados para evitar salvar o estado inicial
    if (lastDataRef.current === null) {
      lastDataRef.current = currentDataString;
      return;
    }
    
    // Verificar se os dados realmente mudaram
    if (currentDataString !== lastDataRef.current) {
      lastDataRef.current = currentDataString;
      
      // Marcar como tendo mudanças não salvas
      setState(prev => ({ ...prev, hasUnsavedChanges: true }));
      
      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Configurar novo timeout para auto-save
      timeoutRef.current = setTimeout(() => {
        autoSaveMutation.mutate(data);
      }, interval);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, interval, autoSaveMutation]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Salvar antes de sair da página
  useEffect(() => {
    const isMobileLike = (() => {
      if (typeof window === 'undefined') return false;
      try {
        // Preferimos detecção por "pointer coarse" (touch) para evitar falso positivo em desktop.
        return window.matchMedia?.('(pointer: coarse)').matches ?? false;
      } catch {
        return false;
      }
    })();

    if (disableBeforeUnloadOnMobile && isMobileLike) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges && enabled) {
        // Tentar salvar sincronamente
        saveToStorage(data);
        
        // Mostrar aviso de saída
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges, enabled, data, saveToStorage, disableBeforeUnloadOnMobile]);

  return {
    ...state,
    saveNow,
    clearSavedData,
    restoreSavedData,
    hasSavedData: () => !!loadFromStorage()
  };
};

/**
 * Hook simplificado para auto-save de formulários
 */
export const useFormAutoSave = <T extends Record<string, any>>(
  formData: T,
  formKey: string,
  options?: Partial<Omit<AutoSaveOptions, 'key'>>
) => {
  return useAutoSave(formData, {
    key: formKey,
    interval: 30000,
    enabled: true,
    ...options
  });
};