-- =====================================================
-- Sistema de Licenças - Funções RPC para Frontend
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO PARA PREVIEW DE DURAÇÃO DA LICENÇA
-- =====================================================

CREATE OR REPLACE FUNCTION public.preview_license_duration(p_license_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  days_count INTEGER;
  is_trial BOOLEAN := FALSE;
  is_legacy BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Validar entrada
  IF p_license_code IS NULL OR LENGTH(TRIM(p_license_code)) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Código de licença não fornecido'
    );
  END IF;

  -- Limpar e normalizar código
  p_license_code := UPPER(TRIM(p_license_code));

  -- Verificar se é licença de teste
  IF p_license_code LIKE 'TRIAL%' THEN
    is_trial := TRUE;
    days_count := 7;
  ELSE
    -- Usar função de decodificação
    days_count := public.decode_license_days(p_license_code);
    
    -- Se retornou 30, pode ser licença legada
    IF days_count = 30 THEN
      is_legacy := public.is_legacy_license_code(p_license_code);
    END IF;
  END IF;

  result := jsonb_build_object(
    'days', days_count,
    'is_trial', is_trial,
    'is_legacy', is_legacy,
    'valid_format', days_count > 0,
    'license_code', p_license_code
  );

  RETURN result;
END;
$$;

-- =====================================================
-- 2. FUNÇÃO PARA STATUS DE LICENÇA DE TESTE DO USUÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_trial_license_status(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_license RECORD;
  days_remaining INTEGER;
  result JSONB;
BEGIN
  -- Validar usuário
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ID do usuário não fornecido'
    );
  END IF;

  -- Buscar licença de teste do usuário
  SELECT l.*, 
         CASE 
           WHEN l.expires_at IS NOT NULL THEN 
             GREATEST(0, EXTRACT(DAY FROM (l.expires_at - NOW()))::INTEGER)
           ELSE 0 
         END as days_left
  INTO trial_license
  FROM public.licenses l
  WHERE l.user_id = p_user_id 
    AND l.code LIKE 'TRIAL%'
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF trial_license.id IS NOT NULL THEN
    -- Usuário tem licença de teste
    result := jsonb_build_object(
      'has_trial', true,
      'is_active', trial_license.is_active,
      'license_code', trial_license.code,
      'created_at', trial_license.created_at,
      'expires_at', trial_license.expires_at,
      'days_remaining', trial_license.days_left,
      'is_expired', trial_license.expires_at < NOW(),
      'can_create_trial', false,
      'message', CASE 
        WHEN trial_license.is_active AND trial_license.expires_at > NOW() THEN 
          'Licença de teste ativa'
        WHEN trial_license.expires_at < NOW() THEN 
          'Licença de teste expirada'
        ELSE 
          'Licença de teste inativa'
      END
    );
  ELSE
    -- Usuário não tem licença de teste
    -- Verificar se pode criar uma (não tem nenhuma licença ativa)
    DECLARE
      has_active_license BOOLEAN;
    BEGIN
      SELECT EXISTS(
        SELECT 1 FROM public.licenses 
        WHERE user_id = p_user_id 
          AND is_active = TRUE 
          AND (expires_at IS NULL OR expires_at > NOW())
      ) INTO has_active_license;

      result := jsonb_build_object(
        'has_trial', false,
        'is_active', false,
        'license_code', null,
        'created_at', null,
        'expires_at', null,
        'days_remaining', null,
        'is_expired', false,
        'can_create_trial', NOT has_active_license,
        'message', CASE 
          WHEN has_active_license THEN 
            'Usuário já possui licença ativa'
          ELSE 
            'Pode criar licença de teste'
        END
      );
    END;
  END IF;

  RETURN result;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO ATUALIZADA PARA STATUS GERAL DE LICENÇA DO USUÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_license_status(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_license RECORD;
  days_remaining INTEGER;
  license_type TEXT;
  days_granted INTEGER;
  is_trial BOOLEAN := FALSE;
  is_legacy BOOLEAN := FALSE;
  can_create_trial BOOLEAN := FALSE;
  result JSONB;
BEGIN
  -- Validar entrada
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ID do usuário não fornecido'
    );
  END IF;

  -- Buscar licença ativa do usuário (priorizar não-trial)
  SELECT l.*
  INTO user_license
  FROM public.licenses l
  WHERE l.user_id = p_user_id 
    AND l.is_active = TRUE
    AND (l.expires_at IS NULL OR l.expires_at > NOW())
  ORDER BY 
    CASE WHEN l.code LIKE 'TRIAL%' THEN 1 ELSE 0 END, -- Priorizar licenças normais
    l.created_at DESC
  LIMIT 1;

  IF user_license.id IS NOT NULL THEN
    -- Usuário tem licença ativa
    
    -- Calcular dias restantes
    IF user_license.expires_at IS NOT NULL THEN
      days_remaining := GREATEST(0, EXTRACT(DAY FROM (user_license.expires_at - NOW()))::INTEGER);
    ELSE
      days_remaining := NULL; -- Licença sem expiração
    END IF;

    -- Determinar tipo e dias concedidos
    IF user_license.code LIKE 'TRIAL%' THEN
      license_type := 'TRIAL';
      is_trial := TRUE;
      days_granted := 7;
    ELSE
      days_granted := public.decode_license_days(user_license.code);
      is_legacy := public.is_legacy_license_code(user_license.code);
      
      IF is_legacy THEN
        license_type := 'LEGACY';
      ELSE
        license_type := 'NORMAL';
      END IF;
    END IF;

    result := jsonb_build_object(
      'has_license', true,
      'is_valid', true,
      'license_code', user_license.code,
      'expires_at', user_license.expires_at,
      'activated_at', user_license.created_at,
      'days_remaining', days_remaining,
      'days_granted', days_granted,
      'license_type', license_type,
      'is_trial', is_trial,
      'is_legacy', is_legacy,
      'requires_activation', false,
      'requires_renewal', false,
      'can_create_trial', false,
      'message', CASE 
        WHEN days_remaining IS NULL THEN 'Licença ativa (sem expiração)'
        WHEN days_remaining > 7 THEN 'Licença ativa'
        WHEN days_remaining > 0 THEN 'Licença expira em breve'
        ELSE 'Licença expirada'
      END,
      'validation_timestamp', NOW()
    );
  ELSE
    -- Usuário não tem licença ativa
    
    -- Verificar se pode criar licença de teste
    SELECT NOT EXISTS(
      SELECT 1 FROM public.licenses 
      WHERE user_id = p_user_id 
        AND code LIKE 'TRIAL%'
    ) INTO can_create_trial;

    result := jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'license_code', '',
      'expires_at', null,
      'activated_at', null,
      'days_remaining', null,
      'days_granted', null,
      'license_type', 'NONE',
      'is_trial', false,
      'is_legacy', false,
      'requires_activation', true,
      'requires_renewal', false,
      'can_create_trial', can_create_trial,
      'message', CASE 
        WHEN can_create_trial THEN 'Sem licença - pode criar teste'
        ELSE 'Sem licença ativa'
      END,
      'validation_timestamp', NOW()
    );
  END IF;

  RETURN result;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO PARA ESTATÍSTICAS DE LICENÇAS DE TESTE (ADMIN)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_trial_license_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats RECORD;
  result JSONB;
