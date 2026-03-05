import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GameSettings {
  id?: string;
  speed_bug_spawn_rate: number;
  speed_bug_speed_multiplier: number;
  bug_spawn_percentage?: number | null;
  bug_damage?: number | null;
  hit_sound_enabled?: boolean | null;
  hit_sound_volume?: number | null;
  boss_bug_spawn_rate?: number | null;
  boss_bug_points?: number | null;
  boss_bug_timer?: number | null;
  boss_bug_damage?: number | null;
  created_at?: string;
  updated_at?: string;
}

export const useGameSettings = () => {
  const [settings, setSettings] = useState<GameSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await supabase
        .from('game_settings')
        .select('*')
        .limit(1)
        .single();
      
      let data = response.data;
      const error = response.error;

      if (error && error.code === 'PGRST116') { // No rows found
        // Insert default settings
        const defaultSettings = {
          speed_bug_spawn_rate: 0.02,
          speed_bug_speed_multiplier: 2.0,
          bug_spawn_percentage: 15.0,
          bug_damage: 10.0,
          hit_sound_enabled: true,
          hit_sound_volume: 0.5,
          boss_bug_spawn_rate: 0.002,
          boss_bug_points: 1000,
          boss_bug_timer: 7000,
          boss_bug_damage: 5
        };

        const { data: insertData, error: insertError } = await supabase
          .from('game_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        data = insertData;
      } else if (error) {
        throw error;
      }

      setSettings(data);
    } catch (err: any) {
      console.error('Erro ao buscar/criar configurações:', err);
      setError(err.message || 'Erro ao carregar configurações do jogo');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<GameSettings>) => {
    try {
      if (!settings?.id) {
        // If still no ID, try to fetch/create first
        await fetchSettings();
        if (!settings?.id) return { success: false, error: 'Configurações não encontradas' };
      }

      const { error } = await supabase
        .from('game_settings')
        .update(newSettings)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao atualizar configurações:', err);
      return { success: false, error: err.message || 'Erro desconhecido' };
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
};