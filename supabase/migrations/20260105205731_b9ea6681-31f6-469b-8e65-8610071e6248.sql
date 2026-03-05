-- Add optional identification fields to repair_services
ALTER TABLE public.repair_services
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS service_order_number text;