-- Migration: Add RPC get_client_service_order_count
-- Description: Counts service orders per client (simple count without permission checks)

-- Create function
DROP FUNCTION IF EXISTS public.get_client_service_order_count(uuid);
CREATE OR REPLACE FUNCTION public.get_client_service_order_count(client_id UUID)
RETURNS INTEGER AS $$
DECLARE
  service_order_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO service_order_count
  FROM public.service_orders
  WHERE client_id = get_client_service_order_count.client_id
    AND deleted_at IS NULL;
  
  RETURN COALESCE(service_order_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_client_service_order_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_client_service_order_count(uuid) TO authenticated;