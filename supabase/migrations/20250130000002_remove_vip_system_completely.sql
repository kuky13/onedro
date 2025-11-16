-- Remover completamente o sistema VIP e corrigir referências restantes
-- Data: 2025-01-30

-- 1. REMOVER TABELA VIP_BACKUP (sistema VIP foi removido)
-- Dropar políticas RLS existentes da tabela vip_backup
DROP POLICY IF EXISTS "rls_vip_backup_select" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_insert" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_update" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_delete" ON public.vip_backup;

-- Dropar a tabela vip_backup completamente
DROP TABLE IF EXISTS public.vip_backup;

-- 2. DROPAR E RECRIAR FUNÇÕES PARA REMOVER VERIFICAÇÕES VIP
DROP FUNCTION IF EXISTS public.delete_service_order(uuid);
DROP FUNCTION IF EXISTS public.soft_delete_service_order(uuid);
DROP FUNCTION IF EXISTS public.restore_service_order(uuid);

-- 2.1. CORRIGIR FUNÇÃO DELETE_SERVICE_ORDER (remover verificação VIP)
CREATE OR REPLACE FUNCTION public.delete_service_order(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE service_orders
  SET 
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NULL
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());

  RETURN FOUND;
END;
$$;

-- 2.2. RECRIAR FUNÇÃO SOFT_DELETE_SERVICE_ORDER SEM VERIFICAÇÃO VIP
CREATE OR REPLACE FUNCTION public.soft_delete_service_order(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE service_orders
  SET 
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NULL
    AND ((owner_id = auth.uid()) OR public.is_current_user_admin());

  RETURN FOUND;
END;
$$;

-- 2.3. RECRIAR FUNÇÃO RESTORE_SERVICE_ORDER SEM VERIFICAÇÃO VIP
CREATE OR REPLACE FUNCTION public.restore_service_order(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas admins podem restaurar ordens deletadas
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem restaurar ordens deletadas';
  END IF;

  UPDATE service_orders
  SET 
    deleted_at = NULL,
    updated_at = NOW()
  WHERE id = p_id
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- Sistema VIP foi completamente removido do sistema
-- Todas as verificações de acesso agora usam apenas:
-- - public.is_current_user_admin() para verificar se é admin
-- - owner_id = auth.uid() para verificar se é o proprietário
-- - Não há mais verificações de service_orders_vip_enabled ou service_orders_beta_enabled