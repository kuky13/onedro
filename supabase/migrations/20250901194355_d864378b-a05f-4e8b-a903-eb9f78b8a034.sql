-- Corrigir data de expiração da licença e criar função para incluir licenças inativas
UPDATE public.licenses 
SET expires_at = CURRENT_DATE + INTERVAL '365 days'
WHERE expires_at IS NULL OR expires_at < activated_at;

-- Criar função para validar licença incluindo inativas para exibição
CREATE OR REPLACE FUNCTION public.validate_user_license_complete(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  license_record RECORD;
  result JSONB;
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Usuário não encontrado',
      'requires_activation', true,
      'requires_renewal', false,
      'timestamp', NOW()
    );
  END IF;
  
  -- Buscar qualquer licença do usuário (ativa ou inativa)
  SELECT * INTO license_record
  FROM public.licenses
  WHERE user_id = p_user_id 
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF license_record IS NULL THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença encontrada',
      'requires_activation', true,
      'requires_renewal', false,
      'timestamp', NOW()
    );
  END IF;
  
  -- Atualizar última validação
  UPDATE public.licenses 
  SET last_validation = NOW()
  WHERE id = license_record.id;
  
  -- Verificar se a licença está expirada
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'license_code', license_record.code,
      'expires_at', license_record.expires_at,
      'activated_at', license_record.activated_at,
      'days_remaining', 0,
      'message', 'Licença expirada',
      'requires_activation', false,
      'requires_renewal', true,
      'expired_at', license_record.expires_at,
      'timestamp', NOW()
    );
  END IF;
  
  -- Verificar se a licença está inativa
  IF NOT license_record.is_active THEN
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'license_code', license_record.code,
      'expires_at', license_record.expires_at,
      'activated_at', license_record.activated_at,
      'days_remaining', CASE 
        WHEN license_record.expires_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM license_record.expires_at - NOW())::INTEGER
      END,
      'message', 'Licença desativada',
      'requires_activation', true,
      'requires_renewal', false,
      'timestamp', NOW()
    );
  END IF;
  
  -- Licença válida e ativa
  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', true,
    'license_code', license_record.code,
    'expires_at', license_record.expires_at,
    'activated_at', license_record.activated_at,
    'days_remaining', CASE 
      WHEN license_record.expires_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM license_record.expires_at - NOW())::INTEGER
    END,
    'message', 'Licença ativa',
    'requires_activation', false,
    'requires_renewal', false,
    'timestamp', NOW()
  );
END;
$function$;