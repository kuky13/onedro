-- Create whatsapp_zapi_logs table to track WhatsApp/Z-API messages and AI parsing
CREATE TABLE IF NOT EXISTS public.whatsapp_zapi_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NULL,
  from_phone text NULL,
  chat_id text NULL,
  is_group boolean NOT NULL DEFAULT false,
  raw_message text NULL,
  ai_json jsonb NULL,
  budget_id uuid NULL,
  status text NOT NULL DEFAULT 'processed',
  error_message text NULL
);

-- Optional foreign key to budgets.id (no cascade to avoid accidental deletions)
ALTER TABLE public.whatsapp_zapi_logs
  ADD CONSTRAINT whatsapp_zapi_logs_budget_id_fkey
  FOREIGN KEY (budget_id)
  REFERENCES public.budgets (id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- Enable RLS and basic policies
ALTER TABLE public.whatsapp_zapi_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert/select logs (supadmin UI is already restricted at app level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_zapi_logs'
      AND policyname = 'Authenticated can read whatsapp_zapi_logs'
  ) THEN
    CREATE POLICY "Authenticated can read whatsapp_zapi_logs"
      ON public.whatsapp_zapi_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'whatsapp_zapi_logs'
      AND policyname = 'Authenticated can insert whatsapp_zapi_logs'
  ) THEN
    CREATE POLICY "Authenticated can insert whatsapp_zapi_logs"
      ON public.whatsapp_zapi_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;