-- Add missing column 'installment_count' to 'budget_parts' table
-- Ensures compatibility with app fields for services/parts

BEGIN;

ALTER TABLE public.budget_parts
  ADD COLUMN IF NOT EXISTS installment_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.budget_parts.installment_count IS 'Number of installments used to calculate installment_price.';

COMMIT;