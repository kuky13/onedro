-- Migração para implementar licenças inativas por padrão
-- Criado em: 2025-01-21
-- Descrição: Altera o padrão da coluna is_active para FALSE e adiciona colunas necessárias

-- 1. Adicionar colunas que estão faltando na tabela licenses
ALTER TABLE public.licenses 
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_validation TIMESTAMP WITH TIME ZONE;

-- 2. Alterar o padrão da coluna is_active para FALSE
ALTER TABLE public.licenses 
ALTER COLUMN is_active SET DEFAULT FALSE;

-- 3. Atualizar função admin_create_license para criar licenças inativas
CREATE OR REPLACE FUNCTION public.admin_create_license(p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  license_id UUID;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças';
  END IF;
  
  -- Gerar código único
  SELECT public.generate_license_code() INTO new_code;
  
  -- Inserir nova licença (is_active agora é FALSE por padrão)
  INSERT INTO public.licenses (code, expires_at, is_active)
  VALUES (new_code, p_expires_at, FALSE)
  RETURNING id INTO license_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'license_id', license_id,
    'code', new_code,
    'expires_at', p_expires_at,
    'is_active', FALSE
  );
END;
$function$;

-- 4. Criar função admin_create_bulk_licenses para criar licenças inativas em lote
CREATE OR REPLACE FUNCTION public.admin_create_bulk_licenses(p_quantity integer, p_expires_in_days integer DEFAULT 365)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_codes TEXT[] := '{}';
  i INTEGER;
  new_code TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças em lote';
  END IF;
  
  -- Validar quantidade
  IF p_quantity <= 0 OR p_quantity > 100 THEN
    RAISE EXCEPTION 'Quantidade deve estar entre 1 e 100';
  END IF;
  
  -- Criar licenças inativas
  FOR i IN 1..p_quantity LOOP
    SELECT public.generate_license_code() INTO new_code;
    
    INSERT INTO public.licenses (code, expires_at, is_active)
    VALUES (new_code, NOW() + (p_expires_in_days || ' days')::INTERVAL, FALSE);
    
    new_codes := array_append(new_codes, new_code);
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'codes', new_codes,
    'quantity', p_quantity,
    'expires_in_days', p_expires_in_days,
    'is_active', FALSE
  );
END;
$function$;

-- 5. Remover função existente e recriar com novos parâmetros
DROP FUNCTION IF EXISTS public.activate_license(text, uuid);

-- Criar função activate_license para ativar licença quando usuário é vinculado
CREATE OR REPLACE FUNCTION public.activate_license(p_license_code text, p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  license_record RECORD;
  result jsonb;
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

  -- Verificar se a licença já está vinculada a outro usuário
  IF license_record.user_id IS NOT NULL AND license_record.user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Esta licença já está vinculada a outro usuário',
      'error_code', 'ALREADY_LINKED'
    );
  END IF;

  -- Verificar se a licença está expirada
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Licença expirada',
      'error_code', 'EXPIRED_LICENSE',
      'expired_at', license_record.expires_at
    );
  END IF;

  -- Desativar licenças existentes do usuário
  UPDATE public.licenses
  SET is_active = FALSE
  WHERE user_id = p_user_id AND is_active = TRUE;

  -- Ativar e vincular a licença ao usuário
  UPDATE public.licenses
  SET 
    user_id = p_user_id,
    is_active = TRUE,
    activated_at = NOW(),
    last_validation = NOW()
  WHERE code = p_license_code;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença ativada com sucesso',
    'license_code', p_license_code,
    'activated_at', NOW(),
    'expires_at', license_record.expires_at
  );
END;
$function$;

-- 6. Comentários sobre as mudanças
COMMENT ON COLUMN public.licenses.is_active IS 'Indica se a licença está ativa. Padrão: FALSE (inativa)';
COMMENT ON COLUMN public.licenses.activated_at IS 'Data e hora quando a licença foi ativada pela primeira vez';
COMMENT ON COLUMN public.licenses.last_validation IS 'Data e hora da última validação da licença';

COMMENT ON FUNCTION public.admin_create_license(timestamp with time zone) IS 'Cria uma nova licença inativa que será ativada apenas quando vinculada a um usuário';
COMMENT ON FUNCTION public.admin_create_bulk_licenses(integer, integer) IS 'Cria múltiplas licenças inativas em lote';
COMMENT ON FUNCTION public.activate_license(text, uuid) IS 'Ativa uma licença vinculando-a a um usuário. Desativa licenças anteriores do mesmo usuário';