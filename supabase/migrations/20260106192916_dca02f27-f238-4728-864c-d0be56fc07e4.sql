-- Add or adjust trial license duration to 30 days and implement TRIAL -> normal license conversion on activation

-- 1) Update create_trial_license to use 30 days instead of 7
CREATE OR REPLACE FUNCTION public.create_trial_license(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- Calcular expiração (30 dias a partir da ativação)
  expiration_date := NOW() + INTERVAL '30 days';
  
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
    'message', 'Licença de teste de 30 dias criada e ativada automaticamente'
  );
END;
$function$;


-- 2) Update activate_license_by_code to convert TRIAL codes into a new normal license
CREATE OR REPLACE FUNCTION public.activate_license_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_license_id UUID;
    v_current_user_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_is_active BOOLEAN;
    v_result JSON;
    v_code TEXT;
    v_new_license_id UUID;
    v_new_code TEXT;
    v_new_expires_at TIMESTAMPTZ;
BEGIN
    -- Obter ID do usuário atual
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado';
    END IF;

    -- Buscar licença pelo código
    SELECT id, expires_at, is_active, code
    INTO v_license_id, v_expires_at, v_is_active, v_code
    FROM licenses
    WHERE code = p_code;

    -- Verificar se a licença existe
    IF v_license_id IS NULL THEN
        RAISE EXCEPTION 'Código de licença inválido: %', p_code;
    END IF;

    -- Regra especial para códigos TRIAL*
    IF v_code LIKE 'TRIAL%' THEN
        -- Verificar se o usuário já possui uma licença ativa
        IF EXISTS (
            SELECT 1 FROM licenses 
            WHERE user_id = v_current_user_id 
            AND is_active = TRUE
            AND (expires_at IS NULL OR expires_at > NOW())
        ) THEN
            RAISE EXCEPTION 'Usuário já possui uma licença ativa';
        END IF;

        -- Gerar novo código "normal" (sem prefixo TRIAL)
        LOOP
            v_new_code := 'ONEDRIP' || LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
            EXIT WHEN NOT EXISTS (SELECT 1 FROM licenses WHERE code = v_new_code);
        END LOOP;

        -- Definir expiração em 30 dias a partir da ativação
        v_new_expires_at := NOW() + INTERVAL '30 days';

        -- Criar nova licença definitiva para o usuário
        INSERT INTO licenses (
            code,
            user_id,
            is_active,
            activated_at,
            last_validation,
            expires_at
        )
        VALUES (
            v_new_code,
            v_current_user_id,
            TRUE,
            NOW(),
            NOW(),
            v_new_expires_at
        )
        RETURNING id INTO v_new_license_id;

        -- Desativar / encerrar a licença TRIAL original
        UPDATE licenses
        SET 
            is_active = FALSE,
            expires_at = NOW(),
            last_validation = NOW()
        WHERE id = v_license_id;

        -- Registrar no histórico
        INSERT INTO license_history (
            license_id,
            action,
            details,
            performed_by
        ) VALUES (
            v_new_license_id,
            'activated_from_trial',
            JSON_BUILD_OBJECT(
                'activated_by_user', v_current_user_id,
                'source_trial_code', v_code,
                'new_code', v_new_code,
                'activated_at', NOW(),
                'expires_at', v_new_expires_at
            ),
            v_current_user_id
        );

        -- Retornar resultado da nova licença
        SELECT JSON_BUILD_OBJECT(
            'success', TRUE,
            'license_id', v_new_license_id,
            'code', v_new_code,
            'expires_at', v_new_expires_at,
            'activated_at', NOW(),
            'message', 'Licença gerada a partir de TRIAL e ativada com sucesso'
        ) INTO v_result;

        RETURN v_result;
    END IF;

    -- Fluxo original para licenças que não são TRIAL

    -- Verificar se a licença já está ativa
    IF v_is_active THEN
        RAISE EXCEPTION 'Esta licença já está ativa';
    END IF;

    -- Verificar se a licença já está expirada
    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
        RAISE EXCEPTION 'Esta licença já expirou em %', v_expires_at;
    END IF;

    -- Verificar se o usuário já possui uma licença ativa
    IF EXISTS (
        SELECT 1 FROM licenses 
        WHERE user_id = v_current_user_id 
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    ) THEN
        RAISE EXCEPTION 'Usuário já possui uma licença ativa';
    END IF;

    -- Ativar a licença (mantendo a data de expiração atual)
    UPDATE licenses
    SET 
        user_id = v_current_user_id,
        is_active = TRUE,
        activated_at = NOW(),
        last_validation = NOW()
    WHERE id = v_license_id;

    -- Registrar no histórico
    INSERT INTO license_history (
        license_id,
        action,
        details,
        performed_by
    ) VALUES (
        v_license_id,
        'activated',
        JSON_BUILD_OBJECT(
            'activated_by_user', v_current_user_id,
            'activation_method', 'code_activation',
            'activated_at', NOW()
        ),
        v_current_user_id
    );

    -- Retornar resultado
    SELECT JSON_BUILD_OBJECT(
        'success', TRUE,
        'license_id', v_license_id,
        'code', p_code,
        'expires_at', v_expires_at,
        'activated_at', NOW(),
        'message', 'Licença ativada com sucesso'
    ) INTO v_result;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_OBJECT(
            'success', FALSE,
            'error', SQLERRM,
            'message', 'Erro ao ativar licença'
        );
END;
$function$;