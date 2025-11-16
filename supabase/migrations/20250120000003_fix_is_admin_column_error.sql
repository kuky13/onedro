-- Fix is_current_user_admin function - replace is_admin column with role check
-- This migration fixes the "column is_admin does not exist" error in admin licenses panel
-- Date: 2025-01-20
-- Description: Updates the is_current_user_admin function to use role = 'admin' instead of is_admin = TRUE

-- Drop and recreate the function with correct column reference
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  has_valid_license BOOLEAN;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Buscar role do usuário
  SELECT role INTO user_role
  FROM public.user_profiles 
  WHERE id = user_id;

  -- Verificar se tem licença válida
  SELECT public.is_user_license_active(user_id) INTO has_valid_license;

  -- Retornar true se for admin E tiver licença válida
  RETURN (user_role = 'admin' AND has_valid_license);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_current_user_admin() IS 'Verifica se o usuário atual é admin e tem licença válida. Corrigido para usar role ao invés de is_admin.';