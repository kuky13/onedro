-- Fix the assign_sequential_number trigger function
CREATE OR REPLACE FUNCTION public.assign_sequential_number()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Atribuir número sequencial apenas para novos registros
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_sequential_number();
  END IF;
  
  RETURN NEW;
END;
$function$;