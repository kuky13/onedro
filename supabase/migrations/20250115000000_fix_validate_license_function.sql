-- Fix validate_user_license_complete function to resolve timestamp issues

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS validate_user_license_complete(UUID);
DROP FUNCTION IF EXISTS public.validate_user_license_complete(UUID);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.validate_user_license_complete(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE 
  l RECORD;
  current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get the most recent active license for the user
  SELECT * INTO l FROM public.licenses 
  WHERE user_id = p_user_id AND is_active = TRUE 
  ORDER BY activated_at DESC NULLS LAST, created_at DESC LIMIT 1;

  -- No license found
  IF l IS NULL THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença ativa',
      'requires_activation', true,
      'timestamp', current_timestamp
    );
  END IF;

  -- Check if license is expired
  IF l.expires_at IS NOT NULL AND l.expires_at < current_timestamp THEN
    -- Deactivate expired license
    UPDATE public.licenses 
    SET is_active = FALSE, last_validation = current_timestamp 
    WHERE id = l.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'message', 'Licença expirada',
      'license_code', l.code,
      'expired_at', l.expires_at,
      'activated_at', l.activated_at,
      'requires_renewal', true,
      'timestamp', current_timestamp
    );
  END IF;

  -- Valid license - update last validation timestamp
  UPDATE public.licenses 
  SET last_validation = current_timestamp 
  WHERE id = l.id;
  
  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', true,
    'license_code', l.code,
    'expires_at', l.expires_at,
    'activated_at', l.activated_at,
    'days_remaining', CASE 
      WHEN l.expires_at IS NULL THEN NULL 
      ELSE EXTRACT(DAY FROM l.expires_at - current_timestamp)::INT 
    END,
    'message', 'Licença válida',
    'timestamp', current_timestamp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_user_license_complete(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_license_complete(UUID) TO anon;