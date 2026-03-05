-- Add configurable duration (days) to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS days integer NOT NULL DEFAULT 30;

-- Initialize existing plans based on plan_type
UPDATE public.subscription_plans
SET days = CASE
  WHEN plan_type = 'yearly' THEN 365
  WHEN plan_type = 'monthly' THEN 30
  ELSE 30
END;