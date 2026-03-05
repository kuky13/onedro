-- Add Evolution API instance name to WhatsApp settings (global)
ALTER TABLE public.whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS evolution_instance_name text;

-- Reload PostgREST schema/config so new column is immediately available via REST
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';