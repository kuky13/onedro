-- Add connected_phone column to track which phone number is connected to each instance
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS connected_phone TEXT,
  ADD COLUMN IF NOT EXISTS connected_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.whatsapp_instances.connected_phone IS 'Phone number connected to this instance (e.g. 5511999999999)';
COMMENT ON COLUMN public.whatsapp_instances.connected_at IS 'Timestamp when the instance was last connected';
