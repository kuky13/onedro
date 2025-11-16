-- =====================================================
-- Sistema de Licenças de 13 Dígitos - Implementação Completa
-- =====================================================

-- Verificar se a extensão pgcrypto está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- 1. FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

-- =====================================================
-- 2. NOVA FUNÇÃO DE GERAÇÃO DE CÓDIGOS COM DIAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_license_code_with_days(p_days INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_encoded TEXT;
  random_part TEXT;
  full_code TEXT;
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  -- Validar entrada
  IF p_days <= 0 OR p_days > 999999 THEN
    RAISE EXCEPTION 'Dias deve estar entre 1 e 999999';
  END IF;
  
  -- Codificar dias em 6 dígitos
  days_encoded := LPAD(p_days::TEXT, 6, '0');
  
  -- Gerar 7 caracteres aleatórios
  random_part := '';
  FOR i IN 1..7 LOOP
    random_part := random_part || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  
  -- Formar código completo
  full_code := days_encoded || random_part;
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.licenses WHERE code = full_code) LOOP
    random_part := '';
    FOR i IN 1..7 LOOP
      random_part := random_part || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    full_code := days_encoded || random_part;
  END LOOP;
  
  RETURN full_code;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO DE DECODIFICAÇÃO DE DIAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.decode_license_days(p_license_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é licença de teste
  IF p_license_code LIKE 'TRIAL%' THEN
    RETURN 7; -- Licenças de teste sempre têm 7 dias
  END IF;
  
  -- Verificar formato do código
  IF LENGTH(p_license_code) != 13 THEN
    RETURN 30; -- Licenças legadas têm 30 dias por padrão
  END IF;
  
  -- Verificar se os primeiros 6 caracteres são dígitos
  IF SUBSTRING(p_license_code, 1, 6) ~ '^[0-9]{6}$' THEN
    -- Extrair e retornar os dias codificados
    RETURN SUBSTRING(p_license_code, 1, 6)::INTEGER;
  ELSE
    -- Licença legada
    RETURN 30;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN 30; -- Fallback para licenças inválidas
END;
$$;

-- =====================================================
-- 4. NOVA FUNÇÃO DE ATIVAÇÃO CORRIGIDA
-- =====================================================

CREATE OR REPLACE FUNCTION public.activate_license_fixed(p_license_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  license_days INTEGER;
  calculated_expiration TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar a licença pelo código
  SELECT * INTO license_record
  FROM public.licenses
  WHERE code = p_license_code;
  
  -- Verificar se a licença existe
  IF license_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de licença inválido');
  END IF;
  
  -- Verificar se a licença já está ativa
  IF license_record.is_active = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta licença já está sendo utilizada');
  END IF;
  
  -- Decodificar dias da licença
  license_days := public.decode_license_days(p_license_code);
  
  -- Calcular expiração baseada nos dias decodificados
  calculated_expiration := NOW() + (license_days || ' days')::INTERVAL;
  
  -- Verificar se a licença está expirada (apenas para licenças com expires_at pré-definido)
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta licença está expirada');
  END IF;
  
  -- Desativar outras licenças do usuário
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;
  
  -- Ativar a licença com duração correta
  UPDATE public.licenses
  SET 
    user_id = p_user_id,
    is_active = TRUE,
    expires_at = calculated_expiration,
    activated_at = NOW(),
    last_validation = NOW()
  WHERE code = p_license_code;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Licença ativada com sucesso! Válida por ' || license_days || ' dias.',
    'expires_at', calculated_expiration,
    'days_granted', license_days
  );
END;
$$;

-- =====================================================
-- 5. SISTEMA DE LICENÇAS DE TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_trial_license(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_code TEXT;
  license_id UUID;
  expiration_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Verificar se usuário já tem licença de teste
  IF EXISTS (
    SELECT 1 FROM public.licenses 
    WHERE user_id = p_user_id 
    AND code LIKE 'TRIAL%'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário já possui licença de teste');
  END IF;
  
  -- Gerar código de teste único
  trial_code := 'TRIAL' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.licenses WHERE code = trial_code) LOOP
    trial_code := 'TRIAL' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
  END LOOP;
  
  -- Calcular expiração (7 dias)
  expiration_date := NOW() + INTERVAL '7 days';
  
  -- Criar e ativar licença de teste
  INSERT INTO public.licenses (
    code, 
    user_id, 
    expires_at, 
    is_active,
    activated_at,
    last_validation
  )
  VALUES (
    trial_code, 
    p_user_id, 
    expiration_date, 
    TRUE,
    NOW(),
    NOW()
  )
  RETURNING id INTO license_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'license_id', license_id,
    'code', trial_code,
    'expires_at', expiration_date,
    'message', 'Licença de teste de 7 dias criada e ativada automaticamente'
  );
END;
$$;

-- =====================================================
-- 6. FUNÇÃO DE LIMPEZA AUTOMÁTICA
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_trial_licenses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Desativar licenças de teste expiradas que ainda estão ativas
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW()
  AND is_active = TRUE;
  
  -- Remover licenças de teste expiradas há mais de 30 dias
  DELETE FROM public.licenses
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW() - INTERVAL '30 days'
  AND is_active = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 7. FUNÇÃO ADMIN PARA CRIAR LICENÇAS COM DIAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_create_license_with_days(
  p_days INTEGER,
  p_quantity INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_codes TEXT[] := '{}';
  new_code TEXT;
  license_id UUID;
  i INTEGER;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças';
  END IF;
  
  -- Validar parâmetros
  IF p_days <= 0 OR p_days > 3650 THEN
    RAISE EXCEPTION 'Dias deve estar entre 1 e 3650';
  END IF;
  
  IF p_quantity <= 0 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade deve estar entre 1 e 100';
  END IF;
  
  -- Criar licenças
  FOR i IN 1..p_quantity LOOP
    -- Gerar código com dias codificados
    new_code := public.generate_license_code_with_days(p_days);
    
    -- Inserir licença inativa (será ativada quando usuário usar)
    INSERT INTO public.licenses (code, is_active)
    VALUES (new_code, FALSE)
    RETURNING id INTO license_id;
    
    new_codes := array_append(new_codes, new_code);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'codes', new_codes,
    'quantity', p_quantity,
    'days_per_license', p_days,
    'message', 'Licenças criadas com sucesso'
  );
END;
$$;

-- =====================================================
-- 8. FUNÇÃO DE ESTATÍSTICAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_license_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_licenses', COUNT(*),
    'active_licenses', COUNT(*) FILTER (WHERE is_active = TRUE),
    'trial_licenses', COUNT(*) FILTER (WHERE code LIKE 'TRIAL%'),
    'expired_licenses', COUNT(*) FILTER (WHERE expires_at < NOW()),
    'licenses_by_duration', jsonb_object_agg(
      CASE 
        WHEN code LIKE 'TRIAL%' THEN 'trial'
        WHEN SUBSTRING(code, 1, 6) ~ '^[0-9]{6}$' THEN SUBSTRING(code, 1, 6)
        ELSE 'legacy'
      END,
      COUNT(*)
    )
  ) INTO stats
  FROM public.licenses;
  
  RETURN stats;
