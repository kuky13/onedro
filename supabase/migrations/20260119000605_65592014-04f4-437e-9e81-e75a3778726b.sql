ALTER TABLE public.whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS buyer_notification_template text;

NOTIFY pgrst, 'reload schema';