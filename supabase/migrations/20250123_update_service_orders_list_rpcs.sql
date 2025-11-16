-- Atualizar funções get_service_orders e get_service_order_by_id para incluir formatted_id sequencial
-- Data: 2025-01-23
-- Descrição: Adiciona formatted_id com numeração sequencial às funções de listagem

-- Remover e recriar função get_service_orders
DROP FUNCTION IF EXISTS public.get_service_orders(integer, integer, text, text, date, date, text, text);

CREATE OR REPLACE FUNCTION public.get_service_orders(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  client_name text,
  device_type text,
  device_model text,
  status text,
  priority text,
  total_price decimal,
  is_paid boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  owner_id uuid,
  owner_name text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário tem acesso às ordens de serviço beta
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (service_orders_beta_enabled = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para acessar ordens de serviço beta';
  END IF;

  RETURN QUERY
  WITH filtered_orders AS (
    SELECT 
      so.id,
      format_service_order_id(so.sequential_number) as formatted_id,
      c.name as client_name,
      so.device_type,
      so.device_model,
      so.status,
      so.priority,
      so.total_price,
      so.is_paid,
      so.created_at,
      so.updated_at,
      so.owner_id,
      up.name as owner_name
    FROM service_orders so
    LEFT JOIN user_profiles up ON so.owner_id = up.id
    LEFT JOIN clients c ON so.client_id = c.id
    WHERE 
      so.deleted_at IS NULL
      AND (p_status IS NULL OR so.status = p_status)
      AND (p_search IS NULL OR 
           c.name ILIKE '%' || p_search || '%' OR 
           so.device_type ILIKE '%' || p_search || '%' OR
           so.device_model ILIKE '%' || p_search || '%' OR
           format_service_order_id(so.sequential_number) ILIKE '%' || p_search || '%')
      AND (p_start_date IS NULL OR so.created_at::date >= p_start_date)
      AND (p_end_date IS NULL OR so.created_at::date <= p_end_date)
      AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin())
  ),
  total_count_query AS (
    SELECT COUNT(*) as total FROM filtered_orders
  )
  SELECT 
    fo.id,
    fo.formatted_id,
    fo.client_name,
    fo.device_type,
    fo.device_model,
    fo.status,
    fo.priority,
    fo.total_price,
    fo.is_paid,
    fo.created_at,
    fo.updated_at,
    fo.owner_id,
    fo.owner_name,
    tc.total
  FROM filtered_orders fo
  CROSS JOIN total_count_query tc
  ORDER BY 
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN fo.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN fo.created_at END ASC,
    CASE WHEN p_sort_by = 'client_name' AND p_sort_order = 'desc' THEN fo.client_name END DESC,
    CASE WHEN p_sort_by = 'client_name' AND p_sort_order = 'asc' THEN fo.client_name END ASC,
    CASE WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN fo.status END DESC,
    CASE WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN fo.status END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Remover e recriar função get_service_order_by_id
DROP FUNCTION IF EXISTS public.get_service_order_by_id(uuid);

CREATE OR REPLACE FUNCTION public.get_service_order_by_id(p_id uuid)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  client_name text,
  device_type text,
  device_model text,
  status text,
  priority text,
  total_price decimal,
  is_paid boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  owner_id uuid,
  owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário tem acesso às ordens de serviço beta
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND (service_orders_beta_enabled = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não tem permissão para acessar ordens de serviço beta';
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    format_service_order_id(so.sequential_number) as formatted_id,
    c.name as client_name,
    so.device_type,
    so.device_model,
    so.status,
    so.priority,
    so.total_price,
    so.is_paid,
    so.created_at,
    so.updated_at,
    so.owner_id,
    up.name as owner_name
  FROM service_orders so
  LEFT JOIN user_profiles up ON so.owner_id = up.id
  LEFT JOIN clients c ON so.client_id = c.id
  WHERE so.id = p_id 
    AND so.deleted_at IS NULL
    AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin());
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.get_service_orders(integer, integer, text, text, date, date, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_order_by_id(uuid) TO anon, authenticated;

-- Comentários
COMMENT ON FUNCTION public.get_service_orders(integer, integer, text, text, date, date, text, text) IS 'Lista ordens de serviço com formatted_id sequencial e filtros';
COMMENT ON FUNCTION public.get_service_order_by_id(uuid) IS 'Obtém ordem de serviço específica com formatted_id sequencial';