-- Fix share URL domain from lovable.app to onedrip.com.br
-- This migration updates the generate_service_order_share_token function to use the correct domain

CREATE OR REPLACE FUNCTION public.generate_service_order_share_token(p_service_order_id uuid)
RETURNS TABLE(
  share_token text,
  share_url text,
  expires_at timestamptz
) AS $$
DECLARE
  v_token text;
  v_expires_at timestamptz;
  v_base_url text := 'https://onedrip.com.br';
BEGIN
  -- Check if user owns the service order
  IF NOT EXISTS (
    SELECT 1 FROM service_orders 
    WHERE id = p_service_order_id 
    AND owner_id = auth.uid()
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Service order not found or access denied';
  END IF;

  -- Generate a secure random token
  v_token := encode(gen_random_bytes(32), 'base64url');
  
  -- Set expiration to 30 days from now
  v_expires_at := now() + interval '30 days';
  
  -- Insert or update the share token
  INSERT INTO service_order_shares (
    service_order_id,
    share_token,
    expires_at,
    created_by
  ) VALUES (
    p_service_order_id,
    v_token,
    v_expires_at,
    auth.uid()
  )
  ON CONFLICT (service_order_id) 
  DO UPDATE SET
    share_token = EXCLUDED.share_token,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
  
  -- Return the token, URL and expiration
  RETURN QUERY SELECT 
    v_token,
    v_base_url || '/share/service-order/' || v_token,
    v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;