-- Habilitar REPLICA IDENTITY FULL para atualizações em tempo real
ALTER TABLE public.device_test_sessions REPLICA IDENTITY FULL;

-- Também garantir que a tabela está na publicação do Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'device_test_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.device_test_sessions;
  END IF;
END $$;