-- =====================================================
-- MELHORIAS NA ESTRUTURA DO BANCO DE DADOS
-- =====================================================
-- Adiciona tabelas de log, novas colunas e índices de performance

-- Criar tabela de logs do sistema (se não existir)
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT NOW(),
  user_id uuid REFERENCES auth.users(id),
  ip_address inet,
  user_agent text
);

-- Adicionar novas colunas à tabela license_history (se não existirem)
DO $$ 
BEGIN
  -- Adicionar details se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'license_history' AND column_name = 'details') THEN
    ALTER TABLE public.license_history ADD COLUMN details jsonb;
  END IF;

  -- Renomear admin_id para admin_user_id se necessário
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'license_history' AND column_name = 'admin_id') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'license_history' AND column_name = 'admin_user_id') THEN
    ALTER TABLE public.license_history RENAME COLUMN admin_id TO admin_user_id;
  END IF;
END $$;

-- Adicionar novas colunas à tabela licenses (se não existirem)
DO $$ 
BEGIN
  -- Adicionar created_by_admin_id se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'licenses' AND column_name = 'created_by_admin_id') THEN
    ALTER TABLE public.licenses ADD COLUMN created_by_admin_id uuid REFERENCES auth.users(id);
  END IF;

  -- Adicionar updated_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'licenses' AND column_name = 'updated_at') THEN
    ALTER TABLE public.licenses ADD COLUMN updated_at timestamptz DEFAULT NOW();
  END IF;

  -- Adicionar license_type se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'licenses' AND column_name = 'license_type') THEN
    ALTER TABLE public.licenses ADD COLUMN license_type text DEFAULT 'standard' 
      CHECK (license_type IN ('trial', 'standard', 'premium', 'enterprise'));
  END IF;

  -- Adicionar metadata se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'licenses' AND column_name = 'metadata') THEN
    ALTER TABLE public.licenses ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at na tabela licenses
DROP TRIGGER IF EXISTS update_licenses_updated_at ON public.licenses;
CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_licenses_user_id_active ON public.licenses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_licenses_code_hash ON public.licenses USING hash(code);
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at ON public.licenses(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_licenses_created_at ON public.licenses(created_at);
CREATE INDEX IF NOT EXISTS idx_licenses_license_type ON public.licenses(license_type);
CREATE INDEX IF NOT EXISTS idx_licenses_metadata_gin ON public.licenses USING gin(metadata);

-- Índices para system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_log_level ON public.system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_details_gin ON public.system_logs USING gin(details);

-- Índices para license_history
CREATE INDEX IF NOT EXISTS idx_license_history_license_id ON public.license_history(license_id);
CREATE INDEX IF NOT EXISTS idx_license_history_action_type ON public.license_history(action_type);
CREATE INDEX IF NOT EXISTS idx_license_history_created_at ON public.license_history(created_at);
CREATE INDEX IF NOT EXISTS idx_license_history_admin_user_id ON public.license_history(admin_user_id);

-- Remover função existente se houver conflito de tipo de retorno
DROP FUNCTION IF EXISTS public.cleanup_old_logs();

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Manter apenas logs dos últimos 90 dias
  DELETE FROM public.system_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Manter histórico de licenças dos últimos 365 dias
  DELETE FROM public.license_history 
  WHERE created_at < NOW() - INTERVAL '365 days';
END;
$$;

-- Função para obter estatísticas do banco de dados
CREATE OR REPLACE FUNCTION public.admin_get_database_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar estatísticas do banco';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_licenses', (SELECT COUNT(*) FROM public.licenses),
    'active_licenses', (SELECT COUNT(*) FROM public.licenses WHERE is_active = true),
    'expired_licenses', (SELECT COUNT(*) FROM public.licenses WHERE expires_at < NOW()),
    'trial_licenses', (SELECT COUNT(*) FROM public.licenses WHERE license_type = 'trial'),
    'users_with_licenses', (SELECT COUNT(DISTINCT user_id) FROM public.licenses WHERE is_active = true),
    'system_logs_count', (SELECT COUNT(*) FROM public.system_logs),
    'license_history_count', (SELECT COUNT(*) FROM public.license_history),
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'last_updated', NOW()
  ) INTO stats;

  RETURN stats;
END;
$$;

-- Função para otimização do banco de dados
CREATE OR REPLACE FUNCTION public.admin_optimize_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  optimization_result jsonb;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem otimizar o banco';
  END IF;

  -- Executar limpeza de logs antigos
  PERFORM public.cleanup_old_logs();
  
  -- Atualizar estatísticas das tabelas
  ANALYZE public.licenses;
  ANALYZE public.system_logs;
  ANALYZE public.license_history;

  optimization_result := jsonb_build_object(
    'optimization_date', NOW(),
    'actions_performed', jsonb_build_array(
      'cleanup_old_logs',
      'analyze_tables',
      'update_statistics'
    ),
    'status', 'completed'
  );

  -- Log da otimização
  INSERT INTO public.system_logs (
    log_level,
    message,
    details,
    user_id,
    created_at
  ) VALUES (
    'info',
    'Otimização do banco de dados executada',
    optimization_result,
    auth.uid(),
    NOW()
  );

  RETURN optimization_result;
END;
$$;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_logs (verificar se já existem antes de criar)
DO $$ 
BEGIN
  -- Política para admins lerem logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'Admins can read system logs') THEN
    CREATE POLICY "Admins can read system logs" ON public.system_logs
      FOR SELECT USING (public.is_current_user_admin());
  END IF;

  -- Política para inserir logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'System can insert logs') THEN
    CREATE POLICY "System can insert logs" ON public.system_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Conceder permissões necessárias
GRANT SELECT ON public.system_logs TO anon, authenticated;
GRANT INSERT ON public.system_logs TO anon, authenticated;

-- Comentários
COMMENT ON TABLE public.system_logs IS 'Logs do sistema para auditoria e debugging';
COMMENT ON FUNCTION public.cleanup_old_logs() IS 'Remove logs antigos para manter performance';
COMMENT ON FUNCTION public.admin_get_database_stats() IS 'Retorna estatísticas gerais do banco de dados';
COMMENT ON FUNCTION public.admin_optimize_database() IS 'Executa otimizações no banco de dados';