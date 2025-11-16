-- Add new fields to budgets table for enhanced worm budget form
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS payment_condition TEXT DEFAULT 'Cartão de Crédito',
ADD COLUMN IF NOT EXISTS custom_services TEXT;