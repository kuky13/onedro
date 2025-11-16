-- Fix the update_updated_at_column function to only handle updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

-- Create a separate function for tables that have updated_by field
CREATE OR REPLACE FUNCTION public.update_updated_at_and_by_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$function$;

-- Update the trigger on system_status table to use the correct function
-- First drop the existing trigger if it exists
DROP TRIGGER IF EXISTS update_system_status_updated_at ON public.system_status;

-- Create the correct trigger for system_status table that has updated_by field
CREATE TRIGGER update_system_status_updated_at
    BEFORE UPDATE ON public.system_status
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_and_by_column();