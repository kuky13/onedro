-- Soft delete support for repair_services
ALTER TABLE public.repair_services
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Optional index to speed up trash queries
CREATE INDEX IF NOT EXISTS idx_repair_services_deleted_at
  ON public.repair_services (deleted_at);
