-- Add optional device-related fields to repair_services for Gestão de Reparos
ALTER TABLE public.repair_services
  ADD COLUMN IF NOT EXISTS imei_serial text NULL,
  ADD COLUMN IF NOT EXISTS device_password_type text NULL,
  ADD COLUMN IF NOT EXISTS device_password_value text NULL,
  ADD COLUMN IF NOT EXISTS device_password_metadata jsonb NULL,
  ADD COLUMN IF NOT EXISTS device_checklist jsonb NULL;