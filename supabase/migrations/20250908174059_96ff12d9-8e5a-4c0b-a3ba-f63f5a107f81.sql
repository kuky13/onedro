-- Corrigir a função get_user_license_status
CREATE OR REPLACE FUNCTION get_user_license_status(p_user_id UUID)
RETURNS TABLE (
  has_license BOOLEAN,
  is_valid BOOLEAN,
  license_code TEXT,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  days_remaining INTEGER,
  message TEXT,
  requires_activation BOOLEAN,
  requires_renewal BOOLEAN,
  expired_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  license_record RECORD;
  current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Buscar a licença ativa mais recente do usuário
  SELECT * INTO license_record
  FROM licenses
  WHERE user_id = p_user_id
    AND is_active = true
  ORDER BY activated_at DESC
  LIMIT 1;

  -- Se não encontrar licença ativa
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false as has_license,
      false as is_valid,
      ''::TEXT as license_code,
      NULL::TIMESTAMPTZ as expires_at,
      NULL::TIMESTAMPTZ as activated_at,
      NULL::INTEGER as days_remaining,
      'Nenhuma licença ativa encontrada'::TEXT as message,
      true as requires_activation,
      false as requires_renewal,
      NULL::TIMESTAMPTZ as expired_at,
      current_time as timestamp;
    RETURN;
  END IF;

  -- Atualizar last_validation
  UPDATE licenses 
  SET last_validation = current_time 
  WHERE id = license_record.id;

  -- Verificar se a licença expirou
  IF license_record.expires_at <= current_time THEN
    RETURN QUERY SELECT
      true as has_license,
      false as is_valid,
      license_record.code as license_code,
      license_record.expires_at,
      license_record.activated_at,
      0 as days_remaining,
      'Licença expirada'::TEXT as message,
      false as requires_activation,
      true as requires_renewal,
      license_record.expires_at as expired_at,
      current_time as timestamp;
    RETURN;
  END IF;

  -- Licença válida
  RETURN QUERY SELECT
    true as has_license,
    true as is_valid,
    license_record.code as license_code,
    license_record.expires_at,
    license_record.activated_at,
    EXTRACT(DAYS FROM (license_record.expires_at - current_time))::INTEGER as days_remaining,
    'Licença ativa e válida'::TEXT as message,
    false as requires_activation,
    false as requires_renewal,
    NULL::TIMESTAMPTZ as expired_at,
    current_time as timestamp;
END;
$$;