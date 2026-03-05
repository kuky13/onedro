-- Add per-user Evolution API configuration (used by /whats)

CREATE TABLE IF NOT EXISTS public.user_evolution_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_url text NOT NULL,
  api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

ALTER TABLE public.user_evolution_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_evolution_config'
      AND policyname = 'Users can view their own Evolution config'
  ) THEN
    CREATE POLICY "Users can view their own Evolution config"
    ON public.user_evolution_config
    FOR SELECT
    USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_evolution_config'
      AND policyname = 'Users can insert their own Evolution config'
  ) THEN
    CREATE POLICY "Users can insert their own Evolution config"
    ON public.user_evolution_config
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_evolution_config'
      AND policyname = 'Users can update their own Evolution config'
  ) THEN
    CREATE POLICY "Users can update their own Evolution config"
    ON public.user_evolution_config
    FOR UPDATE
    USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_evolution_config'
      AND policyname = 'Users can delete their own Evolution config'
  ) THEN
    CREATE POLICY "Users can delete their own Evolution config"
    ON public.user_evolution_config
    FOR DELETE
    USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_evolution_config'
      AND policyname = 'Service role can access user Evolution config'
  ) THEN
    CREATE POLICY "Service role can access user Evolution config"
    ON public.user_evolution_config
    FOR ALL
    USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_user_evolution_config_updated_at'
  ) THEN
    CREATE TRIGGER set_user_evolution_config_updated_at
    BEFORE UPDATE ON public.user_evolution_config
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_evolution_config_owner_id
  ON public.user_evolution_config(owner_id);
