-- Replace admin_list_licenses to include user_email and user_name
-- Drop existing function with old return type first
DROP FUNCTION IF EXISTS public.admin_list_licenses(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_list_licenses(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,  -- 'active', 'inactive', 'expired'
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  code text,
  user_id uuid,
  is_active boolean,
  derived_status text,
  license_type text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  notes text,
  user_email text,
  user_name text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    l.id,
    l.code,
    l.user_id,
    l.is_active,
    CASE
      WHEN l.is_active IS false THEN 'inactive'
      WHEN l.expires_at IS NOT NULL AND l.expires_at < now() THEN 'expired'
      WHEN l.is_active IS true AND (l.expires_at IS NULL OR l.expires_at >= now()) THEN 'active'
      ELSE 'unknown'
    END AS derived_status,
    l.license_type,
    l.expires_at,
    l.created_at,
    l.updated_at,
    l.notes,
    au.email AS user_email,
    up.name AS user_name
  FROM public.licenses l
  LEFT JOIN auth.users au ON au.id = l.user_id
  LEFT JOIN public.user_profiles up ON up.id = l.user_id
  WHERE
    (p_search IS NULL OR (
      l.code ILIKE '%' || p_search || '%' OR
      l.notes ILIKE '%' || p_search || '%' OR
      au.email ILIKE '%' || p_search || '%' OR
      up.name ILIKE '%' || p_search || '%'
    ))
    AND (p_status IS NULL OR
      CASE
        WHEN l.is_active IS false THEN 'inactive'
        WHEN l.expires_at IS NOT NULL AND l.expires_at < now() THEN 'expired'
        WHEN l.is_active IS true AND (l.expires_at IS NULL OR l.expires_at >= now()) THEN 'active'
        ELSE 'unknown'
      END = p_status)
  ORDER BY l.created_at DESC
  LIMIT p_page_size
  OFFSET GREATEST(p_page - 1, 0) * p_page_size;
$$;

COMMENT ON FUNCTION public.admin_list_licenses IS 'Super admin: listar licenças com filtros básicos para o painel /supadmin/licenca, incluindo e-mail e nome do usuário.';