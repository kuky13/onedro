-- Add default budget validity days to site_settings
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS default_budget_validity_days integer NOT NULL DEFAULT 15;

-- Ensure existing rows have a concrete value
UPDATE public.site_settings
SET default_budget_validity_days = COALESCE(default_budget_validity_days, 15);