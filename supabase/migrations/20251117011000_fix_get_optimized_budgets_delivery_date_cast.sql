DROP FUNCTION IF EXISTS public.get_optimized_budgets(uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_optimized_budgets(
  p_user_id uuid,
  p_search_term text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  client_id uuid,
  client_name text,
  client_phone text,
  device_type text,
  device_model text,
  issue text,
  part_type text,
  part_quality text,
  cash_price numeric,
  installment_price numeric,
  installments integer,
  total_price numeric,
  warranty_months integer,
  includes_delivery boolean,
  includes_screen_protector boolean,
  custom_services text,
  payment_condition text,
  delivery_date timestamp with time zone,
  notes text,
  status text,
  workflow_status text,
  is_paid boolean,
  is_delivered boolean,
  sequential_number integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  approved_at timestamp with time zone,
  payment_confirmed_at timestamp with time zone,
  delivery_confirmed_at timestamp with time zone,
  expires_at timestamp with time zone,
  valid_until timestamp with time zone,
  deleted_at timestamp with time zone,
  deleted_by uuid,
  updated_by uuid
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.owner_id,
    b.client_id,
    b.client_name,
    b.client_phone,
    b.device_type,
    b.device_model,
    b.issue,
    b.part_type,
    b.part_quality,
    b.cash_price,
    b.installment_price,
    b.installments,
    b.total_price,
    b.warranty_months,
    b.includes_delivery,
    b.includes_screen_protector,
    b.custom_services,
    b.payment_condition,
    b.delivery_date::timestamp with time zone,
    b.notes,
    b.status,
    b.workflow_status,
    b.is_paid,
    b.is_delivered,
    b.sequential_number,
    b.created_at,
    b.updated_at,
    b.approved_at,
    b.payment_confirmed_at,
    b.delivery_confirmed_at,
    b.expires_at,
    b.valid_until,
    b.deleted_at,
    b.deleted_by,
    b.updated_by
  FROM budgets b
  WHERE b.owner_id = p_user_id
    AND b.deleted_at IS NULL
    AND b.workflow_status != 'template'
    AND COALESCE(b.client_name, '') != 'TEMPLATE'
    AND (
      p_search_term IS NULL OR
      (p_search_term ~ '^\d+$' AND b.sequential_number = p_search_term::integer) OR
      b.search_vector @@ plainto_tsquery('portuguese', p_search_term) OR
      b.client_name ILIKE '%' || p_search_term || '%' OR
      b.device_model ILIKE '%' || p_search_term || '%' OR
      b.device_type ILIKE '%' || p_search_term || '%' OR
      b.issue ILIKE '%' || p_search_term || '%' OR
      b.part_quality ILIKE '%' || p_search_term || '%' OR
      b.part_type ILIKE '%' || p_search_term || '%' OR
      b.client_phone ILIKE '%' || p_search_term || '%'
    )
    AND (p_status_filter IS NULL OR b.workflow_status = p_status_filter)
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;