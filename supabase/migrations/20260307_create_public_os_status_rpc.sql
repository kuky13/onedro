-- Function to get public service order status without authentication
-- Returns limited information for customer tracking via QR Code

CREATE OR REPLACE FUNCTION get_public_os_status(p_order_id uuid)
RETURNS TABLE (
  id uuid,
  sequential_number bigint,
  device_model text,
  status text,
  entry_date timestamptz,
  updated_at timestamptz,
  shop_name text,
  shop_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.sequential_number,
    so.device_model,
    so.status,
    so.entry_date,
    so.updated_at,
    sp.shop_name,
    sp.contact_phone as shop_phone
  FROM service_orders so
  LEFT JOIN shop_profiles sp ON sp.user_id = so.owner_id
  WHERE so.id = p_order_id
  AND so.deleted_at IS NULL;
END;
$$;

-- Grant access to anonymous users (public)
GRANT EXECUTE ON FUNCTION get_public_os_status(uuid) TO anon, authenticated, service_role;