BEGIN
  -- Verificar se usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Acesso negado - apenas administradores'
    );
  END IF;

  -- Calcular estatísticas
  SELECT 
    COUNT(*) as total_trials,
    COUNT(*) FILTER (WHERE is_active = TRUE AND expires_at > NOW()) as active_trials,
    COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_trials,
    COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as trials_today,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW())) as trials_this_week,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as trials_this_month
  INTO stats
  FROM public.licenses
  WHERE code LIKE 'TRIAL%';

  -- Calcular taxa de conversão (usuários que ativaram licença normal após trial)
  DECLARE
    conversion_count INTEGER;
    conversion_rate NUMERIC;
  BEGIN
    SELECT COUNT(DISTINCT user_id) INTO conversion_count
    FROM public.licenses l1
    WHERE l1.code LIKE 'TRIAL%'
      AND EXISTS (
        SELECT 1 FROM public.licenses l2 
        WHERE l2.user_id = l1.user_id 
          AND l2.code NOT LIKE 'TRIAL%'
          AND l2.created_at > l1.created_at
      );

    IF stats.total_trials > 0 THEN
      conversion_rate := (conversion_count::NUMERIC / stats.total_trials::NUMERIC) * 100;
    ELSE
      conversion_rate := 0;
    END IF;

    result := jsonb_build_object(
      'total_trials', stats.total_trials,
      'active_trials', stats.active_trials,
      'expired_trials', stats.expired_trials,
      'trials_created_today', stats.trials_today,
      'trials_created_this_week', stats.trials_this_week,
      'trials_created_this_month', stats.trials_this_month,
      'conversion_rate', ROUND(conversion_rate, 2),
      'conversion_count', conversion_count,
      'statistics_timestamp', NOW()
    );
  END;

  RETURN result;
END;
$$;

-- =====================================================
-- 5. PERMISSÕES PARA AS FUNÇÕES RPC
-- =====================================================

-- Funções públicas para usuários autenticados
GRANT EXECUTE ON FUNCTION public.preview_license_duration(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trial_license_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_license_status(UUID) TO authenticated;

-- Função de estatísticas apenas para admins (verificação interna)
GRANT EXECUTE ON FUNCTION public.get_trial_license_statistics() TO authenticated;

-- Permitir acesso anônimo para preview (útil para validação de códigos)
GRANT EXECUTE ON FUNCTION public.preview_license_duration(TEXT) TO anon;

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.preview_license_duration(TEXT) IS 'Retorna preview da duração de uma licença sem ativá-la';
COMMENT ON FUNCTION public.get_user_trial_license_status(UUID) IS 'Retorna status detalhado da licença de teste do usuário';
COMMENT ON FUNCTION public.get_user_license_status(UUID) IS 'Retorna status completo das licenças do usuário';
COMMENT ON FUNCTION public.get_trial_license_statistics() IS 'Retorna estatísticas de licenças de teste (apenas admins)';

-- =====================================================
-- FIM DAS FUNÇÕES RPC
-- =====================================================