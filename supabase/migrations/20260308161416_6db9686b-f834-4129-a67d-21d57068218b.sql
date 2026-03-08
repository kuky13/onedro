DROP FUNCTION IF EXISTS public.get_service_order_by_formatted_id(text);

CREATE OR REPLACE FUNCTION public.get_service_order_by_formatted_id(p_formatted_id text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  sequential_number integer,
  device_type text,
  device_model text,
  imei_serial text,
  reported_issue text,
  status text,
  is_paid boolean,
  created_at timestamptz,
  updated_at timestamptz,
  entry_date timestamptz,
  exit_date timestamptz,
  delivery_date timestamptz,
  total_price numeric,
  payment_status text,
  estimated_completion timestamptz,
  actual_completion timestamptz,
  customer_notes text,
  last_customer_update timestamptz,
  warranty_months integer,
  device_password_type text,
  device_password_value text,
  device_password_metadata jsonb,
  device_checklist jsonb,
  customer_visible boolean,
  priority text,
  notes text,
  technician_notes text,
  labor_cost numeric,
  parts_cost numeric,
  client_name text,
  client_phone text,
  client_email text,
  owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq_number integer;
BEGIN
  v_seq_number := NULLIF(regexp_replace(upper(p_formatted_id), '^OS0*', ''), '')::integer;
  
  IF v_seq_number IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    so.id,
    ('OS' || LPAD(so.sequential_number::text, 4, '0'))::text as formatted_id,
    so.sequential_number,
    so.device_type::text,
    so.device_model::text,
    so.imei_serial::text,
    so.reported_issue::text,
    so.status::text,
    COALESCE(so.is_paid, false)::boolean,
    so.created_at::timestamptz,
    so.updated_at::timestamptz,
    so.entry_date::timestamptz,
    so.exit_date::timestamptz,
    so.delivery_date::timestamptz,
    so.total_price::numeric,
    so.payment_status::text,
    so.estimated_completion::timestamptz,
    so.actual_completion::timestamptz,
    so.customer_notes::text,
    so.last_customer_update::timestamptz,
    so.warranty_months::integer,
    so.device_password_type::text,
    so.device_password_value::text,
    so.device_password_metadata::jsonb,
    so.device_checklist::jsonb,
    so.customer_visible::boolean,
    so.priority::text,
    so.notes::text,
    so.technician_notes::text,
    so.labor_cost::numeric,
    so.parts_cost::numeric,
    c.name::text as client_name,
    c.phone::text as client_phone,
    c.email::text as client_email,
    so.owner_id
  FROM service_orders so
  LEFT JOIN clients c ON so.client_id = c.id
  WHERE so.sequential_number = v_seq_number;
END;
$$;