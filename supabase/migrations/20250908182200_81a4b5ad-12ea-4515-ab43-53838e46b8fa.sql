-- Create the missing admin license management RPC functions

-- Function to get user license status (public access for verification)
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
  
  -- Buscar licença ativa do usuário
  SELECT * INTO license_record
  FROM public.licenses
  WHERE user_id = p_user_id 
  AND is_active = TRUE
  ORDER BY activated_at DESC
  LIMIT 1;
  
  IF license_record IS NULL THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença ativa encontrada',
      'requires_activation', true,
      'requires_renewal', false
    );
  END IF;
  
  -- Verificar se a licença está expirada
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < NOW() THEN
    -- Desativar licença expirada
    UPDATE public.licenses 
    SET is_active = FALSE, last_validation = NOW()
    WHERE id = license_record.id;
    
    RETURN jsonb_build_object(
      'has_license', true,
      'is_valid', false,
      'message', 'Licença expirada',
      'expired_at', license_record.expires_at,
      'requires_activation', false,
      'requires_renewal', true
    );
  END IF;
  
  -- Atualizar última validação
  UPDATE public.licenses 
  SET last_validation = NOW()
  WHERE id = license_record.id;
  
  -- Licença válida
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
    'message', 'Licença ativa e válida',
    'requires_activation', false,
    'requires_renewal', false
  );
END;
$$;

-- Function to update license (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_license(
  p_license_id uuid,
  p_license_code text DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
  updated_license RECORD;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Obter valores antigos
  SELECT to_jsonb(l.*) INTO old_values
  FROM public.licenses l
  WHERE l.id = p_license_id;

  IF old_values IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Licença não encontrada');
  END IF;

  -- Atualizar licença
  UPDATE public.licenses
  SET 
    code = COALESCE(p_license_code, code),
    expires_at = COALESCE(p_expires_at, expires_at),
    is_active = COALESCE(p_is_active, is_active),
    notes = COALESCE(p_notes, notes),
    last_validation = NOW()
  WHERE id = p_license_id
  RETURNING * INTO updated_license;

  -- Obter novos valores
  SELECT to_jsonb(updated_license.*) INTO new_values;

  -- Registrar no histórico
  INSERT INTO public.license_history (
    license_id, admin_id, action_type, old_values, new_values, notes
  ) VALUES (
    p_license_id, auth.uid(), 'update', old_values, new_values, 'License updated via admin panel'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença atualizada com sucesso',
    'license', new_values
  );
END;
$$;

-- Function to extend license (admin only)
CREATE OR REPLACE FUNCTION public.admin_extend_license(
  p_license_id uuid,
  p_extend_days integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
  updated_license RECORD;
  new_expires_at timestamp with time zone;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Obter valores antigos
  SELECT to_jsonb(l.*), l.expires_at INTO old_values, new_expires_at
  FROM public.licenses l
  WHERE l.id = p_license_id;

  IF old_values IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Licença não encontrada');
  END IF;

  -- Calcular nova data de expiração
  IF new_expires_at IS NULL THEN
    new_expires_at := NOW() + (p_extend_days || ' days')::interval;
  ELSE
    new_expires_at := new_expires_at + (p_extend_days || ' days')::interval;
  END IF;

  -- Atualizar licença
  UPDATE public.licenses
  SET 
    expires_at = new_expires_at,
    is_active = true,
    last_validation = NOW()
  WHERE id = p_license_id
  RETURNING * INTO updated_license;

  -- Obter novos valores
  SELECT to_jsonb(updated_license.*) INTO new_values;

  -- Registrar no histórico
  INSERT INTO public.license_history (
    license_id, admin_id, action_type, old_values, new_values, 
    notes
  ) VALUES (
    p_license_id, auth.uid(), 'extend', old_values, new_values, 
    'License extended by ' || p_extend_days || ' days'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença estendida por ' || p_extend_days || ' dias',
    'license', new_values
  );
END;
$$;

-- Function to transfer license (admin only)
CREATE OR REPLACE FUNCTION public.admin_transfer_license(
  p_license_id uuid,
  p_new_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_values jsonb;
  new_values jsonb;
  updated_license RECORD;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  -- Verificar se o novo usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário de destino não encontrado');
  END IF;

  -- Obter valores antigos
  SELECT to_jsonb(l.*) INTO old_values
  FROM public.licenses l
  WHERE l.id = p_license_id;

  IF old_values IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Licença não encontrada');
  END IF;

  -- Transferir licença
  UPDATE public.licenses
  SET 
    user_id = p_new_user_id,
    last_validation = NOW()
  WHERE id = p_license_id
  RETURNING * INTO updated_license;

  -- Obter novos valores
  SELECT to_jsonb(updated_license.*) INTO new_values;

  -- Registrar no histórico
  INSERT INTO public.license_history (
    license_id, admin_id, action_type, old_values, new_values, 
    notes
  ) VALUES (
    p_license_id, auth.uid(), 'transfer', old_values, new_values, 
    'License transferred to user ' || p_new_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Licença transferida com sucesso',
    'license', new_values
  );
END;
$$;

-- Function to get all users for admin (for transfer dropdown)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  role text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem listar usuários';
  END IF;

  RETURN QUERY
  SELECT 
    up.id,
    up.name,
    au.email,
    up.role,
    up.created_at
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id
  ORDER BY up.created_at DESC;
END;
$$;