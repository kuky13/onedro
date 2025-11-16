-- ========================================
-- SISTEMA ABRANGENTE DE LOGS ADMINISTRATIVOS
-- Consolida todos os logs do sistema em uma interface unificada
-- ========================================

-- 1. Função para buscar todos os logs do sistema de forma unificada
CREATE OR REPLACE FUNCTION public.admin_get_all_logs(
  p_table_filter TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id TEXT,
  table_source TEXT,
  log_type TEXT,
  admin_user_id UUID,
  admin_name TEXT,
  target_user_id UUID,
  target_name TEXT,
  action TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  additional_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar logs';
  END IF;

  RETURN QUERY
  WITH all_logs AS (
    -- 1. Admin Logs (logs administrativos principais)
    SELECT 
      al.id::TEXT as id,
      'admin_logs'::TEXT as table_source,
      'admin_action'::TEXT as log_type,
      al.admin_user_id,
      COALESCE(admin_profile.name, 'Admin Desconhecido') as admin_name,
      al.target_user_id,
      COALESCE(target_profile.name, 'Usuário Desconhecido') as target_name,
      al.action,
      al.details,
      al.created_at,
      jsonb_build_object(
        'source_table', 'admin_logs',
        'log_id', al.id
      ) as additional_info
    FROM public.admin_logs al
    LEFT JOIN public.user_profiles admin_profile ON al.admin_user_id = admin_profile.id
    LEFT JOIN public.user_profiles target_profile ON al.target_user_id = target_profile.id
    WHERE (p_table_filter IS NULL OR p_table_filter = 'admin_logs')

    UNION ALL

    -- 2. Budget Deletion Audit (auditoria de exclusão de orçamentos)
    SELECT 
      bda.id::TEXT as id,
      'budget_deletion_audit'::TEXT as table_source,
      'budget_deletion'::TEXT as log_type,
      bda.deleted_by as admin_user_id,
      COALESCE(admin_profile.name, 'Admin Desconhecido') as admin_name,
      NULL::UUID as target_user_id,
      'Sistema' as target_name,
      CONCAT('budget_deleted_', bda.deletion_type) as action,
      jsonb_build_object(
        'budget_id', bda.budget_id,
        'deletion_type', bda.deletion_type,
        'deletion_reason', bda.deletion_reason,
        'can_restore', bda.can_restore,
        'budget_data', bda.budget_data,
        'parts_data', bda.parts_data
      ) as details,
      bda.created_at,
      jsonb_build_object(
        'source_table', 'budget_deletion_audit',
        'budget_id', bda.budget_id,
        'deletion_type', bda.deletion_type
      ) as additional_info
    FROM public.budget_deletion_audit bda
    LEFT JOIN public.user_profiles admin_profile ON bda.deleted_by = admin_profile.id
    WHERE (p_table_filter IS NULL OR p_table_filter = 'budget_deletion_audit')

    UNION ALL

    -- 3. License Validation Audit (auditoria de validação de licenças)
    SELECT 
      lva.id::TEXT as id,
      'license_validation_audit'::TEXT as table_source,
      'license_validation'::TEXT as log_type,
      NULL::UUID as admin_user_id,
      'Sistema' as admin_name,
      lva.user_id as target_user_id,
      COALESCE(user_profile.name, 'Usuário Desconhecido') as target_name,
      'license_validation' as action,
      jsonb_build_object(
        'license_id', lva.license_id,
        'validation_result', lva.validation_result,
        'ip_address', lva.ip_address,
        'user_agent', lva.user_agent
      ) as details,
      lva.created_at,
      jsonb_build_object(
        'source_table', 'license_validation_audit',
        'license_id', lva.license_id,
        'ip_address', lva.ip_address
      ) as additional_info
    FROM license_validation_audit lva
    LEFT JOIN public.user_profiles user_profile ON lva.user_id = user_profile.id
    WHERE (p_table_filter IS NULL OR p_table_filter = 'license_validation_audit')

    UNION ALL

    -- 4. File Upload Audit (auditoria de upload de arquivos)
    SELECT 
      fua.id::TEXT as id,
      'file_upload_audit'::TEXT as table_source,
      'file_upload'::TEXT as log_type,
      NULL::UUID as admin_user_id,
      'Sistema' as admin_name,
      fua.user_id as target_user_id,
      COALESCE(user_profile.name, 'Usuário Desconhecido') as target_name,
      CONCAT('file_upload_', fua.upload_status) as action,
      jsonb_build_object(
        'bucket_id', fua.bucket_id,
        'file_name', fua.file_name,
        'file_size', fua.file_size,
        'mime_type', fua.mime_type,
        'upload_ip', fua.upload_ip,
        'user_agent', fua.user_agent,
        'upload_status', fua.upload_status,
        'security_scan_result', fua.security_scan_result
      ) as details,
      fua.created_at,
      jsonb_build_object(
        'source_table', 'file_upload_audit',
        'bucket_id', fua.bucket_id,
        'file_name', fua.file_name,
        'upload_status', fua.upload_status
      ) as additional_info
    FROM public.file_upload_audit fua
    LEFT JOIN public.user_profiles user_profile ON fua.user_id = user_profile.id
    WHERE (p_table_filter IS NULL OR p_table_filter = 'file_upload_audit')
  )
  SELECT * FROM all_logs
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- 2. Função para obter estatísticas dos logs
CREATE OR REPLACE FUNCTION public.admin_get_logs_statistics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  admin_logs_count INTEGER;
  budget_audit_count INTEGER;
  license_audit_count INTEGER;
  file_audit_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar estatísticas';
  END IF;

  -- Contar logs de cada tabela
  SELECT COUNT(*) INTO admin_logs_count FROM public.admin_logs;
  SELECT COUNT(*) INTO budget_audit_count FROM public.budget_deletion_audit;
  SELECT COUNT(*) INTO license_audit_count FROM license_validation_audit;
  SELECT COUNT(*) INTO file_audit_count FROM public.file_upload_audit;
  
  total_count := admin_logs_count + budget_audit_count + license_audit_count + file_audit_count;

  result := jsonb_build_object(
    'total_logs', total_count,
    'by_table', jsonb_build_object(
      'admin_logs', admin_logs_count,
      'budget_deletion_audit', budget_audit_count,
      'license_validation_audit', license_audit_count,
      'file_upload_audit', file_audit_count
    ),
    'last_updated', NOW()
  );

  RETURN result;
END;
$$;

-- 3. Função para deletar logs selecionados
CREATE OR REPLACE FUNCTION public.admin_delete_logs(
  p_table_name TEXT,
  p_log_ids TEXT[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem deletar logs';
  END IF;

  -- Validar nome da tabela
  IF p_table_name NOT IN ('admin_logs', 'budget_deletion_audit', 'license_validation_audit', 'file_upload_audit') THEN
    RAISE EXCEPTION 'Tabela de logs inválida: %', p_table_name;
  END IF;

  -- Se não foram especificados IDs, deletar todos os logs da tabela
  IF p_log_ids IS NULL OR array_length(p_log_ids, 1) = 0 THEN
    CASE p_table_name
      WHEN 'admin_logs' THEN
        DELETE FROM public.admin_logs;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'budget_deletion_audit' THEN
        DELETE FROM public.budget_deletion_audit;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'license_validation_audit' THEN
        DELETE FROM license_validation_audit;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'file_upload_audit' THEN
        DELETE FROM public.file_upload_audit;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END CASE;
  ELSE
    -- Deletar apenas os logs especificados
    CASE p_table_name
      WHEN 'admin_logs' THEN
        DELETE FROM public.admin_logs WHERE id::TEXT = ANY(p_log_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'budget_deletion_audit' THEN
        DELETE FROM public.budget_deletion_audit WHERE id::TEXT = ANY(p_log_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'license_validation_audit' THEN
        DELETE FROM license_validation_audit WHERE id::TEXT = ANY(p_log_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
      WHEN 'file_upload_audit' THEN
        DELETE FROM public.file_upload_audit WHERE id::TEXT = ANY(p_log_ids);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END CASE;
  END IF;

  -- Registrar a ação de limpeza de logs
  INSERT INTO public.admin_logs (admin_user_id, action, details)
  VALUES (
    auth.uid(),
    'logs_cleanup',
    jsonb_build_object(
      'table_name', p_table_name,
      'deleted_count', deleted_count,
      'log_ids', p_log_ids,
      'cleanup_type', CASE WHEN p_log_ids IS NULL THEN 'all' ELSE 'selective' END
    )
  );

  RETURN deleted_count;
END;
$$;

-- 4. Função para obter tipos de logs disponíveis
CREATE OR REPLACE FUNCTION public.admin_get_log_types()
RETURNS TABLE (
  table_name TEXT,
  display_name TEXT,
  description TEXT,
  log_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar tipos de logs';
  END IF;

  RETURN QUERY
  SELECT 
    'admin_logs'::TEXT as table_name,
    'Logs Administrativos'::TEXT as display_name,
    'Ações administrativas realizadas no sistema'::TEXT as description,
    (SELECT COUNT(*)::INTEGER FROM public.admin_logs) as log_count
  UNION ALL
  SELECT 
    'budget_deletion_audit'::TEXT as table_name,
    'Auditoria de Exclusão de Orçamentos'::TEXT as display_name,
    'Registro de orçamentos excluídos do sistema'::TEXT as description,
    (SELECT COUNT(*)::INTEGER FROM public.budget_deletion_audit) as log_count
  UNION ALL
  SELECT 
    'license_validation_audit'::TEXT as table_name,
    'Auditoria de Validação de Licenças'::TEXT as display_name,
    'Registro de validações de licenças de usuários'::TEXT as description,
    (SELECT COUNT(*)::INTEGER FROM license_validation_audit) as log_count
  UNION ALL
  SELECT 
    'file_upload_audit'::TEXT as table_name,
    'Auditoria de Upload de Arquivos'::TEXT as display_name,
    'Registro de uploads de arquivos no sistema'::TEXT as description,
    (SELECT COUNT(*)::INTEGER FROM public.file_upload_audit) as log_count;
END;
$$;

-- 5. Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION public.admin_get_all_logs(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_logs_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_logs(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_log_types() TO authenticated;

-- 6. Comentários para documentação
COMMENT ON FUNCTION public.admin_get_all_logs(TEXT, INTEGER, INTEGER) IS 'Busca logs de todas as tabelas de auditoria do sistema de forma unificada';
COMMENT ON FUNCTION public.admin_get_logs_statistics() IS 'Retorna estatísticas dos logs do sistema';
COMMENT ON FUNCTION public.admin_delete_logs(TEXT, TEXT[]) IS 'Deleta logs selecionados ou todos os logs de uma tabela específica';
COMMENT ON FUNCTION public.admin_get_log_types() IS 'Retorna os tipos de logs disponíveis no sistema';