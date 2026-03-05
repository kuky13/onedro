-- Migration for Kowalski AI settings and logs
CREATE TABLE IF NOT EXISTS public.kowalski_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  instance_name text NOT NULL,
  allowed_groups text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kowalski_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  from_phone text,
  chat_id text,
  is_group boolean DEFAULT false,
  raw_message text,
  ai_response text,
  status text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.kowalski_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kowalski_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para kowalski_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_settings' AND policyname = 'kowalski_settings_select') THEN
    CREATE POLICY "kowalski_settings_select" ON public.kowalski_settings FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_settings' AND policyname = 'kowalski_settings_insert') THEN
    CREATE POLICY "kowalski_settings_insert" ON public.kowalski_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_settings' AND policyname = 'kowalski_settings_update') THEN
    CREATE POLICY "kowalski_settings_update" ON public.kowalski_settings FOR UPDATE USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Políticas para kowalski_logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_logs' AND policyname = 'kowalski_logs_select') THEN
    CREATE POLICY "kowalski_logs_select" ON public.kowalski_logs FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_logs' AND policyname = 'kowalski_logs_insert') THEN
    CREATE POLICY "kowalski_logs_insert" ON public.kowalski_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kowalski_logs' AND policyname = 'kowalski_logs_delete') THEN
    CREATE POLICY "kowalski_logs_delete" ON public.kowalski_logs FOR DELETE USING (auth.role() = 'authenticated');
  END IF;
END $$;
