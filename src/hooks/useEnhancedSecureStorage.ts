/**
 * Hook React para Armazenamento Seguro Aprimorado
 * Integra o sistema de criptografia avançada com componentes React
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  enhancedSecureStorage, 
  EnhancedSecureStorageOptions 
} from '../services/enhancedSecureStorage';

export interface UseEnhancedSecureStorageOptions extends EnhancedSecureStorageOptions {
  defaultValue?: any;
  syncAcrossTabs?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export interface SecureStorageState<T> {
  value: T;
  loading: boolean;
  error: string | null;
  isEncrypted: boolean;
  lastUpdated: number | null;
}

/**
 * Hook principal para armazenamento seguro aprimorado
 */
export const useEnhancedSecureStorage = <T = any>(
  key: string,
  options: UseEnhancedSecureStorageOptions = {}
) => {
  const {
    defaultValue = null,
    syncAcrossTabs = false,
    autoSave = false,
    autoSaveDelay = 1000,
    ...storageOptions
  } = options;

  const [state, setState] = useState<SecureStorageState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
    isEncrypted: storageOptions.encrypt ?? true,
    lastUpdated: null
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);

  // Carrega valor inicial
  useEffect(() => {
    const loadInitialValue = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const storedValue = await enhancedSecureStorage.getItem(
          key,
          storageOptions.storage
        );

        setState(prev => ({
          ...prev,
          value: storedValue !== null ? storedValue : defaultValue,
          loading: false,
          lastUpdated: storedValue !== null ? Date.now() : null
        }));

        isInitializedRef.current = true;
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Erro ao carregar dados'
        }));
      }
    };

    loadInitialValue();
  }, [key, defaultValue, storageOptions.storage]);

  // Sincronização entre abas
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = async (event: StorageEvent) => {
      if (event.key === `enhanced_secure_${key}` && event.newValue) {
        try {
          const newValue = await enhancedSecureStorage.getItem(
            key,
            storageOptions.storage
          );
          
          setState(prev => ({
            ...prev,
            value: newValue,
            lastUpdated: Date.now()
          }));
        } catch (error) {
          console.error('Erro na sincronização entre abas:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, syncAcrossTabs, storageOptions.storage]);

  // Função para salvar valor
  const setValue = useCallback(async (newValue: T | ((prev: T) => T)) => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const valueToSave = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(state.value)
        : newValue;

      // Auto-save com debounce
      if (autoSave && isInitializedRef.current) {
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }

        autoSaveTimeoutRef.current = setTimeout(async () => {
          try {
            await enhancedSecureStorage.setItem(key, valueToSave, storageOptions);
          } catch (error) {
            setState(prev => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Erro no auto-save'
            }));
          }
        }, autoSaveDelay);
      } else if (!autoSave) {
        // Salva imediatamente se auto-save estiver desabilitado
        await enhancedSecureStorage.setItem(key, valueToSave, storageOptions);
      }

      setState(prev => ({
        ...prev,
        value: valueToSave,
        lastUpdated: Date.now()
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao salvar dados'
      }));
    }
  }, [key, state.value, autoSave, autoSaveDelay, storageOptions]);

  // Função para salvar manualmente (útil com auto-save)
  const save = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await enhancedSecureStorage.setItem(key, state.value, storageOptions);
      setState(prev => ({ ...prev, lastUpdated: Date.now() }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao salvar dados'
      }));
    }
  }, [key, state.value, storageOptions]);

  // Função para remover valor
  const remove = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      enhancedSecureStorage.removeItem(key, storageOptions.storage);
      setState(prev => ({
        ...prev,
        value: defaultValue,
        lastUpdated: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao remover dados'
      }));
    }
  }, [key, defaultValue, storageOptions.storage]);

  // Função para recarregar valor
  const reload = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const storedValue = await enhancedSecureStorage.getItem(
        key,
        storageOptions.storage
      );

      setState(prev => ({
        ...prev,
        value: storedValue !== null ? storedValue : defaultValue,
        loading: false,
        lastUpdated: storedValue !== null ? Date.now() : null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erro ao recarregar dados'
      }));
    }
  }, [key, defaultValue, storageOptions.storage]);

  // Cleanup do auto-save
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    setValue,
    save,
    remove,
    reload,
    // Utilitários
    hasValue: state.value !== null && state.value !== undefined,
    isReady: !state.loading && isInitializedRef.current,
    hasError: state.error !== null
  };
};

