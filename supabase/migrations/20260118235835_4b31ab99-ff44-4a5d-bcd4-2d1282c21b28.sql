ALTER TABLE public.whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS admin_notification_phone text;

-- Refresh PostgREST schema cache (helps eliminate "Could not find the ... column" errors)
NOTIFY pgrst, 'reload schema';