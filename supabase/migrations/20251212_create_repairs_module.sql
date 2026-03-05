CREATE TABLE IF NOT EXISTS public.repair_technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_technicians_user_id ON public.repair_technicians(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_technicians_active ON public.repair_technicians(is_active);

ALTER TABLE public.repair_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_repair_technicians"
  ON public.repair_technicians FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_repair_technicians"
  ON public.repair_technicians FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_repair_technicians"
  ON public.repair_technicians FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "delete_own_repair_technicians"
  ON public.repair_technicians FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.repair_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_name TEXT NOT NULL,
  service_description TEXT NOT NULL,
  cost_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  charged_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  technician_id UUID NULL REFERENCES public.repair_technicians(id) ON DELETE SET NULL,
  has_commission BOOLEAN NOT NULL DEFAULT FALSE,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_repair_services_user_id ON public.repair_services(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_services_created_at ON public.repair_services(created_at);
CREATE INDEX IF NOT EXISTS idx_repair_services_technician_id ON public.repair_services(technician_id);

ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_repair_services"
  ON public.repair_services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_repair_services"
  ON public.repair_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_repair_services"
  ON public.repair_services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "delete_own_repair_services"
  ON public.repair_services FOR DELETE
  USING (auth.uid() = user_id);

