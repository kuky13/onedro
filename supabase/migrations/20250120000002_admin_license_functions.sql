-- Migração para funções administrativas de licenças com dias específicos
-- Criado em: 2025-01-20
-- Descrição: Implementa funções admin para criar licenças com dias específicos usando o novo sistema

-- 1. Função para administradores criarem licenças com dias específicos
CREATE OR REPLACE FUNCTION admin_create_license_with_days(
  p_days integer,
  p_quantity integer DEFAULT 1,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  license_code text;
  license_id uuid;
  created_licenses jsonb[] := '{}';
  i integer;
  expires_at_date timestamp with time zone;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças';
  END IF;

  -- Validar parâmetros
  IF p_days <= 0 OR p_days > 3650 THEN -- máximo 10 anos
    RAISE EXCEPTION 'Dias deve estar entre 1 e 3650 (10 anos)';
  END IF;

  IF p_quantity <= 0 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade deve estar entre 1 e 100';
  END IF;

  -- Obter ID do admin atual
  admin_user_id := auth.uid();

  -- Calcular data de expiração
  expires_at_date := NOW() + (p_days || ' days')::INTERVAL;

  -- Criar licenças em loop
  FOR i IN 1..p_quantity LOOP
    -- Gerar código com dias codificados
    SELECT public.generate_license_code_with_days(p_days) INTO license_code;
    
    -- Criar a licença inativa
    INSERT INTO public.licenses (
      code,
      expires_at,
      is_active,
      created_by_admin_id
    ) VALUES (
      license_code,
      expires_at_date,
      FALSE,
      admin_user_id
    ) RETURNING id INTO license_id;

    -- Registrar no histórico se a tabela existir
    BEGIN
      INSERT INTO public.license_history (
        license_id,
        admin_id,
        action_type,
        old_values,
        new_values,
        notes
      ) VALUES (
        license_id,
        admin_user_id,
        'CREATED',
        '{}',
        jsonb_build_object(
          'code', license_code,
          'days', p_days,
          'expires_at', expires_at_date,
          'is_active', FALSE
        ),
        COALESCE(p_notes, 'Licença criada com ' || p_days || ' dias')
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- Tabela de histórico não existe ainda, ignorar
        NULL;
    END;

    -- Adicionar à lista de licenças criadas
    created_licenses := array_append(created_licenses, jsonb_build_object(
      'id', license_id,
      'code', license_code,
      'days', p_days,
      'expires_at', expires_at_date
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licenças criadas com sucesso',
    'quantity', p_quantity,
    'days', p_days,
    'expires_at', expires_at_date,
    'licenses', created_licenses,
    'created_by', admin_user_id
  );
END;
$$;

-- 2. Função para administradores criarem licenças em lote com diferentes durações
CREATE OR REPLACE FUNCTION admin_create_mixed_licenses(
  p_license_configs jsonb -- Array de objetos {days: number, quantity: number}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  config_item jsonb;
  days_value integer;
  quantity_value integer;
  result_item jsonb;
  all_results jsonb[] := '{}';
  total_created integer := 0;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças';
  END IF;

  -- Obter ID do admin atual
  admin_user_id := auth.uid();

  -- Processar cada configuração
  FOR config_item IN SELECT * FROM jsonb_array_elements(p_license_configs)
  LOOP
    days_value := (config_item->>'days')::integer;
    quantity_value := (config_item->>'quantity')::integer;

    -- Criar licenças para esta configuração
    SELECT admin_create_license_with_days(
      days_value,
      quantity_value,
      'Criação em lote - ' || days_value || ' dias'
    ) INTO result_item;

    -- Adicionar ao resultado
    all_results := array_append(all_results, result_item);
    total_created := total_created + quantity_value;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licenças em lote criadas com sucesso',
    'total_created', total_created,
    'results', all_results,
    'created_by', admin_user_id
  );
END;
$$;

-- 3. Função para administradores visualizarem estatísticas de licenças por dias
CREATE OR REPLACE FUNCTION admin_get_license_stats_by_days()
RETURNS TABLE (
  days_encoded integer,
  total_licenses bigint,
  active_licenses bigint,
  inactive_licenses bigint,
  expired_licenses bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar estatísticas';
  END IF;

  RETURN QUERY
  SELECT 
    public.decode_license_days(l.code) as days_encoded,
    COUNT(*) as total_licenses,
    COUNT(*) FILTER (WHERE l.is_active = TRUE) as active_licenses,
    COUNT(*) FILTER (WHERE l.is_active = FALSE) as inactive_licenses,
    COUNT(*) FILTER (WHERE l.expires_at < NOW()) as expired_licenses
  FROM public.licenses l
  WHERE public.decode_license_days(l.code) > 0 -- Apenas licenças com dias codificados
  GROUP BY public.decode_license_days(l.code)
  ORDER BY days_encoded;
END;
$$;

-- 4. Função para administradores converterem licenças legadas para o novo formato
CREATE OR REPLACE FUNCTION admin_convert_legacy_license(
  p_license_code text,
  p_days integer,
  p_notes text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
  license_record record;
  new_code text;
  new_expires_at timestamp with time zone;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem converter licenças';
  END IF;

  -- Obter ID do admin atual
  admin_user_id := auth.uid();

  -- Verificar se a licença existe e é legada
  SELECT * INTO license_record
  FROM public.licenses
  WHERE code = p_license_code;

  IF license_record IS NULL THEN
    RAISE EXCEPTION 'Licença não encontrada: %', p_license_code;
  END IF;

  IF NOT public.is_legacy_license_code(p_license_code) THEN
    RAISE EXCEPTION 'Licença já está no novo formato: %', p_license_code;
  END IF;

  -- Gerar novo código com dias codificados
  SELECT public.generate_license_code_with_days(p_days) INTO new_code;

  -- Calcular nova data de expiração
  new_expires_at := NOW() + (p_days || ' days')::INTERVAL;

  -- Atualizar a licença
  UPDATE public.licenses
  SET 
    code = new_code,
    expires_at = new_expires_at,
    updated_at = NOW()
  WHERE id = license_record.id;

  -- Registrar no histórico se a tabela existir
  BEGIN
    INSERT INTO public.license_history (
      license_id,
      admin_id,
      action_type,
      old_values,
      new_values,
      notes
    ) VALUES (
      license_record.id,
      admin_user_id,
      'CONVERTED',
      jsonb_build_object(
        'old_code', p_license_code,
        'old_expires_at', license_record.expires_at
      ),
      jsonb_build_object(
        'new_code', new_code,
        'new_expires_at', new_expires_at,
        'days', p_days
      ),
      COALESCE(p_notes, 'Conversão de licença legada para novo formato')
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de histórico não existe ainda, ignorar
      NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença convertida com sucesso',
    'old_code', p_license_code,
    'new_code', new_code,
    'days', p_days,
    'new_expires_at', new_expires_at,
    'converted_by', admin_user_id
  );
END;
$$;

-- 5. Conceder permissões
GRANT EXECUTE ON FUNCTION admin_create_license_with_days(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_mixed_licenses(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_license_stats_by_days() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_convert_legacy_license(text, integer, text) TO authenticated;

-- 6. Comentários nas funções
COMMENT ON FUNCTION admin_create_license_with_days(integer, integer, text) IS 'Cria licenças com dias específicos codificados no código';
COMMENT ON FUNCTION admin_create_mixed_licenses(jsonb) IS 'Cria licenças em lote com diferentes durações';
COMMENT ON FUNCTION admin_get_license_stats_by_days() IS 'Retorna estatísticas de licenças agrupadas por dias codificados';
COMMENT ON FUNCTION admin_convert_legacy_license(text, integer, text) IS 'Converte uma licença legada para o novo formato com dias codificados';