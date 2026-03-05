-- Tabela para layout das informações de linha na dashboard de reparos
CREATE TABLE IF NOT EXISTS public.repair_dashboard_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  show_charged_amount boolean NOT NULL DEFAULT true,
  show_cost_amount boolean NOT NULL DEFAULT true,
  show_technician_profit boolean NOT NULL DEFAULT true,
  show_assistant_profit boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_dashboard_columns_user_unique UNIQUE (user_id)
);

-- RLS
ALTER TABLE public.repair_dashboard_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own repair dashboard columns"
ON public.repair_dashboard_columns
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repair dashboard columns"
ON public.repair_dashboard_columns
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repair dashboard columns"
ON public.repair_dashboard_columns
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para updated_at (reutiliza função padrão se já existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_repair_dashboard_columns_updated_at ON public.repair_dashboard_columns;

CREATE TRIGGER trigger_repair_dashboard_columns_updated_at
BEFORE UPDATE ON public.repair_dashboard_columns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();