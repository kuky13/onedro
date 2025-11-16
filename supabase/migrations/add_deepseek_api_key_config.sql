-- Create table for API key storage (admin only)
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- API configuration
  service_name text NOT NULL UNIQUE,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  
  -- Optional metadata
  description text,
  expires_at timestamp with time zone,
  
  -- Who created/updated
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Add RLS policies for admin access only
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin users can view API keys" 
  ON public.api_keys 
  FOR SELECT 
  USING (public.is_current_user_admin());

CREATE POLICY "Admin users can update API keys" 
  ON public.api_keys 
  FOR UPDATE 
  USING (public.is_current_user_admin());

CREATE POLICY "Admin users can insert API keys" 
  ON public.api_keys 
  FOR INSERT 
  WITH CHECK (public.is_current_user_admin());

CREATE POLICY "Admin users can delete API keys" 
  ON public.api_keys 
  FOR DELETE 
  USING (public.is_current_user_admin());

-- Add trigger to update updated_at column
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert DeepSeek API key (to be updated by admin via Supabase)
INSERT INTO public.api_keys (service_name, api_key, description, is_active) VALUES 
('deepseek', 'sk-placeholder-replace-via-supabase', 'DeepSeek API key for AI chat functionality', true);

-- Create function to get active API key for a service
CREATE OR REPLACE FUNCTION public.get_api_key(service_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT api_key 
    FROM public.api_keys 
    WHERE service_name = get_api_key.service_name 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_api_key(text) TO authenticated;