-- Drop trigger if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_part_qualities_updated_at'
  ) THEN
    DROP TRIGGER trg_part_qualities_updated_at ON public.part_qualities_catalog;
  END IF;
END $$;

-- Drop the part_qualities_catalog table (removes associated policies and indexes)
DROP TABLE IF EXISTS public.part_qualities_catalog CASCADE;