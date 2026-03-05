-- Primeiro, remover a função existente
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(text, text, text, integer, integer);

-- Recriar a função com a assinatura correta
CREATE OR REPLACE FUNCTION public.admin_get_all_users_detailed(
  p_search TEXT DEFAULT NULL,
  p_role_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  created_at TIMESTAMPTZ,
  license_id UUID,
  license_code TEXT,
  license_expires_at TIMESTAMPTZ,
  license_is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    up.id,
    COALESCE(au.email, 'No email')::TEXT as email,
    COALESCE(up.name, 'Unnamed')::TEXT as name,
    up.created_at,
    l.id as license_id,
    l.code as license_code,
    l.expires_at as license_expires_at,
    l.is_active as license_is_active
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  LEFT JOIN licenses l ON l.user_id = up.id
  WHERE 
    -- Filtro de busca
    (p_search IS NULL OR p_search = '' OR 
      up.name ILIKE '%' || p_search || '%' OR 
      au.email ILIKE '%' || p_search || '%')
    -- Filtro de role
    AND (p_role_filter IS NULL OR up.role = p_role_filter)
    -- Filtro de status de licença
    AND (
      p_status_filter IS NULL OR
      CASE 
        WHEN p_status_filter = 'with_license' THEN l.id IS NOT NULL AND l.is_active = true
        WHEN p_status_filter = 'without_license' THEN l.id IS NULL
        WHEN p_status_filter = 'expired' THEN l.id IS NOT NULL AND (l.is_active = false OR l.expires_at < NOW())
        ELSE true
      END
    )
  ORDER BY up.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;