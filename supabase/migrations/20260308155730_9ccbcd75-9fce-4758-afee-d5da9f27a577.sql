
-- Function to get service order by formatted_id (e.g., OS0001)
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
  client_email text
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
    COALESCE(so.formatted_id, 'OS' || LPAD(so.sequential_number::text, 4, '0')) as formatted_id,
    so.sequential_number,
    so.device_type,
    so.device_model,
    so.imei_serial,
    so.reported_issue,
    so.status,
    so.is_paid,
    so.created_at,
    so.updated_at,
    so.entry_date,
    so.exit_date,
    so.delivery_date,
    so.total_price,
    so.payment_status,
    so.estimated_completion,
    so.actual_completion,
    so.customer_notes,
    so.last_customer_update,
    so.warranty_months,
    so.device_password_type,
    so.device_password_value,
    so.device_password_metadata,
    so.device_checklist,
    so.customer_visible,
    so.priority,
    so.notes,
    so.technician_notes,
    so.labor_cost,
    so.parts_cost,
    c.name as client_name,
    c.phone as client_phone,
    c.email as client_email
  FROM service_orders so
  LEFT JOIN clients c ON so.client_id = c.id
  WHERE so.sequential_number = v_seq_number;
END;
$$;

-- Function to get company info by formatted_id
CREATE OR REPLACE FUNCTION public.get_company_info_by_formatted_id(p_formatted_id text)
RETURNS TABLE(
  name text,
  logo_url text,
  address text,
  whatsapp_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq_number integer;
  v_owner_id uuid;
BEGIN
  v_seq_number := NULLIF(regexp_replace(upper(p_formatted_id), '^OS0*', ''), '')::integer;
  
  IF v_seq_number IS NULL THEN
    RETURN;
  END IF;

  SELECT so.owner_id INTO v_owner_id
  FROM service_orders so
  WHERE so.sequential_number = v_seq_number
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ci.name,
    ci.logo_url,
    ci.address,
    ci.whatsapp_phone
  FROM company_info ci
  WHERE ci.owner_id = v_owner_id
  LIMIT 1;
END;
$$;
