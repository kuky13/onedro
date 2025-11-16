-- Fix get_deleted_service_orders function overloading conflict
-- Remove the version with parameters and keep only the parameterless version

-- Drop the version with parameters that's causing the conflict
DROP FUNCTION IF EXISTS public.get_deleted_service_orders(
  p_limit integer,
  p_offset integer,
  p_search text,
  p_start_date date,
  p_end_date date,
  p_sort_by text,
  p_sort_order text
);

-- Ensure the parameterless version exists and is correct
CREATE OR REPLACE FUNCTION public.get_deleted_service_orders()
RETURNS TABLE(
  id uuid,
  owner_id uuid,
  client_id uuid,
  device_type character varying,
  device_model character varying,
  imei_serial character varying,
  reported_issue text,
  status character varying,
  priority character varying,
  total_price numeric,
  labor_cost numeric,
  parts_cost numeric,
  is_paid boolean,
  delivery_date timestamp with time zone,
  warranty_months integer,
  notes text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user has access to service orders
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND (service_orders_beta_enabled = true OR role = 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado: Módulo Service Orders não habilitado';
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    so.owner_id,
    so.client_id,
    so.device_type,
    so.device_model,
    so.imei_serial,
    so.reported_issue,
    so.status,
    so.priority,
    so.total_price,
    so.labor_cost,
    so.parts_cost,
    so.is_paid,
    so.delivery_date,
    so.warranty_months,
    so.notes,
    so.created_at,
    so.updated_at,
    so.deleted_at,
    so.deleted_by
  FROM service_orders so
  WHERE 
    so.deleted_at IS NOT NULL
    AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin())
  ORDER BY so.deleted_at DESC;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_deleted_service_orders() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_deleted_service_orders IS 'Get deleted service orders for current user or admin - parameterless version';