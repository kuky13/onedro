-- Fix admin_create_custom_license (RAISE syntax) and update related license RPCs
CREATE OR REPLACE FUNCTION public.admin_create_custom_license(
  p_user_id uuid,
  p_days integer,
  p_license_type text DEFAULT 'standard',
  p_notes text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_code text DEFAULT NULL,
  p_license_name text DEFAULT NULL
)
RETURNS public.licenses
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_license public.licenses;
  v_days integer;
  v_expires_at timestamptz;
  v_code text;
BEGIN
  -- Normalize days
  v_days := GREATEST(p_days, 1);
  v_expires_at := now() + (v_days || ' days')::interval;

  -- Decide license code
  IF p_code IS NOT NULL THEN
    -- Ensure provided code is unique
    IF EXISTS (SELECT 1 FROM public.licenses WHERE code = p_code) THEN
      RAISE EXCEPTION 'Já existe uma licença com este código ( % ). Escolha outro código.', p_code;
    END IF;
    v_code := p_code;
  ELSE
    -- Generate random, unique code
    LOOP
      v_code := encode(gen_random_bytes(12), 'hex'); -- 24-char hex
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.licenses WHERE code = v_code);
    END LOOP;
  END IF;

  INSERT INTO public.licenses (
    code,
    user_id,
    is_active,
    license_type,
    expires_at,
    notes,
    created_at,
    updated_at,
    metadata
  ) VALUES (
    v_code,
    p_user_id,
    p_is_active,
    p_license_type,
    v_expires_at,
    p_notes,
    now(),
    now(),
    CASE
      WHEN p_license_name IS NOT NULL THEN jsonb_build_object('name', p_license_name)
      ELSE '{}'::jsonb
    END
  )
  RETURNING * INTO v_license;

  RETURN v_license;
END;
$$;

COMMENT ON FUNCTION public.admin_create_custom_license(uuid, integer, text, text, boolean, text, text)
IS 'Super admin: cria uma licença personalizada, permitindo código opcional, nome e garantindo unicidade do código.';


CREATE OR REPLACE FUNCTION public.admin_update_license_full(
  p_license_id uuid,
  p_user_id uuid,
  p_is_active boolean,
  p_expires_at timestamptz,
  p_license_type text,
  p_notes text,
  p_license_name text DEFAULT NULL
)
RETURNS public.licenses
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_license public.licenses;
BEGIN
  UPDATE public.licenses
  SET
    user_id = p_user_id,
    is_active = p_is_active,
    expires_at = p_expires_at,
    license_type = p_license_type,
    notes = p_notes,
    metadata = CASE
      WHEN p_license_name IS NOT NULL THEN
        COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('name', p_license_name)
      ELSE
        metadata
    END,
    updated_at = now()
  WHERE id = p_license_id
  RETURNING * INTO v_license;

  RETURN v_license;
END;
$$;

COMMENT ON FUNCTION public.admin_update_license_full(uuid, uuid, boolean, timestamptz, text, text, text)
IS 'Super admin: atualiza licença completa, incluindo nome em metadata->"name".';


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
  user_name text,
  license_name text
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
    up.name AS user_name,
    (l.metadata ->> 'name')::text AS license_name
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

COMMENT ON FUNCTION public.admin_list_licenses IS 'Super admin: listar licenças com filtros básicos para o painel /supadmin/licenca, incluindo e-mail, nome do usuário e nome da licença.';