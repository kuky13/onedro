-- Drop existing function and create improved validate_user_license_complete function
-- This implements the robust RPC as defined in the improvement plan

-- Drop the existing function first
DROP FUNCTION IF EXISTS validate_user_license_complete(UUID);

-- Create the new improved function that returns JSONB
CREATE OR REPLACE FUNCTION validate_user_license_complete(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE 
  l RECORD;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get the most recent active license for the user
  SELECT * INTO l FROM licenses 
  WHERE user_id = p_user_id AND is_active = TRUE 
  ORDER BY activated_at DESC NULLS LAST, created_at DESC LIMIT 1;

  -- No license found
  IF l IS NULL THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença ativa',
      'requires_activation', true,
      'timestamp', current_time
    );
  END IF;

  -- Check if license is expired
  IF l.expires_at IS NOT NULL AND l.expires_at < current_time THEN
    -- Deactivate expired license
    UPDATE licenses 
    SET is_active = FALSE, last_validation = current_time 
    WHERE id = l.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'message', 'Licença expirada',
      'license_code', l.code,
      'expired_at', l.expires_at,
      'activated_at', l.activated_at,
      'requires_renewal', true,
      'timestamp', current_time
    );
  END IF;

  -- Valid license - update last validation timestamp
  UPDATE licenses 
  SET last_validation = current_time 
  WHERE id = l.id;
  
  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', true,
    'license_code', l.code,
    'expires_at', l.expires_at,
    'activated_at', l.activated_at,
    'days_remaining', CASE 
      WHEN l.expires_at IS NULL THEN NULL 
      ELSE EXTRACT(DAY FROM l.expires_at - current_time)::INT 
    END,
    'message', 'Licença válida',
    'timestamp', current_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION validate_user_license_complete(UUID) TO authenticated;

-- Create audit table for license validations if it doesn't exist
CREATE TABLE IF NOT EXISTS license_validation_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  license_id UUID,
  validation_result JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit table
ALTER TABLE license_validation_audit ENABLE ROW LEVEL SECURITY;

-- Create policy for audit table (only admins can read)
CREATE POLICY "Admins can view license validation audit" ON license_validation_audit
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permissions on audit table
GRANT SELECT, INSERT ON license_validation_audit TO authenticated;
GRANT ALL ON license_validation_audit TO service_role;

-- Create function to log license validations
CREATE OR REPLACE FUNCTION log_license_validation(
  p_user_id UUID,
  p_license_id UUID,
  p_result JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO license_validation_audit (
    user_id,
    license_id,
    validation_result,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_license_id,
    p_result,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on logging function
GRANT EXECUTE ON FUNCTION log_license_validation(UUID, UUID, JSONB, INET, TEXT) TO authenticated;