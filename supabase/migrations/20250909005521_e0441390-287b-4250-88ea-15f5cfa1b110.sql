-- Fix user_profiles RLS recursion causing 500 errors during login
-- 1) Drop existing policies that may reference admin functions and cause recursion
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.policyname);
  END LOOP;
END $$;

-- 2) Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3) Minimal safe policies (no admin function usage) to avoid recursion
-- Allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

-- Allow users to insert their own profile (if created via app)
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4) Optional: allow delete own profile if your app supports it (commented by default)
-- CREATE POLICY "Users can delete own profile"
-- ON public.user_profiles
-- FOR DELETE
-- USING (auth.uid() = id);

-- 5) Provide a SECURITY DEFINER helper to fetch current user's profile without client-side filters (optional RPC)
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS public.user_profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.*
  FROM public.user_profiles up
  WHERE up.id = auth.uid();
$$;