END;
$$;

-- =====================================================
-- 9. FUNÇÃO PARA VERIFICAR SE É LICENÇA LEGADA
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_legacy_license_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se é código antigo (não começa com 6 dígitos)
  RETURN LENGTH(p_code) = 13 
    AND SUBSTRING(p_code, 1, 6) !~ '^[0-9]{6}$'
    AND p_code NOT LIKE 'TRIAL%';
END;
$$;

-- =====================================================
-- 10. TABELA DE LOG DE ATIVAÇÕES (se não existir)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.license_activation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    license_code TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    activation_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    days_granted INTEGER,
    ip_address INET,
    user_agent TEXT
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_activation_log_user_id ON public.license_activation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_log_timestamp ON public.license_activation_log(activation_timestamp DESC);

-- =====================================================
-- 11. PERMISSÕES
-- =====================================================

-- Permissões para usuários autenticados
GRANT SELECT ON public.licenses TO authenticated;
GRANT INSERT ON public.licenses TO authenticated;
GRANT UPDATE ON public.licenses TO authenticated;

-- Permissões para usuários anônimos (apenas leitura limitada)
GRANT SELECT ON public.licenses TO anon;

-- Permissões para log de ativações
GRANT SELECT, INSERT ON public.license_activation_log TO authenticated;
GRANT SELECT ON public.license_activation_log TO anon;

-- =====================================================
-- 12. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.generate_license_code_with_days(INTEGER) IS 'Gera código de licença de 13 dígitos com dias codificados nos primeiros 6 dígitos';
COMMENT ON FUNCTION public.decode_license_days(TEXT) IS 'Decodifica o número de dias de uma licença a partir do código';
COMMENT ON FUNCTION public.activate_license_fixed(TEXT, UUID) IS 'Ativa licença com duração correta baseada nos dias codificados';
COMMENT ON FUNCTION public.create_trial_license(UUID) IS 'Cria licença de teste de 7 dias para novo usuário';
COMMENT ON FUNCTION public.cleanup_expired_trial_licenses() IS 'Remove licenças de teste expiradas automaticamente';
COMMENT ON FUNCTION public.admin_create_license_with_days(INTEGER, INTEGER) IS 'Permite admin criar licenças com dias específicos';

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================