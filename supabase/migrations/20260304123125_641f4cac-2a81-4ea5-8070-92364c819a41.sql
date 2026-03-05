-- Harden API key storage by enforcing admin-only RLS access
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

-- Remove permissive or legacy policies if they exist
DROP POLICY IF EXISTS "Anyone can view active API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admin users can manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Only admins manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can view API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can insert API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can update API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can delete API keys" ON public.api_keys;

-- Recreate least-privilege admin-only policies
CREATE POLICY "Admins can view API keys"
ON public.api_keys
FOR SELECT
TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Admins can insert API keys"
ON public.api_keys
FOR INSERT
TO authenticated
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can update API keys"
ON public.api_keys
FOR UPDATE
TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admins can delete API keys"
ON public.api_keys
FOR DELETE
TO authenticated
USING (public.is_current_user_admin());