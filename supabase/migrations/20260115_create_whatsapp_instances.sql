-- Create whatsapp_instances table
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    instance_id TEXT NOT NULL, -- Internal ID in Evolution
    status TEXT DEFAULT 'disconnected', -- disconnected, connecting, connected
    ai_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Policies for whatsapp_instances
CREATE POLICY "Users can view their own instance"
    ON public.whatsapp_instances
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own instance"
    ON public.whatsapp_instances
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instance"
    ON public.whatsapp_instances
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instance"
    ON public.whatsapp_instances
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create evolution_config table (Admin only)
CREATE TABLE IF NOT EXISTS public.evolution_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_url TEXT NOT NULL,
    global_api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for config
ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;

-- Only admins/service role can access config (adjust based on your admin logic, usually service_role is enough for backend functions)
-- For now, we allow read for authenticated users if needed by proxy, but usually proxy uses service key.
-- Let's restrict to service role or specific admin checks.
CREATE POLICY "Service role can access evolution config"
    ON public.evolution_config
    FOR ALL
    USING (auth.role() = 'service_role');

-- Add index
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON public.whatsapp_instances(user_id);
