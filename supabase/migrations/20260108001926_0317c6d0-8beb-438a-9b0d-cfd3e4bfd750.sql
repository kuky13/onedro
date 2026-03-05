-- Tabela para configurar qual usuário será o dono dos orçamentos criados via WhatsApp (Z-API)
CREATE TABLE IF NOT EXISTS public.whatsapp_zapi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.whatsapp_zapi_settings ENABLE ROW LEVEL SECURITY;

-- Políticas simples: qualquer usuário autenticado pode gerenciar (acesso real é filtrado pelo guard de Super Admin no frontend)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_zapi_settings' AND policyname = 'whatsapp_zapi_settings_select'
  ) THEN
    CREATE POLICY "whatsapp_zapi_settings_select"
      ON public.whatsapp_zapi_settings
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_zapi_settings' AND policyname = 'whatsapp_zapi_settings_insert'
  ) THEN
    CREATE POLICY "whatsapp_zapi_settings_insert"
      ON public.whatsapp_zapi_settings
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_zapi_settings' AND policyname = 'whatsapp_zapi_settings_update'
  ) THEN
    CREATE POLICY "whatsapp_zapi_settings_update"
      ON public.whatsapp_zapi_settings
      FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'whatsapp_zapi_settings' AND policyname = 'whatsapp_zapi_settings_delete'
  ) THEN
    CREATE POLICY "whatsapp_zapi_settings_delete"
      ON public.whatsapp_zapi_settings
      FOR DELETE
      USING (auth.role() = 'authenticated');
  END IF;
END $$;