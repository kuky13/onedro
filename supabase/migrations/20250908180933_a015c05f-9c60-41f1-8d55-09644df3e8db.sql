-- Reverter as mudanças da coluna updated_at
ALTER TABLE public.licenses DROP COLUMN IF EXISTS updated_at;

-- Remover o trigger
DROP TRIGGER IF EXISTS licenses_updated_at_trigger ON public.licenses;

-- Atualizar políticas RLS para permitir acesso público à verificação de licenças
-- Permitir que qualquer usuário autenticado veja suas próprias licenças
DROP POLICY IF EXISTS "Users can view their active licenses" ON public.licenses;

CREATE POLICY "Users can view their own licenses" 
ON public.licenses 
FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir acesso público às funções de validação de licença
-- Primeiro vamos verificar se a função get_user_license_status existe e corrigir se necessário
CREATE OR REPLACE FUNCTION public.get_user_license_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  result JSONB;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Buscar licença ativa do usuário
  SELECT * INTO license_record
  FROM public.licenses
  WHERE user_id = p_user_id 
  AND is_active = TRUE
  ORDER BY activated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;
  
  -- Se não encontrou licença ativa, verificar se existe alguma licença para o usuário
  IF license_record IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.licenses WHERE user_id = p_user_id) THEN
      -- Tem licença mas não está ativa
      RETURN jsonb_build_object(
        'has_license', true,
        'is_valid', false,
        'requires_activation', true,
        'requires_renewal', false,
        'message', 'Licença encontrada mas inativa - requer ativação',
        'validation_timestamp', current_time
      );
    ELSE
      -- Não tem nenhuma licença
      RETURN jsonb_build_object(
        'has_license', false,
        'is_valid', false,
        'requires_activation', true,
        'requires_renewal', false,
        'message', 'Nenhuma licença encontrada para este usuário',
        'validation_timestamp', current_time
      );
    END IF;
  END IF;
  
  -- Verificar se a licença está expirada
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < current_time THEN
    -- Marcar licença como inativa se expirada
    UPDATE public.licenses 
    SET is_active = FALSE, last_validation = current_time
    WHERE id = license_record.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'requires_activation', false,
      'requires_renewal', true,
      'license_code', license_record.code,
      'expires_at', license_record.expires_at,
      'activated_at', license_record.activated_at,
      'expired_at', license_record.expires_at,
      'days_remaining', 0,
      'message', 'Licença expirada',
      'validation_timestamp', current_time
    );
  END IF;
  
  -- Atualizar última validação
  UPDATE public.licenses 
  SET last_validation = current_time
  WHERE id = license_record.id;
  
  -- Calcular dias restantes
  DECLARE
    days_remaining INTEGER;
  BEGIN
    IF license_record.expires_at IS NOT NULL THEN
      days_remaining := EXTRACT(DAY FROM license_record.expires_at - current_time)::INTEGER;
      IF days_remaining < 0 THEN
        days_remaining := 0;
      END IF;
    ELSE
      days_remaining := NULL;
    END IF;
  END;
  
  -- Licença válida e ativa
  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', true,
    'requires_activation', false,
    'requires_renewal', false,
    'license_code', license_record.code,
    'expires_at', license_record.expires_at,
    'activated_at', license_record.activated_at,
    'days_remaining', days_remaining,
    'message', 'Licença válida e ativa',
    'validation_timestamp', current_time
  );
END;
$$;