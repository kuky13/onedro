-- Add filters for allowed numbers and groups to WhatsApp Z-API settings
ALTER TABLE public.whatsapp_zapi_settings
  ADD COLUMN IF NOT EXISTS allowed_numbers text,
  ADD COLUMN IF NOT EXISTS allowed_groups text;