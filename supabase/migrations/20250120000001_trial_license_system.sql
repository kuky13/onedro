-- Migração: Sistema de Licenças de Teste
-- Data: 2025-01-20
-- Descrição: Implementa sistema automático de licenças de teste de 7 dias
-- e funções de limpeza automática

-- =====================================================
-- 1. FUNÇÃO: Criar licença de teste para usuário
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
  random_suffix TEXT;
  characters TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  -- Verificar se usuário já tem licença de teste
  IF EXISTS (
    SELECT 1 FROM public.licenses 
    WHERE user_id = p_user_id 
    AND code LIKE 'TRIAL%'
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Usuário já possui licença de teste',
      'error_code', 'TRIAL_EXISTS'
    );
  END IF;
  
  -- Gerar sufixo aleatório de 8 caracteres
  random_suffix := '';
  FOR i IN 1..8 LOOP
    random_suffix := random_suffix || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  
  -- Gerar código de teste único (TRIAL + 8 caracteres = 13 total)
  trial_code := 'TRIAL' || random_suffix;
  
  -- Verificar unicidade
  WHILE EXISTS (SELECT 1 FROM public.licenses WHERE code = trial_code) LOOP
    random_suffix := '';
    FOR i IN 1..8 LOOP
      random_suffix := random_suffix || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
    END LOOP;
    trial_code := 'TRIAL' || random_suffix;
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
    'days_granted', 7,
    'is_trial', true,
    'message', 'Licença de teste de 7 dias criada e ativada automaticamente'
  );
END;
$$;

-- =====================================================
-- 2. FUNÇÃO: Limpeza de licenças de teste expiradas
-- =====================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_trial_licenses()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  deactivated_count INTEGER;
BEGIN
  -- Desativar licenças de teste expiradas que ainda estão ativas
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW()
  AND is_active = TRUE;
  
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  
  -- Remover licenças de teste expiradas há mais de 30 dias
  DELETE FROM public.licenses
  WHERE code LIKE 'TRIAL%'
  AND expires_at < NOW() - INTERVAL '30 days'
  AND is_active = FALSE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação (se houver sistema de logs)
  IF deleted_count > 0 OR deactivated_count > 0 THEN
    RAISE NOTICE 'Limpeza de licenças de teste: % desativadas, % removidas', deactivated_count, deleted_count;
  END IF;
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO: Verificar status de licença de teste do usuário
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_trial_license_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_license RECORD;
  days_remaining INTEGER;
BEGIN
  -- Verificar se o usuário está autenticado
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_trial', false,
      'error', 'Usuário não autenticado'
    );
  END IF;

  -- Buscar licença de teste do usuário
  SELECT * INTO trial_license
  FROM public.licenses
  WHERE user_id = p_user_id
  AND code LIKE 'TRIAL%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se não tem licença de teste
  IF trial_license IS NULL THEN
    RETURN jsonb_build_object(
      'has_trial', false,
      'can_create_trial', true,
      'message', 'Usuário pode criar licença de teste'
    );
  END IF;

  -- Calcular dias restantes
  days_remaining := EXTRACT(DAY FROM (trial_license.expires_at - NOW()));
  
  -- Se expirada
  IF trial_license.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'has_trial', true,
      'is_active', false,
      'is_expired', true,
      'code', trial_license.code,
      'expires_at', trial_license.expires_at,
      'days_remaining', 0,
      'message', 'Licença de teste expirada'
    );
  END IF;

  -- Se ativa
  RETURN jsonb_build_object(
    'has_trial', true,
    'is_active', trial_license.is_active,
    'is_expired', false,
    'code', trial_license.code,
    'expires_at', trial_license.expires_at,
    'days_remaining', days_remaining,
    'activated_at', trial_license.activated_at,
    'message', 'Licença de teste ativa'
  );
END;
$$;

-- =====================================================
-- 4. FUNÇÃO: Estatísticas de licenças de teste
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_trial_license_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem ver estatísticas';
  END IF;

  SELECT jsonb_build_object(
    'total_trial_licenses', COUNT(*),
    'active_trial_licenses', COUNT(*) FILTER (WHERE is_active = TRUE AND expires_at > NOW()),
    'expired_trial_licenses', COUNT(*) FILTER (WHERE expires_at < NOW()),
    'trial_licenses_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'trial_licenses_this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'trial_licenses_this_month', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'conversion_rate', CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(
          (COUNT(*) FILTER (WHERE user_id IN (
            SELECT DISTINCT user_id FROM public.licenses 
            WHERE code NOT LIKE 'TRIAL%' AND is_active = TRUE
          )))::DECIMAL / COUNT(*) * 100, 2
        )
      ELSE 0
    END
  ) INTO stats
  FROM public.licenses
  WHERE code LIKE 'TRIAL%';
  
  RETURN stats;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO: Forçar expiração de licença de teste
-- =====================================================
CREATE OR REPLACE FUNCTION public.expire_trial_license(p_user_id UUID, p_admin_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_license RECORD;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem expirar licenças de teste';
  END IF;

  -- Buscar licença de teste ativa do usuário
  SELECT * INTO trial_license
  FROM public.licenses
  WHERE user_id = p_user_id
  AND code LIKE 'TRIAL%'
  AND is_active = TRUE
  AND expires_at > NOW();

  -- Se não encontrou licença ativa
  IF trial_license IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não possui licença de teste ativa',
      'error_code', 'NO_ACTIVE_TRIAL'
    );
  END IF;

  -- Expirar a licença
  UPDATE public.licenses
  SET 
    expires_at = NOW(),
    is_active = FALSE,
    last_validation = NOW()
  WHERE id = trial_license.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença de teste expirada com sucesso',
    'license_code', trial_license.code,
    'expired_at', NOW()
  );
END;
$$;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.create_trial_license(UUID) IS 
'Cria uma licença de teste de 7 dias para um usuário. Formato: TRIALXXXXXXXX';

COMMENT ON FUNCTION public.cleanup_expired_trial_licenses() IS 
'Remove licenças de teste expiradas há mais de 30 dias e desativa as expiradas recentemente';

COMMENT ON FUNCTION public.get_user_trial_license_status(UUID) IS 
'Retorna o status da licença de teste do usuário (ativa, expirada, ou inexistente)';

COMMENT ON FUNCTION public.get_trial_license_statistics() IS 
'Retorna estatísticas detalhadas sobre licenças de teste (apenas para admins)';

COMMENT ON FUNCTION public.expire_trial_license(UUID, UUID) IS 
'Força a expiração de uma licença de teste ativa (apenas para admins)';