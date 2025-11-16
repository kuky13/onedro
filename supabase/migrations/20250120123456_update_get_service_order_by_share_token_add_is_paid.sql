-- Update get_service_order_by_share_token function to include is_paid field
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  device_type varchar,
  device_model varchar,
  reported_issue text,
  status varchar,
  is_paid boolean,
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

  -- Return service order data including payment status
  RETURN QUERY
  SELECT 
    so.id,
    ('OS-' || UPPER(SUBSTRING(so.id::text FROM 1 FOR 8))) as formatted_id,
    so.device_type,
    so.device_model,
    so.reported_issue,
    so.status::varchar,
    so.is_paid,
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