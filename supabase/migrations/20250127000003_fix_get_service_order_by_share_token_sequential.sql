-- Fix get_service_order_by_share_token to use sequential_number format
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.get_service_order_by_share_token(text);

-- Update get_service_order_by_share_token function to include sequential_number and use correct format
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  sequential_number integer,
  device_type varchar,
  device_model varchar,
  reported_issue text,
  status varchar,
  is_paid boolean,
  total_price numeric,
  estimated_completion timestamptz,
  customer_notes text,
  device_serial varchar,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Validate share token exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM service_order_shares 
    WHERE share_token = p_share_token 
    AND is_active = true 
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  -- Return service order data with sequential format
  RETURN QUERY
  SELECT 
    so.id,
    CASE 
      WHEN so.sequential_number IS NOT NULL THEN 'OS: ' || LPAD(so.sequential_number::TEXT, 4, '0')
      ELSE 'OS: ' || SUBSTRING(so.id::text FROM 1 FOR 8)
    END as formatted_id,
    so.sequential_number,
    so.device_type,
    so.device_model,
    so.reported_issue,
    so.status::varchar,
    so.is_paid,
    so.total_price,
    so.estimated_completion,
    so.customer_notes,
    so.device_serial,
    so.created_at,
    so.updated_at
  FROM service_orders so
  JOIN service_order_shares sos ON so.id = sos.service_order_id
  WHERE sos.share_token = p_share_token
    AND sos.is_active = true
    AND sos.expires_at > now()
    AND so.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_service_order_by_share_token(text) TO anon, authenticated;