-- 1. Create Evolution Config Table
CREATE TABLE IF NOT EXISTS public.evolution_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_url TEXT NOT NULL,
    global_api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create WhatsApp Instances Table (Multiple instances support)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    ai_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Clear and insert global config
DELETE FROM public.evolution_config;
INSERT INTO public.evolution_config (api_url, global_api_key)
VALUES ('https://evo2.kuky.shop', 'm9vQk5G7fYw1rKcB3sR8XU0EJ2pLZ6dTnH4aCMeWq0I=');

-- 4. Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;

-- 5. Policies for evolution_config (Service Role access)
DROP POLICY IF EXISTS "Service role can access evolution config" ON public.evolution_config;
CREATE POLICY "Service role can access evolution config"
    ON public.evolution_config FOR ALL
    USING (true);

-- 6. Policies for whatsapp_instances (User specific)
DROP POLICY IF EXISTS "Users can view their own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view their own instances"
    ON public.whatsapp_instances FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can insert their own instances"
    ON public.whatsapp_instances FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete their own instances"
    ON public.whatsapp_instances FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update their own instances"
    ON public.whatsapp_instances FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
