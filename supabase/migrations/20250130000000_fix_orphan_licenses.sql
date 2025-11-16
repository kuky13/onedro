-- Fix orphan licenses with null user_id
-- These licenses cause inconsistencies in the validation system

-- First, deactivate all licenses with null user_id
UPDATE licenses 
SET 
  is_active = false,
  last_validation = NOW()
WHERE 
  user_id IS NULL;

-- Delete orphan licenses completely to clean up the database
DELETE FROM licenses 
WHERE user_id IS NULL;

-- Now add a constraint to prevent future orphan licenses
ALTER TABLE licenses 
ADD CONSTRAINT licenses_user_id_not_null 
CHECK (user_id IS NOT NULL);

-- Log the cleanup action
INSERT INTO license_validation_audit (
  user_id,
  license_id,
  validation_result,
  created_at
)
SELECT 
  NULL,
  id,
  jsonb_build_object(
    'action', 'orphan_cleanup',
    'reason', 'Deactivated orphan license with null user_id',
    'previous_state', 'active',
    'new_state', 'inactive'
  ),
  NOW()
FROM licenses 
WHERE user_id IS NULL;

-- Create a function to prevent orphan licenses in the future
CREATE OR REPLACE FUNCTION prevent_orphan_licenses()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent inserting or updating licenses with null user_id
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create or update license with null user_id';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent orphan licenses
DROP TRIGGER IF EXISTS prevent_orphan_licenses_trigger ON licenses;
CREATE TRIGGER prevent_orphan_licenses_trigger
  BEFORE INSERT OR UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphan_licenses();