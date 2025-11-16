-- Add updated_at column to licenses table
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add trigger to automatically update updated_at column
CREATE OR REPLACE TRIGGER licenses_updated_at_trigger
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();