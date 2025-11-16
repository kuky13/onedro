-- Add updated_by column to budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Create trigger function to automatically set updated_by
CREATE OR REPLACE FUNCTION public.update_budgets_updated_at_and_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger and create new one
DROP TRIGGER IF EXISTS update_budgets_updated_at ON public.budgets;
CREATE TRIGGER update_budgets_updated_at_and_updated_by
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_budgets_updated_at_and_updated_by();

-- Grant permissions to anon and authenticated roles
GRANT SELECT, UPDATE ON public.budgets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;

-- Update existing records to set updated_by to owner_id where it's null
UPDATE public.budgets SET updated_by = owner_id WHERE updated_by IS NULL;