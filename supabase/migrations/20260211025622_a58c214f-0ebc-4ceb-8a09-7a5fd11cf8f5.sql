-- Add optional repair_service_id to warranties
ALTER TABLE public.warranties 
ADD COLUMN IF NOT EXISTS repair_service_id UUID REFERENCES public.repair_services(id);

-- Add repair metadata columns for quick display
ALTER TABLE public.warranties 
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS service_description TEXT,
ADD COLUMN IF NOT EXISTS imei_serial TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS client_phone TEXT,
ADD COLUMN IF NOT EXISTS technician_name TEXT,
ADD COLUMN IF NOT EXISTS charged_amount NUMERIC,
ADD COLUMN IF NOT EXISTS cost_amount NUMERIC;

-- Make service_order_id nullable (was NOT NULL, now optional)
ALTER TABLE public.warranties ALTER COLUMN service_order_id DROP NOT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_warranties_repair_service_id ON public.warranties(repair_service_id);
