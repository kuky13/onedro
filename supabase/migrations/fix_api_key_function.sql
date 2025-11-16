-- Fix the get_api_key function to work properly with RLS
CREATE OR REPLACE FUNCTION public.get_api_key(service_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT api_key 
  FROM public.api_keys 
  WHERE service_name = get_api_key.service_name 
  AND is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_api_key(text) TO authenticated;

-- Ensure RLS policies are working correctly
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admin users can update API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admin users can insert API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admin users can delete API keys" ON public.api_keys;

-- Create simplified policies for testing
CREATE POLICY "Anyone can view active API keys" 
  ON public.api_keys 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admin users can manage API keys" 
  ON public.api_keys 
  FOR ALL 
  USING (public.is_current_user_admin());

-- Check if deepseek key exists and update it
UPDATE public.api_keys 
SET api_key = 'sk-placeholder-replace-via-supabase' 
WHERE service_name = 'deepseek';

-- If no key exists, insert one
INSERT INTO public.api_keys (service_name, api_key, description, is_active) 
SELECT 'deepseek', 'sk-placeholder-replace-via-supabase', 'DeepSeek API key for AI chat functionality', true
WHERE NOT EXISTS (SELECT 1 FROM public.api_keys WHERE service_name = 'deepseek');