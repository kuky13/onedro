-- Enhanced licenses table with tracking fields
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_validation TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_licenses_user_active ON public.licenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_licenses_code ON public.licenses(code);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON public.licenses(expires_at);

-- Drop existing function first
DROP FUNCTION IF EXISTS public.validate_user_license_complete(uuid);

-- Enhanced license validation function
CREATE FUNCTION public.validate_user_license_complete(p_user_id uuid)
RETURNS TABLE(
  has_license boolean,
  is_valid boolean,
  license_code text,
  expires_at timestamp with time zone,
  activated_at timestamp with time zone,
  days_remaining integer,
  message text,
  requires_activation boolean,
  requires_renewal boolean,
  expired_at timestamp with time zone,
  validation_timestamp timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record public.licenses%ROWTYPE;
  current_time timestamp with time zone := NOW();
BEGIN
  -- Search for active license
  SELECT * INTO license_record
  FROM public.licenses
  WHERE user_id = p_user_id 
  AND is_active = TRUE
  ORDER BY activated_at DESC
  LIMIT 1;
  
  -- Update last validation timestamp
  IF FOUND THEN
    UPDATE public.licenses 
    SET last_validation = current_time
    WHERE id = license_record.id;
  END IF;
  
  -- Return validation result
  RETURN QUERY
  SELECT 
    FOUND as has_license,
    CASE 
      WHEN NOT FOUND THEN FALSE
      WHEN license_record.expires_at IS NULL THEN TRUE
      WHEN license_record.expires_at > current_time THEN TRUE
      ELSE FALSE
    END as is_valid,
    COALESCE(license_record.code, '') as license_code,
    license_record.expires_at,
    license_record.activated_at,
    CASE 
      WHEN license_record.expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(days FROM (license_record.expires_at - current_time))::integer)
    END as days_remaining,
    CASE 
      WHEN NOT FOUND THEN 'Nenhuma licença encontrada'
      WHEN license_record.expires_at IS NULL THEN 'Licença ativa (sem expiração)'
      WHEN license_record.expires_at > current_time THEN 'Licença válida'
      ELSE 'Licença expirada'
    END as message,
    NOT FOUND as requires_activation,
    CASE 
      WHEN NOT FOUND THEN FALSE
      WHEN license_record.expires_at IS NULL THEN FALSE
      ELSE license_record.expires_at <= current_time
    END as requires_renewal,
    CASE 
      WHEN license_record.expires_at IS NULL THEN NULL
      WHEN license_record.expires_at <= current_time THEN license_record.expires_at
      ELSE NULL
    END as expired_at,
    current_time as validation_timestamp;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_user_license_complete(uuid) TO authenticated;
GRANT SELECT ON public.licenses TO authenticated;
GRANT UPDATE ON public.licenses TO authenticated;

-- Check permissions for the licenses table and grant access to the anon and authenticated roles
GRANT SELECT ON public.licenses TO anon;
GRANT ALL PRIVILEGES ON public.licenses TO authenticated;