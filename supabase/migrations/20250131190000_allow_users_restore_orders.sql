-- Permitir que usuários restaurem suas próprias ordens de serviço da lixeira
-- Data: 2025-01-31
-- Descrição: Modificar função restore_service_order para permitir que proprietários restaurem suas ordens

-- Recriar função restore_service_order para permitir proprietários
CREATE OR REPLACE FUNCTION public.restore_service_order(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário é admin ou proprietário da ordem
  IF NOT (public.is_current_user_admin() OR 
          EXISTS (SELECT 1 FROM service_orders WHERE id = p_id AND owner_id = auth.uid())) THEN
    RAISE EXCEPTION 'Acesso negado: você só pode restaurar suas próprias ordens de serviço';
  END IF;

  UPDATE service_orders
  SET 
    deleted_at = NULL,
    updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NOT NULL
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());

  RETURN FOUND;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.restore_service_order IS 'Permite que administradores e proprietários restaurem ordens de serviço da lixeira';