-- ==================================================================
-- CORREÇÃO DE VULNERABILIDADES RLS RESTANTES
-- Ativar RLS e criar políticas para tabelas vulneráveis identificadas
-- ==================================================================

-- 1. ATIVAR RLS NAS TABELAS VULNERÁVEIS
ALTER TABLE public.license_expiration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sequence_control_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sequence_control_service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_backup ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICAS RLS PARA LICENSE_EXPIRATION_LOG
-- Apenas admins podem ver logs de expiração de licenças
CREATE POLICY "rls_license_expiration_log_select" ON public.license_expiration_log
FOR SELECT USING (
  public.is_current_user_admin()
);

CREATE POLICY "rls_license_expiration_log_insert" ON public.license_expiration_log
FOR INSERT WITH CHECK (
  public.is_current_user_admin()
);

CREATE POLICY "rls_license_expiration_log_update" ON public.license_expiration_log
FOR UPDATE USING (
  public.is_current_user_admin()
);

CREATE POLICY "rls_license_expiration_log_delete" ON public.license_expiration_log
FOR DELETE USING (
  public.is_current_user_admin()
);

-- 3. POLÍTICAS RLS PARA USER_SEQUENCE_CONTROL_BUDGETS
-- Usuários podem ver apenas seus próprios controles de sequência
CREATE POLICY "rls_user_sequence_control_budgets_select" ON public.user_sequence_control_budgets
FOR SELECT USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

CREATE POLICY "rls_user_sequence_control_budgets_insert" ON public.user_sequence_control_budgets
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND auth.uid() IS NOT NULL
);

CREATE POLICY "rls_user_sequence_control_budgets_update" ON public.user_sequence_control_budgets
FOR UPDATE USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

CREATE POLICY "rls_user_sequence_control_budgets_delete" ON public.user_sequence_control_budgets
FOR DELETE USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

-- 4. POLÍTICAS RLS PARA USER_SEQUENCE_CONTROL_SERVICE_ORDERS
-- Usuários podem ver apenas seus próprios controles de sequência
CREATE POLICY "rls_user_sequence_control_service_orders_select" ON public.user_sequence_control_service_orders
FOR SELECT USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

CREATE POLICY "rls_user_sequence_control_service_orders_insert" ON public.user_sequence_control_service_orders
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND auth.uid() IS NOT NULL
);

CREATE POLICY "rls_user_sequence_control_service_orders_update" ON public.user_sequence_control_service_orders
FOR UPDATE USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

CREATE POLICY "rls_user_sequence_control_service_orders_delete" ON public.user_sequence_control_service_orders
FOR DELETE USING (
  user_id = auth.uid() OR public.is_current_user_admin()
);

-- 5. REMOVER TABELA VIP_BACKUP (sistema VIP foi removido)
-- Dropar políticas RLS existentes da tabela vip_backup
DROP POLICY IF EXISTS "rls_vip_backup_select" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_insert" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_update" ON public.vip_backup;
DROP POLICY IF EXISTS "rls_vip_backup_delete" ON public.vip_backup;

-- Dropar a tabela vip_backup completamente
DROP TABLE IF EXISTS public.vip_backup;

-- 6. VERIFICAR PERMISSÕES PARA ROLES ANON E AUTHENTICATED
-- Garantir que as roles tenham acesso às tabelas necessárias

-- Conceder permissões SELECT para usuários autenticados nas tabelas de controle de sequência
GRANT SELECT ON public.user_sequence_control_budgets TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_sequence_control_budgets TO authenticated;

GRANT SELECT ON public.user_sequence_control_service_orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_sequence_control_service_orders TO authenticated;

-- Logs de expiração e backup VIP são apenas para admins (sem permissões adicionais para anon/authenticated)

-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON POLICY "rls_license_expiration_log_select" ON public.license_expiration_log IS 'Apenas administradores podem visualizar logs de expiração de licenças';
COMMENT ON POLICY "rls_user_sequence_control_budgets_select" ON public.user_sequence_control_budgets IS 'Usuários podem ver apenas seus próprios controles de sequência de orçamentos';
COMMENT ON POLICY "rls_user_sequence_control_service_orders_select" ON public.user_sequence_control_service_orders IS 'Usuários podem ver apenas seus próprios controles de sequência de ordens de serviço';
COMMENT ON POLICY "rls_vip_backup_select" ON public.vip_backup IS 'Apenas administradores podem acessar backups VIP';

-- 8. VALIDAÇÃO FINAL
-- Esta função já existe, mas vamos garantir que está disponível
CREATE OR REPLACE FUNCTION public.validate_rls_security()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER,
  security_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    t.rowsecurity::BOOLEAN,
    COALESCE(p.policy_count, 0)::INTEGER,
    CASE 
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'SEGURO'
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS ATIVO SEM POLÍTICAS'
      ELSE 'VULNERÁVEL - RLS DESABILITADO'
    END::TEXT
  FROM pg_tables t
  LEFT JOIN (
    SELECT tablename, COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON t.tablename = p.tablename
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

COMMENT ON FUNCTION public.validate_rls_security() IS 'Valida o status de segurança RLS de todas as tabelas após correções';