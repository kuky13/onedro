-- Create improved license validation function
CREATE OR REPLACE FUNCTION validate_user_license_complete(p_user_id UUID)
RETURNS TABLE(
  has_license BOOLEAN,
  is_valid BOOLEAN,
  license_code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  message TEXT,
  expired_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  license_record RECORD;
  current_timestamp TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get the user's license
  SELECT * INTO license_record 
  FROM licenses 
  WHERE user_id = p_user_id 
  AND is_active = TRUE 
  ORDER BY activated_at DESC 
  LIMIT 1;

  -- If no license found
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE as has_license,
      FALSE as is_valid,
      NULL::TEXT as license_code,
      NULL::TIMESTAMP WITH TIME ZONE as expires_at,
      NULL::TIMESTAMP WITH TIME ZONE as activated_at,
      0 as days_remaining,
      'Nenhuma licença encontrada' as message,
      NULL::TIMESTAMP WITH TIME ZONE as expired_at;
    RETURN;
  END IF;

  -- License found, check if it's valid (not expired)
  IF license_record.expires_at > current_timestamp THEN
    -- Valid license
    RETURN QUERY SELECT 
      TRUE as has_license,
      TRUE as is_valid,
      license_record.code as license_code,
      license_record.expires_at,
      license_record.activated_at,
      EXTRACT(DAYS FROM (license_record.expires_at - current_timestamp))::INTEGER as days_remaining,
      'Licença válida' as message,
      NULL::TIMESTAMP WITH TIME ZONE as expired_at;
  ELSE
    -- Expired license
    RETURN QUERY SELECT 
      TRUE as has_license,
      FALSE as is_valid,
      license_record.code as license_code,
      license_record.expires_at,
      license_record.activated_at,
      0 as days_remaining,
      'Licença expirada' as message,
      license_record.expires_at as expired_at;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;