-- Corrigir funções que ainda usam admin_id em vez de admin_user_id na tabela license_history
-- Esta migração resolve o erro: column "admin_id" of relation "license_history" does not exist

-- Primeiro, remover as funções existentes para evitar conflitos
DROP FUNCTION IF EXISTS public.admin_update_license(uuid, text, timestamp with time zone, boolean, text);
DROP FUNCTION IF EXISTS public.admin_extend_license(uuid, integer);
DROP FUNCTION IF EXISTS public.admin_transfer_license(uuid, uuid);

-- Function to update license (admin only) - CORRIGIDA
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

  -- Registrar no histórico - CORRIGIDO: admin_id -> admin_user_id
  INSERT INTO public.license_history (
    license_id, admin_user_id, action_type, old_values, new_values, notes
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

-- Function to extend license (admin only) - CORRIGIDA
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

  -- Registrar no histórico - CORRIGIDO: admin_id -> admin_user_id
  INSERT INTO public.license_history (
    license_id, admin_user_id, action_type, old_values, new_values, 
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

-- Function to transfer license (admin only) - CORRIGIDA
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

  -- Registrar no histórico - CORRIGIDO: admin_id -> admin_user_id
  INSERT INTO public.license_history (
    license_id, admin_user_id, action_type, old_values, new_values, 
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

-- Corrigir índices que ainda referenciam admin_id
DROP INDEX IF EXISTS public.idx_license_history_admin_id;
CREATE INDEX IF NOT EXISTS idx_license_history_admin_user_id ON public.license_history(admin_user_id);

-- Comentário de finalização
COMMENT ON FUNCTION public.admin_update_license IS 'Função corrigida para usar admin_user_id em vez de admin_id na tabela license_history';
COMMENT ON FUNCTION public.admin_extend_license IS 'Função corrigida para usar admin_user_id em vez de admin_id na tabela license_history';
COMMENT ON FUNCTION public.admin_transfer_license IS 'Função corrigida para usar admin_user_id em vez de admin_id na tabela license_history';