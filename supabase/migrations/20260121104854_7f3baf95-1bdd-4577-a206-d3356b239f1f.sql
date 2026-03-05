-- WAHA support on WhatsApp settings
ALTER TABLE public.whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'waha';

ALTER TABLE public.whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS waha_session text;

-- Helpful index for filtering active config by provider (optional but cheap)
CREATE INDEX IF NOT EXISTS idx_whatsapp_zapi_settings_active_provider
ON public.whatsapp_zapi_settings (is_active, provider);

-- Reload PostgREST schema/config so new columns are immediately available
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
