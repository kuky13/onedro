-- Create table to store per-user layout preferences for repairs dashboard summary cards
CREATE TABLE IF NOT EXISTS public.repair_dashboard_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  show_monthly_revenue boolean NOT NULL DEFAULT true,
  show_parts_costs boolean NOT NULL DEFAULT true,
  show_assistant_net_profit boolean NOT NULL DEFAULT true,
  show_technician_profit boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_dashboard_layout_user_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.repair_dashboard_layout ENABLE ROW LEVEL SECURITY;

-- Policies: each user manages only their own layout
CREATE POLICY "Users can view their own repair dashboard layout" 
ON public.repair_dashboard_layout
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repair dashboard layout" 
ON public.repair_dashboard_layout
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repair dashboard layout" 
ON public.repair_dashboard_layout
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER repair_dashboard_layout_set_updated_at
BEFORE UPDATE ON public.repair_dashboard_layout
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();