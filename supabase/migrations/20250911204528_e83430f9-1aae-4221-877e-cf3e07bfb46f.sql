-- Add missing issue column to budgets table
ALTER TABLE public.budgets 
ADD COLUMN issue TEXT;