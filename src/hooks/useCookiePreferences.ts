import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  performance: boolean;
  social: boolean;
  granular: Record<string, Record<string, boolean>>;
  expirationDays: number;
  autoCleanup: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  performance: false,
  social: false,
  granular: {},
  expirationDays: 365,
  autoCleanup: true,
};

const STORAGE_KEY = 'cookie_preferences';

export const useCookiePreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar preferências do localStorage ou Supabase
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // Usuário logado: carregar do Supabase
        const { data, error: supabaseError } = await supabase
          .from('user_cookie_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (supabaseError && supabaseError.code !== 'PGRST116') {
          throw supabaseError;
        }

        if (data) {
          const loadedPreferences: CookiePreferences = {
            essential: data.essential,
            functional: data.functional,
            analytics: data.analytics,
            marketing: data.marketing,
            performance: data.performance,
            social: data.social,
            granular: data.granular || {},
            expirationDays: data.expiration_days,
            autoCleanup: data.auto_cleanup,
          };
          setPreferences(loadedPreferences);
          // Sincronizar com localStorage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedPreferences));
        } else {
          // Não existe no Supabase, usar localStorage ou padrão
          const localPrefs = localStorage.getItem(STORAGE_KEY);
          if (localPrefs) {
            const parsed = JSON.parse(localPrefs);
            setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
          }
        }
      } else {
        // Usuário não logado: usar localStorage
        const localPrefs = localStorage.getItem(STORAGE_KEY);
        if (localPrefs) {
          const parsed = JSON.parse(localPrefs);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      }
    } catch (err) {
      console.error('Erro ao carregar preferências de cookies:', err);
      setError('Erro ao carregar preferências de cookies');
      // Fallback para localStorage
      const localPrefs = localStorage.getItem(STORAGE_KEY);
      if (localPrefs) {
        try {
          const parsed = JSON.parse(localPrefs);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch {
          setPreferences(DEFAULT_PREFERENCES);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Salvar preferências no localStorage e Supabase
  const savePreferences = useCallback(async (newPreferences: Partial<CookiePreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    // Sempre salvar no localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPreferences));

    // Se usuário logado, salvar no Supabase
    if (user) {
      try {
        const { error: supabaseError } = await supabase
          .from('user_cookie_preferences')
          .upsert({
            user_id: user.id,
            essential: updatedPreferences.essential,
            functional: updatedPreferences.functional,
            analytics: updatedPreferences.analytics,
            marketing: updatedPreferences.marketing,
            performance: updatedPreferences.performance,
            social: updatedPreferences.social,
            granular: updatedPreferences.granular,
            expiration_days: updatedPreferences.expirationDays,
            auto_cleanup: updatedPreferences.autoCleanup,
          });

        if (supabaseError) {
          console.error('Erro ao salvar no Supabase:', supabaseError);
          setError('Erro ao sincronizar preferências');
        }
      } catch (err) {
        console.error('Erro ao salvar preferências:', err);
        setError('Erro ao salvar preferências');
      }
    }
  }, [preferences, user]);

  // Verificar se um tipo de cookie é permitido
  const isAllowed = useCallback((type: keyof Omit<CookiePreferences, 'granular' | 'expirationDays' | 'autoCleanup'>) => {
    return preferences[type];
  }, [preferences]);

  // Verificar se um cookie granular específico é permitido
  const isGranularAllowed = useCallback((domain: string, category: string) => {
    return preferences.granular[domain]?.[category] ?? false;
  }, [preferences]);

  // Aceitar todos os cookies
  const acceptAll = useCallback(() => {
    savePreferences({
      functional: true,
      analytics: true,
      marketing: true,
      performance: true,
      social: true,
    });
  }, [savePreferences]);

  // Rejeitar todos os cookies opcionais
  const rejectAll = useCallback(() => {
    savePreferences({
      functional: false,
      analytics: false,
      marketing: false,
      performance: false,
      social: false,
      granular: {},
    });
  }, [savePreferences]);

  // Resetar para padrões
  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  // Carregar preferências quando o componente monta ou usuário muda
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    savePreferences,
    isAllowed,
    isGranularAllowed,
    acceptAll,
    rejectAll,
    resetToDefaults,
    reload: loadPreferences,
  };
};