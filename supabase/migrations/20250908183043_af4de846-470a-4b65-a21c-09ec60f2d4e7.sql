-- Create or replace admin RPCs for user listing used by the frontend
-- Ensure idempotency by dropping existing signatures first

-- Drop existing functions if they exist (matching our signature)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_get_users_with_license_details'
  ) THEN
    DROP FUNCTION public.admin_get_users_with_license_details();
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'admin_get_all_users'
  ) THEN
    DROP FUNCTION public.admin_get_all_users();
  END IF;
END $$;

-- Function returning users with license details
CREATE OR REPLACE FUNCTION public.admin_get_users_with_license_details()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  license_active boolean,
  license_code text,
  license_expires_at timestamptz,
  license_activated_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  budget_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.name,
    au.email,
    up.role,
    COALESCE(l.is_active, false) AS license_active,
    l.code AS license_code,
    l.expires_at AS license_expires_at,
    l.activated_at AS license_activated_at,
    up.created_at,
    au.last_sign_in_at,
    COALESCE(b.budget_count, 0)::int AS budget_count
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  LEFT JOIN LATERAL (
    SELECT li.*
    FROM public.licenses li
    WHERE li.user_id = up.id AND li.is_active = true
    ORDER BY li.activated_at DESC NULLS LAST
    LIMIT 1
  ) l ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS budget_count
    FROM public.budgets bd
    WHERE bd.owner_id = up.id AND bd.deleted_at IS NULL
  ) b ON true
  ORDER BY up.created_at DESC;
END;
$$;

-- Fallback function returning users without license details
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  budget_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT
    up.id,
    up.name,
    au.email,
    up.role,
    up.created_at,
    au.last_sign_in_at,
    COALESCE(b.budget_count, 0)::int AS budget_count
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS budget_count
    FROM public.budgets bd
    WHERE bd.owner_id = up.id AND bd.deleted_at IS NULL
  ) b ON true
  ORDER BY up.created_at DESC;
END;
$$;