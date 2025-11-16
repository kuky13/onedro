-- Add notes column to licenses table if it doesn't exist
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS notes TEXT;