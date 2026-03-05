-- =====================================================
-- Sistema de Testes Interativos via QR Code
-- Tabela dedicada para sessões de teste de dispositivos
-- =====================================================

-- Criar tabela dedicada para sessões de teste
CREATE TABLE public.device_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  
  -- Informações do dispositivo testado
  device_info JSONB DEFAULT '{}',
  
  -- Resultados dos testes individuais
  test_results JSONB DEFAULT '{}',
  
  -- Score geral (0-100)
  overall_score DECIMAL(5,2),
  
  -- Status da sessão
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Validação de status
  CONSTRAINT valid_test_session_status CHECK (status IN ('pending', 'in_progress', 'completed', 'expired'))
);

-- Comentários para documentação
COMMENT ON TABLE public.device_test_sessions IS 'Sessões de teste de hardware de dispositivos via QR Code';
COMMENT ON COLUMN public.device_test_sessions.share_token IS 'Token único para acesso público ao teste';
COMMENT ON COLUMN public.device_test_sessions.device_info IS 'Informações do dispositivo: user_agent, screen_resolution, platform, etc.';
COMMENT ON COLUMN public.device_test_sessions.test_results IS 'Resultados de cada teste: display_touch, camera_front, audio_speaker, etc.';
COMMENT ON COLUMN public.device_test_sessions.overall_score IS 'Pontuação geral de 0 a 100';

-- Índices para performance
CREATE INDEX idx_device_test_sessions_token ON public.device_test_sessions(share_token);
CREATE INDEX idx_device_test_sessions_order ON public.device_test_sessions(service_order_id);
CREATE INDEX idx_device_test_sessions_status ON public.device_test_sessions(status) WHERE status NOT IN ('expired', 'completed');
CREATE INDEX idx_device_test_sessions_expires ON public.device_test_sessions(expires_at) WHERE status = 'pending';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_device_test_sessions_updated_at
  BEFORE UPDATE ON public.device_test_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE public.device_test_sessions ENABLE ROW LEVEL SECURITY;

-- Função helper para validar token (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_valid_test_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.device_test_sessions
    WHERE share_token = p_token
      AND expires_at > NOW()
      AND status NOT IN ('completed', 'expired')
  );
$$;

-- Política: Leitura pública via token válido
CREATE POLICY "Public read via valid token" ON public.device_test_sessions
  FOR SELECT
  USING (
    share_token IS NOT NULL 
    AND expires_at > NOW()
  );

-- Política: Atualização pública via token (apenas test_results, device_info, status, started_at, completed_at)
CREATE POLICY "Public update test results via token" ON public.device_test_sessions
  FOR UPDATE
  USING (
    share_token IS NOT NULL 
    AND expires_at > NOW() 
    AND status NOT IN ('completed', 'expired')
  )
  WITH CHECK (
    share_token IS NOT NULL
  );

-- Política: Owners podem gerenciar completamente
CREATE POLICY "Owners full access" ON public.device_test_sessions
  FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_orders so 
      WHERE so.id = service_order_id 
        AND so.owner_id = auth.uid()
    )
  );

-- Política: Admins podem ver tudo
CREATE POLICY "Admins can view all test sessions" ON public.device_test_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );

-- =====================================================
-- Função para gerar token seguro
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_test_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Gerar token alfanumérico de 32 caracteres
  v_token := encode(gen_random_bytes(24), 'base64');
  -- Remover caracteres especiais do base64
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  -- Garantir que tem 32 caracteres
  v_token := substr(v_token, 1, 32);
  RETURN v_token;
END;
$$;

-- =====================================================
-- Função para criar sessão de teste
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_test_session(
  p_service_order_id UUID,
  p_expires_hours INT DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_token TEXT;
BEGIN
  -- Gerar token único
  v_token := public.generate_test_token();
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.device_test_sessions WHERE share_token = v_token) LOOP
    v_token := public.generate_test_token();
  END LOOP;
  
  -- Criar sessão
  INSERT INTO public.device_test_sessions (
    service_order_id,
    share_token,
    expires_at,
    created_by
  ) VALUES (
    p_service_order_id,
    v_token,
    NOW() + (p_expires_hours || ' hours')::INTERVAL,
    auth.uid()
  )
  RETURNING id INTO v_session_id;
  
  RETURN v_session_id;
END;
$$;