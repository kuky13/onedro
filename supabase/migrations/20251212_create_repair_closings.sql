CREATE TABLE IF NOT EXISTS public.repair_monthly_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reference_month DATE NOT NULL, -- Primeiro dia do mês de referência (ex: 2026-01-01)
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_net_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_commissions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_services INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'closed', -- 'closed' | 'archived'
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_repair_monthly_closings_user_id ON public.repair_monthly_closings(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_monthly_closings_ref_month ON public.repair_monthly_closings(reference_month);

ALTER TABLE public.repair_monthly_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_monthly_closings"
  ON public.repair_monthly_closings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_monthly_closings"
  ON public.repair_monthly_closings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_monthly_closings"
  ON public.repair_monthly_closings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "delete_own_monthly_closings"
  ON public.repair_monthly_closings FOR DELETE
  USING (auth.uid() = user_id);