/**
 * Hook simplificado para valores primitivos
 */
export const useSecureValue = <T extends string | number | boolean>(
  key: string,
  defaultValue: T,
  options: Omit<UseEnhancedSecureStorageOptions, 'defaultValue'> = {}
) => {
  const storage = useEnhancedSecureStorage<T>(key, {
    ...options,
    defaultValue,
    autoSave: true
  });

  return [storage.value, storage.setValue, storage] as const;
};

/**
 * Hook para objetos com auto-merge
 */
export const useSecureObject = <T extends Record<string, any>>(
  key: string,
  defaultValue: T,
  options: Omit<UseEnhancedSecureStorageOptions, 'defaultValue'> = {}
) => {
  const storage = useEnhancedSecureStorage<T>(key, {
    ...options,
    defaultValue,
    autoSave: true
  });

  const updateObject = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    storage.setValue(prev => {
      const updatesToApply = typeof updates === 'function' ? updates(prev) : updates;
      return { ...prev, ...updatesToApply };
    });
  }, [storage.setValue]);

  const resetObject = useCallback(() => {
    storage.setValue(defaultValue);
  }, [storage.setValue, defaultValue]);

  return {
    ...storage,
    updateObject,
    resetObject
  };
};

/**
 * Hook para arrays com métodos de manipulação
 */
export const useSecureArray = <T>(
  key: string,
  defaultValue: T[] = [],
  options: Omit<UseEnhancedSecureStorageOptions, 'defaultValue'> = {}
) => {
  const storage = useEnhancedSecureStorage<T[]>(key, {
    ...options,
    defaultValue,
    autoSave: true
  });

  const push = useCallback((item: T) => {
    storage.setValue(prev => [...prev, item]);
  }, [storage.setValue]);

  const remove = useCallback((index: number) => {
    storage.setValue(prev => prev.filter((_, i) => i !== index));
  }, [storage.setValue]);

  const update = useCallback((index: number, item: T) => {
    storage.setValue(prev => prev.map((existing, i) => i === index ? item : existing));
  }, [storage.setValue]);

  const clear = useCallback(() => {
    storage.setValue([]);
  }, [storage.setValue]);

  const find = useCallback((predicate: (item: T) => boolean) => {
    return storage.value.find(predicate);
  }, [storage.value]);

  return {
    ...storage,
    push,
    remove: remove,
    update,
    clear,
    find,
    length: storage.value.length
  };
};

/**
 * Hook para configurações de usuário
 */
export const useSecureUserSettings = <T extends Record<string, any>>(
  defaultSettings: T,
  options: Omit<UseEnhancedSecureStorageOptions, 'defaultValue' | 'context'> = {}
) => {
  return useSecureObject('user_settings', defaultSettings, {
    ...options,
    context: 'user_preferences',
    encrypt: true,
    enableIntegrityCheck: true
  });
};

/**
 * Hook para cache temporário seguro
 */
export const useSecureCache = <T>(
  key: string,
  ttl: number = 30 * 60 * 1000, // 30 minutos por padrão
  options: Omit<UseEnhancedSecureStorageOptions, 'ttl' | 'storage'> = {}
) => {
  return useEnhancedSecureStorage<T>(key, {
    ...options,
    ttl,
    storage: 'sessionStorage',
    context: 'cache',
    autoSave: true
  });
};

export default useEnhancedSecureStorage;