-- Replace is_current_user_admin function without dropping it
-- Date: 2025-01-12
-- Description: Substitui a função is_current_user_admin para funcionar sem is_active

-- Replace the function with CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role TEXT;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- If no user is authenticated, return false
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user role from user_profiles
  SELECT role INTO user_role
  FROM public.user_profiles 
  WHERE id = current_user_id;
  
  -- Return true if user has admin role
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- In case of any error, return false for security
    RETURN FALSE;
END;
$$;

-- Create a debug function to help troubleshoot admin access issues
CREATE OR REPLACE FUNCTION public.debug_admin_access()
RETURNS TABLE(
  current_user_id uuid,
  user_email text,
  user_role text,
  is_admin_result boolean,
  profile_exists boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_id uuid;
  user_email_val text;
  user_role_val text;
  profile_exists_val boolean;
  is_admin_val boolean;
BEGIN
  -- Get current user info
  current_id := auth.uid();
  
  -- Get email from auth.users
  SELECT email INTO user_email_val
  FROM auth.users
  WHERE id = current_id;
  
  -- Get role from user_profiles and check if profile exists
  SELECT role INTO user_role_val
  FROM public.user_profiles
  WHERE id = current_id;
  
  profile_exists_val := FOUND;
  
  -- Test the admin function
  is_admin_val := public.is_current_user_admin();
  
  RETURN QUERY
  SELECT 
    current_id,
    COALESCE(user_email_val, 'No email found'),
    COALESCE(user_role_val, 'No role found'),
    is_admin_val,
    profile_exists_val;
END;
$$;

-- Grant execute permission to authenticated users for debug function
GRANT EXECUTE ON FUNCTION public.debug_admin_access() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.is_current_user_admin() IS 'Verifica se o usuário atual tem role de admin. Não depende da coluna is_active.';
COMMENT ON FUNCTION public.debug_admin_access() IS 'Função de debug para troubleshooting de problemas de acesso admin.';