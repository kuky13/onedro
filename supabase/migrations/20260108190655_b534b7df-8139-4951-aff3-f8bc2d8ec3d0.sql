-- Create catalog table for reusable part qualities
CREATE TABLE IF NOT EXISTS public.part_qualities_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  device_type TEXT,
  device_model TEXT,
  service_type TEXT,
  quality_name TEXT NOT NULL,
  label TEXT,
  base_price INTEGER NOT NULL,
  cash_price INTEGER,
  installment_price INTEGER,
  installment_count INTEGER NOT NULL DEFAULT 0,
  warranty_months INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional FK to user_profiles (adjust if your user table is different)
ALTER TABLE public.part_qualities_catalog
  ADD CONSTRAINT part_qualities_catalog_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES public.user_profiles(id)
  ON DELETE CASCADE;

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_part_qualities_owner_active
  ON public.part_qualities_catalog(owner_id, is_active);

CREATE INDEX IF NOT EXISTS idx_part_qualities_owner_model_service
  ON public.part_qualities_catalog(owner_id, device_model, service_type);

-- RLS
ALTER TABLE public.part_qualities_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: owner can see own rows
CREATE POLICY "part_qualities_select_own"
  ON public.part_qualities_catalog
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: owner can insert
CREATE POLICY "part_qualities_insert_own"
  ON public.part_qualities_catalog
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: owner can update
CREATE POLICY "part_qualities_update_own"
  ON public.part_qualities_catalog
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: owner can delete
CREATE POLICY "part_qualities_delete_own"
  ON public.part_qualities_catalog
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_part_qualities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_part_qualities_updated_at
  BEFORE UPDATE ON public.part_qualities_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_part_qualities_updated_at();