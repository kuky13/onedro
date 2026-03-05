ALTER TABLE public.repair_services 
ADD COLUMN IF NOT EXISTS closing_id UUID REFERENCES public.repair_monthly_closings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_repair_services_closing_id ON public.repair_services(closing_id);
