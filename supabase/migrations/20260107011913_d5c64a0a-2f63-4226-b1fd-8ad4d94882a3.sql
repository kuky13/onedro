-- Make admin_delete_license hard-delete licenses instead of marking as deleted
CREATE OR REPLACE FUNCTION public.admin_delete_license(
  p_license_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Optional: keep an audit trail if a table exists, otherwise just delete
  IF to_regclass('public.license_deletion_audit') IS NOT NULL THEN
    INSERT INTO public.license_deletion_audit (license_id, reason, deleted_at)
    VALUES (p_license_id, p_reason, now());
  END IF;

  DELETE FROM public.licenses
  WHERE id = p_license_id;

  GET DIAGNOSTICS v_exists = ROW_COUNT;

  RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_license(uuid, text)
IS 'Super admin: apaga definitivamente uma licença da tabela licenses (hard delete).';