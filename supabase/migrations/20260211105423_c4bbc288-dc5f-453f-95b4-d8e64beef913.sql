
-- Add reopen_count to track how many times a warranty has been reopened
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS reopen_count integer NOT NULL DEFAULT 0;
