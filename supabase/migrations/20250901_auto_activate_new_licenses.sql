-- Migration: Auto-activate new licenses
-- Description: Configure the system so that when an admin creates a new license,
--              the is_active field is automatically set to TRUE
-- Date: 2025-09-01

-- 1. Change default value of is_active column to TRUE
ALTER TABLE public.licenses 
ALTER COLUMN is_active SET DEFAULT true;

-- Update the column comment to reflect the new behavior
COMMENT ON COLUMN public.licenses.is_active IS 'Indica se a licença está ativa. Padrão: TRUE (ativa automaticamente)';

-- 2. Create function to auto-activate licenses and set activated_at
CREATE OR REPLACE FUNCTION public.auto_activate_new_license()
RETURNS TRIGGER AS $$
BEGIN
  -- If is_active is being set to TRUE and activated_at is NULL, set activated_at
  IF NEW.is_active = TRUE AND (OLD.activated_at IS NULL OR NEW.activated_at IS NULL) THEN
    NEW.activated_at = NOW();
  END IF;
  
  -- If this is a new license (INSERT), ensure it's active by default
  IF TG_OP = 'INSERT' THEN
    -- Set is_active to TRUE if not explicitly set to FALSE
    IF NEW.is_active IS NULL THEN
      NEW.is_active = TRUE;
    END IF;
    
    -- Set activated_at if the license is being created as active
    IF NEW.is_active = TRUE AND NEW.activated_at IS NULL THEN
      NEW.activated_at = NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-activate new licenses
DROP TRIGGER IF EXISTS auto_activate_license_trigger ON public.licenses;

CREATE TRIGGER auto_activate_license_trigger
  BEFORE INSERT OR UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_activate_new_license();

-- 4. Create admin function to create active licenses
CREATE OR REPLACE FUNCTION public.admin_create_active_license(
  p_code TEXT,
  p_user_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_license_id UUID;
BEGIN
  -- Check if user is admin (reuse existing admin check)
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Validate license code format (basic validation)
  IF p_code IS NULL OR LENGTH(TRIM(p_code)) < 3 THEN
    RAISE EXCEPTION 'License code must be at least 3 characters long.';
  END IF;
  
  -- Check if license code already exists
  IF EXISTS (SELECT 1 FROM public.licenses WHERE code = UPPER(TRIM(p_code))) THEN
    RAISE EXCEPTION 'License code already exists: %', UPPER(TRIM(p_code));
  END IF;
  
  -- Insert new license (will be automatically activated by trigger)
  INSERT INTO public.licenses (
    code,
    user_id,
    expires_at,
    is_active,
    activated_at,
    created_at,
    last_validation
  ) VALUES (
    UPPER(TRIM(p_code)),
    p_user_id,
    p_expires_at,
    TRUE, -- Explicitly set to TRUE
    NOW(), -- Set activation time
    NOW(),
    NOW()
  ) RETURNING id INTO new_license_id;
  
  RETURN new_license_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.admin_create_active_license(TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_activate_new_license() TO authenticated;

-- 6. Add helpful comment to the function
COMMENT ON FUNCTION public.admin_create_active_license(TEXT, UUID, TIMESTAMPTZ) IS 
'Admin function to create new licenses that are automatically activated. Requires admin privileges.';

COMMENT ON FUNCTION public.auto_activate_new_license() IS 
'Trigger function that automatically activates new licenses and sets activated_at timestamp.';

-- 7. Create view for easy license management
CREATE OR REPLACE VIEW public.admin_license_overview AS
SELECT 
  l.id,
  l.code,
  l.user_id,
  COALESCE(up.name, 'Não atribuída') as user_name,
  l.is_active,
  l.expires_at,
  l.activated_at,
  l.created_at,
  l.last_validation,
  CASE 
    WHEN l.expires_at IS NULL THEN 'Permanente'
    WHEN l.expires_at > NOW() THEN 'Válida'
    ELSE 'Expirada'
  END as status_expiracao,
  CASE 
    WHEN l.is_active AND (l.expires_at IS NULL OR l.expires_at > NOW()) THEN 'Ativa'
    WHEN l.is_active AND l.expires_at <= NOW() THEN 'Ativa (Expirada)'
    ELSE 'Inativa'
  END as status_geral
FROM public.licenses l
LEFT JOIN public.user_profiles up ON l.user_id = up.id
ORDER BY l.created_at DESC;

-- Grant view access to authenticated users
GRANT SELECT ON public.admin_license_overview TO authenticated;

-- Note: RLS policies cannot be applied to views directly.
-- Access control is handled by the underlying table policies.

-- 8. Update existing inactive licenses created today to be active (optional)
-- Uncomment the following lines if you want to activate licenses created today
/*
UPDATE public.licenses 
SET 
  is_active = TRUE,
  activated_at = COALESCE(activated_at, NOW())
WHERE 
  is_active = FALSE 
  AND DATE(created_at) = CURRENT_DATE
  AND activated_at IS NULL;
*/

-- 9. Add helpful documentation
COMMENT ON TABLE public.licenses IS 
'Licenses table - New licenses are automatically activated (is_active = TRUE) when created by admins';

COMMENT ON TRIGGER auto_activate_license_trigger ON public.licenses IS 
'Automatically activates new licenses and sets activated_at timestamp';

COMMENT ON VIEW public.admin_license_overview IS 
'Admin view showing comprehensive license information with calculated status fields';