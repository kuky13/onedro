-- Ensure admin helper function exists in schema and is safe to call from policies/functions
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = current_user_id;

  RETURN COALESCE(user_role = 'admin', FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Remove overly-broad store_assets write policies
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Restrict uploads/updates/deletes to each authenticated user's own folder
CREATE POLICY "Users upload own store assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own store assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'store_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own store assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store_assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Remove duplicate and overly-broad service order policies
DROP POLICY IF EXISTS "Authenticated users can create service orders" ON public.service_orders;

DROP POLICY IF EXISTS "service_orders_select_policy" ON public.service_orders;
CREATE POLICY "service_orders_select_policy"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR public.is_current_user_admin()
);

-- Ensure the admin reporting views respect the querying user's RLS context
ALTER VIEW public.admin_license_overview SET (security_invoker = true);
ALTER VIEW public.admin_license_expiration_monitor SET (security_invoker = true);