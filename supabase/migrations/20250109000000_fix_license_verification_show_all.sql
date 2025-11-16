-- Modificar função get_user_license_status para mostrar todas as licenças
-- independente do status (ativa, inativa ou expirada)

CREATE OR REPLACE FUNCTION public.get_user_license_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  result JSONB;
BEGIN
  -- Allow public access for license verification
  
  -- Buscar QUALQUER licença do usuário (ativa ou inativa)
  -- Priorizar licenças ativas primeiro, depois as mais recentes
  SELECT * INTO license_record
  FROM public.licenses
  WHERE user_id = p_user_id 
  ORDER BY 
    is_active DESC,  -- Licenças ativas primeiro
    activated_at DESC NULLS LAST,  -- Depois por data de ativação
    created_at DESC  -- Por último, por data de criação
  LIMIT 1;
  
  IF license_record IS NULL THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença encontrada',
      'requires_activation', true,
      'requires_renewal', false
    );
  END IF;
  
  -- Verificar se a licença está expirada
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < NOW() THEN
    -- Atualizar última validação sem desativar a licença
    UPDATE public.licenses 
    SET last_validation = NOW()
    WHERE id = license_record.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'license_code', license_record.code,
      'expires_at', license_record.expires_at,
      'activated_at', license_record.activated_at,
      'is_active', license_record.is_active,
      'status', CASE 
        WHEN NOT license_record.is_active THEN 'inativa'
        ELSE 'expirada'
      END,
      'days_remaining', EXTRACT(DAY FROM license_record.expires_at - NOW())::INTEGER,
      'message', CASE 
        WHEN NOT license_record.is_active THEN 'Licença inativa e expirada'
        ELSE 'Licença expirada'
      END,
      'requires_activation', NOT license_record.is_active,
      'requires_renewal', true
    );
  END IF;
  
  -- Verificar se a licença está inativa (mas não expirada)
  IF NOT license_record.is_active THEN
    -- Atualizar última validação
    UPDATE public.licenses 
    SET last_validation = NOW()
    WHERE id = license_record.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'license_code', license_record.code,
      'expires_at', license_record.expires_at,
      'activated_at', license_record.activated_at,
      'is_active', false,
      'status', 'inativa',
      'days_remaining', CASE 
        WHEN license_record.expires_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM license_record.expires_at - NOW())::INTEGER
      END,
      'message', 'Licença inativa',
      'requires_activation', true,
      'requires_renewal', false
    );
  END IF;
  
  -- Atualizar última validação
  UPDATE public.licenses 
  SET last_validation = NOW()
  WHERE id = license_record.id;
  
  -- Licença válida e ativa
  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', true,
    'license_code', license_record.code,
    'expires_at', license_record.expires_at,
    'activated_at', license_record.activated_at,
    'is_active', true,
    'status', 'ativa',
    'days_remaining', CASE 
      WHEN license_record.expires_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM license_record.expires_at - NOW())::INTEGER
    END,
    'message', 'Licença ativa e válida',
    'requires_activation', false,
    'requires_renewal', false
  );
END;
$$;