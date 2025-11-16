-- Migração: Sistema de Licenças Melhorado - Funções Core
-- Data: 2025-01-20
-- Descrição: Implementa as funções principais do novo sistema de licenças de 13 dígitos
-- com codificação de dias e correção da ativação

-- =====================================================
-- 1. FUNÇÃO: Gerar código de licença com dias codificados
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_license_code_with_days(p_days INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Codificar dias em 6 dígitos (formato: DDDDDD)
  days_encoded := LPAD(p_days::TEXT, 6, '0');
  
  -- Gerar 7 caracteres aleatórios
  random_part := '';
  FOR i IN 1..7 LOOP
    random_part := random_part || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  
  -- Formar código completo (DDDDDDXXXXXXX)
  full_code := days_encoded || random_part;
  
  -- Verificar unicidade e regenerar se necessário
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
-- 2. FUNÇÃO: Decodificar dias do código de licença
-- =====================================================
CREATE OR REPLACE FUNCTION public.decode_license_days(p_license_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o código tem 13 caracteres
  IF LENGTH(p_license_code) != 13 THEN
    RETURN NULL;
  END IF;
  
  -- Verificar se é licença de teste
  IF p_license_code LIKE 'TRIAL%' THEN
    RETURN 7; -- Licenças de teste sempre têm 7 dias
  END IF;
  
  -- Extrair primeiros 6 dígitos e converter para inteiro
  IF SUBSTRING(p_license_code, 1, 6) ~ '^[0-9]{6}$' THEN
    RETURN SUBSTRING(p_license_code, 1, 6)::INTEGER;
  END IF;
  
  -- Se não conseguir decodificar, retornar NULL (código legado)
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL; -- Código inválido
END;
$$;

-- =====================================================
-- 3. FUNÇÃO: Ativação corrigida de licenças
-- =====================================================
CREATE OR REPLACE FUNCTION public.activate_license_fixed(p_license_code TEXT, p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  license_days INTEGER;
  calculated_expiration TIMESTAMP WITH TIME ZONE;
  is_trial_license BOOLEAN := FALSE;
BEGIN
  -- Verificar se o usuário está autenticado
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Usuário não autenticado',
      'error_code', 'UNAUTHENTICATED'
    );
  END IF;

  -- Buscar a licença pelo código
  SELECT * INTO license_record
  FROM public.licenses
  WHERE code = p_license_code;

  -- Verificar se a licença existe
  IF license_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de licença inválido',
      'error_code', 'INVALID_LICENSE'
    );
  END IF;

  -- Verificar se a licença já está ativa
  IF license_record.is_active = TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta licença já está sendo utilizada',
      'error_code', 'ALREADY_ACTIVE'
    );
  END IF;

  -- Verificar se é licença de teste
  is_trial_license := p_license_code LIKE 'TRIAL%';

  -- Decodificar dias da licença
  license_days := public.decode_license_days(p_license_code);

  -- Se não conseguir decodificar, usar expires_at existente ou erro
  IF license_days IS NULL THEN
    IF license_record.expires_at IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Licença com formato inválido',
        'error_code', 'INVALID_FORMAT'
      );
    END IF;
    calculated_expiration := license_record.expires_at;
    -- Para licenças legadas, calcular dias restantes
    license_days := EXTRACT(DAY FROM (license_record.expires_at - NOW()));
  ELSE
    -- Calcular expiração baseada nos dias decodificados
    calculated_expiration := NOW() + (license_days || ' days')::INTERVAL;
  END IF;

  -- Verificar se a licença está expirada
  IF calculated_expiration < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta licença está expirada',
      'error_code', 'EXPIRED_LICENSE',
      'expired_at', calculated_expiration
    );
  END IF;

  -- Para licenças de teste, verificar se usuário já tem uma ativa
  IF is_trial_license THEN
    IF EXISTS (
      SELECT 1 FROM public.licenses 
      WHERE user_id = p_user_id 
      AND code LIKE 'TRIAL%' 
      AND is_active = TRUE
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Usuário já possui uma licença de teste ativa',
        'error_code', 'TRIAL_ALREADY_ACTIVE'
      );
    END IF;
  END IF;

  -- Desativar outras licenças do usuário (exceto se for licença de teste)
  IF NOT is_trial_license THEN
    UPDATE public.licenses
    SET is_active = FALSE
    WHERE user_id = p_user_id AND is_active = TRUE;
  END IF;

  -- Ativar a licença com duração correta
  UPDATE public.licenses
  SET 
    user_id = p_user_id,
    is_active = TRUE,
    expires_at = calculated_expiration,
    activated_at = NOW(),
    last_validation = NOW()
  WHERE code = p_license_code;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN is_trial_license THEN 'Licença de teste ativada com sucesso! Válida por 7 dias.'
      ELSE 'Licença ativada com sucesso! Válida por ' || license_days || ' dias.'
    END,
    'license_code', p_license_code,
    'expires_at', calculated_expiration,
    'days_granted', license_days,
    'is_trial', is_trial_license,
    'activated_at', NOW()
  );
END;
$$;

-- =====================================================
-- 4. FUNÇÃO: Verificar se código é de formato legado
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
-- 5. FUNÇÃO: Preview de dias da licença
-- =====================================================
CREATE OR REPLACE FUNCTION public.preview_license_duration(p_license_code TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_days INTEGER;
  license_record RECORD;
BEGIN
  -- Verificar se a licença existe
  SELECT * INTO license_record
  FROM public.licenses
  WHERE code = p_license_code;

  IF license_record IS NULL THEN
    RETURN NULL; -- Licença não encontrada
  END IF;

  -- Decodificar dias
  license_days := public.decode_license_days(p_license_code);

  -- Se não conseguir decodificar, usar expires_at
  IF license_days IS NULL AND license_record.expires_at IS NOT NULL THEN
    license_days := EXTRACT(DAY FROM (license_record.expires_at - NOW()));
  END IF;

  RETURN license_days;
END;
$$;

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================
COMMENT ON FUNCTION public.generate_license_code_with_days(INTEGER) IS 
'Gera código de licença de 13 dígitos com dias codificados. Formato: DDDDDDXXXXXXX onde DDDDDD são os dias e XXXXXXX são caracteres aleatórios';

COMMENT ON FUNCTION public.decode_license_days(TEXT) IS 
'Decodifica o número de dias de um código de licença. Retorna NULL para códigos inválidos ou legados';

COMMENT ON FUNCTION public.activate_license_fixed(TEXT, UUID) IS 
'Ativa uma licença aplicando exatamente os dias especificados no código. Corrige o problema da atribuição fixa de 30 dias';

COMMENT ON FUNCTION public.is_legacy_license_code(TEXT) IS 
'Verifica se um código de licença é do formato legado (sem codificação de dias)';

COMMENT ON FUNCTION public.preview_license_duration(TEXT) IS 
'Retorna o número de dias que uma licença concederá quando ativada, sem ativá-la';