-- Fix game_settings RLS policies and is_current_user_admin function
-- Date: 2025-01-25
-- Description: Corrige políticas RLS da tabela game_settings e função is_current_user_admin

-- 1. Corrigir função is_current_user_admin (remover referência à coluna is_active inexistente)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Obter role do usuário atual
  SELECT role INTO user_role
  FROM public.user_profiles 
  WHERE id = auth.uid();
  
  -- Retornar true se for admin
  RETURN COALESCE(user_role = 'admin', false);
END;
$$;

-- 2. Dropar políticas existentes da tabela game_settings
DROP POLICY IF EXISTS "Admins can manage game settings" ON public.game_settings;
DROP POLICY IF EXISTS "Users can view game settings" ON public.game_settings;

-- 3. Criar novas políticas RLS mais permissivas para game_settings
-- Permitir que usuários autenticados leiam as configurações
CREATE POLICY "Authenticated users can view game settings" 
ON public.game_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Permitir que usuários autenticados insiram configurações (para criar configurações padrão)
CREATE POLICY "Authenticated users can insert game settings" 
ON public.game_settings 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Permitir que admins façam todas as operações
CREATE POLICY "Admins can manage game settings" 
ON public.game_settings 
FOR ALL 
USING (public.is_current_user_admin());

-- 4. Garantir que existe pelo menos uma configuração padrão
INSERT INTO public.game_settings (
  speed_bug_spawn_rate, 
  speed_bug_speed_multiplier,
  bug_spawn_percentage,
  bug_damage,
  hit_sound_enabled,
  hit_sound_volume,
  boss_bug_spawn_rate,
  boss_bug_points,
  boss_bug_timer,
  boss_bug_damage
) 
VALUES (
  0.02, 
  2.0,
  15.0,
  10.0,
  true,
  0.5,
  0.01,
  100,
  30,
  20
)
ON CONFLICT DO NOTHING;

-- 5. Conceder permissões para os roles anon e authenticated
GRANT SELECT ON public.game_settings TO anon;
GRANT ALL PRIVILEGES ON public.game_settings TO authenticated;