-- Atualizar função get_service_order_by_share_token para incluir campos de senha do dispositivo
-- Esta migração adiciona os campos device_password_type, device_password_value e device_password_metadata

-- Drop da função existente
DROP FUNCTION IF EXISTS public.get_service_order_by_share_token(text);

-- Criar função atualizada com campos de senha do dispositivo
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  device_type varchar,
  device_model varchar,
  imei_serial varchar,
  reported_issue text,
  status varchar,
  priority varchar,
  total_price numeric,
  labor_cost numeric,
  parts_cost numeric,
  is_paid boolean,
  delivery_date timestamptz,
  warranty_months integer,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  entry_date timestamptz,
  exit_date timestamptz,
  sequential_number integer,
  payment_status text,
  estimated_completion timestamptz,
  actual_completion timestamptz,
  customer_notes text,
  technician_notes text,
  last_customer_update timestamptz,
  customer_visible boolean,
  client_name text,
  client_email text,
  client_phone text,
  device_password_type varchar,
  device_password_value text,
  device_password_metadata jsonb
) AS $$
BEGIN
  -- Validate share token exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM service_order_shares 
    WHERE share_token = p_share_token::uuid 
    AND is_active = true 
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  -- Return complete service order data with device password fields
  RETURN QUERY
  SELECT 
    so.id,
    CASE 
      WHEN so.sequential_number IS NOT NULL THEN 'OS: ' || LPAD(so.sequential_number::text, 4, '0')
      ELSE 'OS-' || UPPER(SUBSTRING(so.id::text FROM 1 FOR 8))
    END as formatted_id,
    so.device_type,
    so.device_model,
    so.imei_serial,
    so.reported_issue,
    so.status::varchar,
    so.priority::varchar,
    so.total_price,
    so.labor_cost,
    so.parts_cost,
    so.is_paid,
    so.delivery_date,
    so.warranty_months,
    so.notes,
    so.created_at,
    so.updated_at,
    so.entry_date,
    so.exit_date,
    so.sequential_number,
    so.payment_status,
    so.estimated_completion,
    so.actual_completion,
    so.customer_notes,
    so.technician_notes,
    so.last_customer_update,
    so.customer_visible,
    c.name as client_name,
    c.email as client_email,
    c.phone as client_phone,
    so.device_password_type,
    so.device_password_value,
    so.device_password_metadata
  FROM service_orders so
  JOIN service_order_shares sos ON so.id = sos.service_order_id
  LEFT JOIN clients c ON so.client_id = c.id
  WHERE sos.share_token = p_share_token::uuid
    AND sos.is_active = true
    AND sos.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_service_order_by_share_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_service_order_by_share_token(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_service_order_by_share_token(text) IS 'Returns complete service order data by share token including device password fields';