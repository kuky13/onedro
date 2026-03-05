-- Salva o vale do técnico (e o valor líquido calculado) por usuário e mês
CREATE TABLE IF NOT EXISTS public.repair_technician_vales_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reference_month DATE NOT NULL,
  vale_amount NUMERIC NOT NULL DEFAULT 0,
  commissions_gross NUMERIC NOT NULL DEFAULT 0,
  commissions_net NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference_month)
);

ALTER TABLE public.repair_technician_vales_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own technician vales"
ON public.repair_technician_vales_monthly
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own technician vales"
ON public.repair_technician_vales_monthly
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own technician vales"
ON public.repair_technician_vales_monthly
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own technician vales"
ON public.repair_technician_vales_monthly
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger padrão para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS set_repair_technician_vales_monthly_updated_at ON public.repair_technician_vales_monthly;
CREATE TRIGGER set_repair_technician_vales_monthly_updated_at
BEFORE UPDATE ON public.repair_technician_vales_monthly
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_repair_technician_vales_monthly_user_month
ON public.repair_technician_vales_monthly (user_id, reference_month);