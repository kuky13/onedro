-- Limpeza final de todas as referências ao sistema VIP/beta
-- Data: 2025-01-30

-- 1. REMOVER COLUNA service_orders_beta_enabled DA TABELA user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS service_orders_beta_enabled;

-- 2. RECRIAR TODAS AS FUNÇÕES RPC SEM VERIFICAÇÕES VIP/BETA
-- Dropar todas as funções que podem ter verificações VIP/beta
DROP FUNCTION IF EXISTS public.get_service_orders(integer,integer,text,text,date,date,text,text);
DROP FUNCTION IF EXISTS public.create_service_order(text,text,text);
DROP FUNCTION IF EXISTS public.update_service_order(uuid,text,text,text,text);
DROP FUNCTION IF EXISTS public.get_service_order_by_id(uuid);
DROP FUNCTION IF EXISTS public.get_deleted_service_orders(integer,integer,text,date,date,text,text);
DROP FUNCTION IF EXISTS public.update_service_order_status(uuid,text);
DROP FUNCTION IF EXISTS public.get_service_orders_summary();

-- 3. RECRIAR FUNÇÃO get_service_orders
CREATE OR REPLACE FUNCTION public.get_service_orders(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_sort_by text DEFAULT 'created_at',
  p_sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  owner_id uuid,
  owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT 
      so.id,
      so.title,
      so.description,
      so.status,
      so.priority,
      so.created_at,
      so.updated_at,
      so.owner_id,
      up.name as owner_name
    FROM service_orders so
    LEFT JOIN user_profiles up ON so.owner_id = up.id
    WHERE so.deleted_at IS NULL
      AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin())
      AND (p_search IS NULL OR (so.title ILIKE '%' || p_search || '%' OR so.description ILIKE '%' || p_search || '%'))
      AND (p_status IS NULL OR so.status = p_status)
      AND (p_start_date IS NULL OR so.created_at::date >= p_start_date)
      AND (p_end_date IS NULL OR so.created_at::date <= p_end_date)
  )
  SELECT 
    fo.id,
    fo.title,
    fo.description,
    fo.status,
    fo.priority,
    fo.created_at,
    fo.updated_at,
    fo.owner_id,
    fo.owner_name
  FROM filtered_orders fo
  ORDER BY
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN fo.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN fo.created_at END ASC,
    CASE WHEN p_sort_by = 'title' AND p_sort_order = 'desc' THEN fo.title END DESC,
    CASE WHEN p_sort_by = 'title' AND p_sort_order = 'asc' THEN fo.title END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 4. RECRIAR FUNÇÃO create_service_order
CREATE OR REPLACE FUNCTION public.create_service_order(
  p_title text,
  p_description text,
  p_priority text DEFAULT 'medium'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order_id uuid;
BEGIN
  INSERT INTO service_orders (title, description, priority, owner_id)
  VALUES (p_title, p_description, p_priority, auth.uid())
  RETURNING id INTO new_order_id;

  RETURN new_order_id;
END;
$$;

-- 5. RECRIAR FUNÇÃO update_service_order
CREATE OR REPLACE FUNCTION public.update_service_order(
  p_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE service_orders
  SET 
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    priority = COALESCE(p_priority, priority),
    updated_at = NOW()
  WHERE id = p_id
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());

  RETURN FOUND;
END;
$$;

-- 6. RECRIAR FUNÇÃO get_service_order_by_id
CREATE OR REPLACE FUNCTION public.get_service_order_by_id(p_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  owner_id uuid,
  owner_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.title,
    so.description,
    so.status,
    so.priority,
    so.created_at,
    so.updated_at,
    so.owner_id,
    up.name as owner_name
  FROM service_orders so
  LEFT JOIN user_profiles up ON so.owner_id = up.id
  WHERE so.id = p_id 
    AND so.deleted_at IS NULL
    AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin());
END;
$$;

-- 7. RECRIAR FUNÇÃO get_deleted_service_orders
CREATE OR REPLACE FUNCTION public.get_deleted_service_orders(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_sort_by text DEFAULT 'deleted_at',
  p_sort_order text DEFAULT 'desc'
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  owner_id uuid,
  owner_name text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas admins podem ver ordens deletadas
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver ordens deletadas';
  END IF;

  RETURN QUERY
  WITH filtered_orders AS (
    SELECT 
      so.id,
      so.title,
      so.description,
      so.status,
      so.priority,
      so.created_at,
      so.updated_at,
      so.deleted_at,
      so.owner_id,
      up.name as owner_name
    FROM service_orders so
    LEFT JOIN user_profiles up ON so.owner_id = up.id
    WHERE so.deleted_at IS NOT NULL
      AND (p_search IS NULL OR (so.title ILIKE '%' || p_search || '%' OR so.description ILIKE '%' || p_search || '%'))
      AND (p_start_date IS NULL OR so.deleted_at::date >= p_start_date)
      AND (p_end_date IS NULL OR so.deleted_at::date <= p_end_date)
  ),
  total_count_query AS (
    SELECT COUNT(*) as total_count FROM filtered_orders
  )
  SELECT 
    fo.id,
    fo.title,
    fo.description,
    fo.status,
    fo.priority,
    fo.created_at,
    fo.updated_at,
    fo.deleted_at,
    fo.owner_id,
    fo.owner_name,
    tcq.total_count
  FROM filtered_orders fo
  CROSS JOIN total_count_query tcq
  ORDER BY
    CASE WHEN p_sort_by = 'deleted_at' AND p_sort_order = 'desc' THEN fo.deleted_at END DESC,
    CASE WHEN p_sort_by = 'deleted_at' AND p_sort_order = 'asc' THEN fo.deleted_at END ASC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN fo.created_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN fo.created_at END ASC,
    CASE WHEN p_sort_by = 'title' AND p_sort_order = 'desc' THEN fo.title END DESC,
    CASE WHEN p_sort_by = 'title' AND p_sort_order = 'asc' THEN fo.title END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 8. RECRIAR FUNÇÃO update_service_order_status
CREATE OR REPLACE FUNCTION public.update_service_order_status(
  p_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE service_orders
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NULL
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());

  RETURN FOUND;
END;
$$;

-- 9. RECRIAR FUNÇÃO get_service_orders_summary
CREATE OR REPLACE FUNCTION public.get_service_orders_summary()
RETURNS TABLE(
  total_orders bigint,
  pending_orders bigint,
  in_progress_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders
  FROM service_orders
  WHERE deleted_at IS NULL
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());
END;
$$;

-- 10. COMENTÁRIOS FINAIS
-- Sistema VIP/beta foi completamente removido
-- Todas as funções agora usam apenas verificação de admin ou proprietário
-- Não há mais colunas service_orders_vip_enabled ou service_orders_beta_enabled