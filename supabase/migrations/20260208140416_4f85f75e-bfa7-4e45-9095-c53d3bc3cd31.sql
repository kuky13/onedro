-- Drop the old function with two parameters
DROP FUNCTION IF EXISTS public.create_test_session(UUID, INTEGER);

-- Ensure only the single-parameter version exists
DROP FUNCTION IF EXISTS public.create_test_session(UUID);

-- Recreate the function with only one parameter
CREATE OR REPLACE FUNCTION public.create_test_session(p_service_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_share_token TEXT;
BEGIN
  -- Generate a unique share token using gen_random_uuid (native PostgreSQL)
  v_share_token := replace(gen_random_uuid()::text, '-', '');
  
  -- Insert new session
  INSERT INTO device_test_sessions (
    service_order_id,
    share_token,
    status,
    expires_at,
    created_by
  ) VALUES (
    p_service_order_id,
    v_share_token,
    'pending',
    NOW() + INTERVAL '24 hours',
    auth.uid()
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;