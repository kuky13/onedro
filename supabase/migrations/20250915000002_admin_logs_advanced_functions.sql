-- Migração para implementar funcionalidades avançadas de logs administrativos
-- Criação da tabela file_upload_audit e funções RPC necessárias

-- Criar tabela file_upload_audit se não existir
CREATE TABLE IF NOT EXISTS public.file_upload_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    upload_path TEXT,
    upload_status TEXT CHECK (upload_status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na tabela file_upload_audit
ALTER TABLE public.file_upload_audit ENABLE ROW LEVEL SECURITY;

-- Política RLS para file_upload_audit
CREATE POLICY "Admins can view all file upload audits" ON public.file_upload_audit
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Função para obter todos os logs unificados
CREATE OR REPLACE FUNCTION public.admin_get_all_logs(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_log_type TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    log_type TEXT,
    user_id UUID,
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ,
    user_email TEXT,
    user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar logs';
    END IF;

    RETURN QUERY
    WITH unified_logs AS (
        -- Admin logs
        SELECT 
            al.id,
            'admin'::TEXT as log_type,
            al.admin_user_id as user_id,
            al.action,
            al.details,
            al.created_at,
            au.email as user_email,
            COALESCE(up.full_name, au.email) as user_name
        FROM public.admin_logs al
        LEFT JOIN auth.users au ON al.admin_user_id = au.id
        LEFT JOIN public.user_profiles up ON al.admin_user_id = up.user_id
        
        UNION ALL
        
        -- Budget deletion audit
        SELECT 
            bda.id,
            'budget_deletion'::TEXT as log_type,
            bda.deleted_by as user_id,
            CONCAT('budget_', bda.deletion_type, '_deletion') as action,
            jsonb_build_object(
                'budget_id', bda.budget_id,
                'deletion_reason', bda.deletion_reason,
                'can_restore', bda.can_restore
            ) as details,
            bda.created_at,
            au.email as user_email,
            COALESCE(up.full_name, au.email) as user_name
        FROM public.budget_deletion_audit bda
        LEFT JOIN auth.users au ON bda.deleted_by = au.id
        LEFT JOIN public.user_profiles up ON bda.deleted_by = up.user_id
        
        UNION ALL
        
        -- License validation audit
        SELECT 
            lva.id,
            'license_validation'::TEXT as log_type,
            lva.user_id,
            lva.event_type as action,
            jsonb_build_object(
                'license_id', lva.license_id,
                'success', lva.success,
                'error_message', lva.error_message,
                'ip_address', lva.ip_address
            ) as details,
            lva.created_at,
            au.email as user_email,
            COALESCE(up.full_name, au.email) as user_name
        FROM public.license_validation_audit lva
        LEFT JOIN auth.users au ON lva.user_id = au.id
        LEFT JOIN public.user_profiles up ON lva.user_id = up.user_id
        
        UNION ALL
        
        -- File upload audit
        SELECT 
            fua.id,
            'file_upload'::TEXT as log_type,
            fua.user_id,
            CONCAT('file_upload_', fua.upload_status) as action,
            jsonb_build_object(
                'file_name', fua.file_name,
                'file_size', fua.file_size,
                'file_type', fua.file_type,
                'upload_path', fua.upload_path,
                'error_message', fua.error_message
            ) as details,
            fua.created_at,
            au.email as user_email,
            COALESCE(up.full_name, au.email) as user_name
        FROM public.file_upload_audit fua
        LEFT JOIN auth.users au ON fua.user_id = au.id
        LEFT JOIN public.user_profiles up ON fua.user_id = up.user_id
    )
    SELECT 
        ul.id,
        ul.log_type,
        ul.user_id,
        ul.action,
        ul.details,
        ul.created_at,
        ul.user_email,
        ul.user_name
    FROM unified_logs ul
    WHERE 
        (p_log_type IS NULL OR ul.log_type = p_log_type)
        AND (p_start_date IS NULL OR ul.created_at >= p_start_date)
        AND (p_end_date IS NULL OR ul.created_at <= p_end_date)
    ORDER BY ul.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Função para obter estatísticas dos logs
CREATE OR REPLACE FUNCTION public.admin_get_logs_statistics()
RETURNS TABLE (
    total_logs BIGINT,
    admin_logs BIGINT,
    budget_deletion_logs BIGINT,
    license_validation_logs BIGINT,
    file_upload_logs BIGINT,
    logs_today BIGINT,
    logs_this_week BIGINT,
    logs_this_month BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar estatísticas';
    END IF;

    RETURN QUERY
    WITH log_counts AS (
        SELECT 
            (SELECT COUNT(*) FROM public.admin_logs) as admin_count,
            (SELECT COUNT(*) FROM public.budget_deletion_audit) as budget_count,
            (SELECT COUNT(*) FROM public.license_validation_audit) as license_count,
            (SELECT COUNT(*) FROM public.file_upload_audit) as file_count
    ),
    time_counts AS (
        SELECT 
            (
                SELECT COUNT(*) FROM (
                    SELECT created_at FROM public.admin_logs WHERE created_at >= CURRENT_DATE
                    UNION ALL
                    SELECT created_at FROM public.budget_deletion_audit WHERE created_at >= CURRENT_DATE
                    UNION ALL
                    SELECT created_at FROM public.license_validation_audit WHERE created_at >= CURRENT_DATE
                    UNION ALL
                    SELECT created_at FROM public.file_upload_audit WHERE created_at >= CURRENT_DATE
                ) today_logs
            ) as today_count,
            (
                SELECT COUNT(*) FROM (
                    SELECT created_at FROM public.admin_logs WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.budget_deletion_audit WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.license_validation_audit WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.file_upload_audit WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
                ) week_logs
            ) as week_count,
            (
                SELECT COUNT(*) FROM (
                    SELECT created_at FROM public.admin_logs WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.budget_deletion_audit WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.license_validation_audit WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
                    UNION ALL
                    SELECT created_at FROM public.file_upload_audit WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
                ) month_logs
            ) as month_count
    )
    SELECT 
        (lc.admin_count + lc.budget_count + lc.license_count + lc.file_count) as total_logs,
        lc.admin_count as admin_logs,
        lc.budget_count as budget_deletion_logs,
        lc.license_count as license_validation_logs,
        lc.file_count as file_upload_logs,
        tc.today_count as logs_today,
        tc.week_count as logs_this_week,
        tc.month_count as logs_this_month
    FROM log_counts lc, time_counts tc;
END;
$$;

-- Função para obter tipos de logs disponíveis
CREATE OR REPLACE FUNCTION public.admin_get_log_types()
RETURNS TABLE (
    log_type TEXT,
    description TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar tipos de logs';
    END IF;

    RETURN QUERY
    SELECT 
        'admin'::TEXT as log_type,
        'Logs de ações administrativas'::TEXT as description,
        (SELECT COUNT(*) FROM public.admin_logs)::BIGINT as count
    UNION ALL
    SELECT 
        'budget_deletion'::TEXT as log_type,
        'Logs de exclusão de orçamentos'::TEXT as description,
        (SELECT COUNT(*) FROM public.budget_deletion_audit)::BIGINT as count
    UNION ALL
    SELECT 
        'license_validation'::TEXT as log_type,
        'Logs de validação de licenças'::TEXT as description,
        (SELECT COUNT(*) FROM public.license_validation_audit)::BIGINT as count
    UNION ALL
    SELECT 
        'file_upload'::TEXT as log_type,
        'Logs de upload de arquivos'::TEXT as description,
        (SELECT COUNT(*) FROM public.file_upload_audit)::BIGINT as count;
END;
$$;

-- Função para deletar logs em massa
CREATE OR REPLACE FUNCTION public.admin_delete_logs(
    p_log_type TEXT DEFAULT NULL,
    p_log_ids UUID[] DEFAULT NULL,
    p_older_than_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
    deleted_count INTEGER,
    log_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_deleted INTEGER := 0;
    budget_deleted INTEGER := 0;
    license_deleted INTEGER := 0;
    file_deleted INTEGER := 0;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Verificar se o usuário é admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem deletar logs';
    END IF;

    -- Calcular data de corte se especificada
    IF p_older_than_days IS NOT NULL THEN
        cutoff_date := NOW() - INTERVAL '1 day' * p_older_than_days;
    END IF;

    -- Deletar por IDs específicos
    IF p_log_ids IS NOT NULL AND array_length(p_log_ids, 1) > 0 THEN
        -- Deletar admin logs
        IF p_log_type IS NULL OR p_log_type = 'admin' THEN
            DELETE FROM public.admin_logs WHERE id = ANY(p_log_ids);
            GET DIAGNOSTICS admin_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar budget deletion audit
        IF p_log_type IS NULL OR p_log_type = 'budget_deletion' THEN
            DELETE FROM public.budget_deletion_audit WHERE id = ANY(p_log_ids);
            GET DIAGNOSTICS budget_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar license validation audit
        IF p_log_type IS NULL OR p_log_type = 'license_validation' THEN
            DELETE FROM public.license_validation_audit WHERE id = ANY(p_log_ids);
            GET DIAGNOSTICS license_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar file upload audit
        IF p_log_type IS NULL OR p_log_type = 'file_upload' THEN
            DELETE FROM public.file_upload_audit WHERE id = ANY(p_log_ids);
            GET DIAGNOSTICS file_deleted = ROW_COUNT;
        END IF;
    
    -- Deletar por data
    ELSIF cutoff_date IS NOT NULL THEN
        -- Deletar admin logs antigos
        IF p_log_type IS NULL OR p_log_type = 'admin' THEN
            DELETE FROM public.admin_logs WHERE created_at < cutoff_date;
            GET DIAGNOSTICS admin_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar budget deletion audit antigos
        IF p_log_type IS NULL OR p_log_type = 'budget_deletion' THEN
            DELETE FROM public.budget_deletion_audit WHERE created_at < cutoff_date;
            GET DIAGNOSTICS budget_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar license validation audit antigos
        IF p_log_type IS NULL OR p_log_type = 'license_validation' THEN
            DELETE FROM public.license_validation_audit WHERE created_at < cutoff_date;
            GET DIAGNOSTICS license_deleted = ROW_COUNT;
        END IF;
        
        -- Deletar file upload audit antigos
        IF p_log_type IS NULL OR p_log_type = 'file_upload' THEN
            DELETE FROM public.file_upload_audit WHERE created_at < cutoff_date;
            GET DIAGNOSTICS file_deleted = ROW_COUNT;
        END IF;
    
    -- Deletar todos os logs de um tipo específico
    ELSIF p_log_type IS NOT NULL THEN
        IF p_log_type = 'admin' THEN
            DELETE FROM public.admin_logs;
            GET DIAGNOSTICS admin_deleted = ROW_COUNT;
        ELSIF p_log_type = 'budget_deletion' THEN
            DELETE FROM public.budget_deletion_audit;
            GET DIAGNOSTICS budget_deleted = ROW_COUNT;
        ELSIF p_log_type = 'license_validation' THEN
            DELETE FROM public.license_validation_audit;
            GET DIAGNOSTICS license_deleted = ROW_COUNT;
        ELSIF p_log_type = 'file_upload' THEN
            DELETE FROM public.file_upload_audit;
            GET DIAGNOSTICS file_deleted = ROW_COUNT;
        END IF;
    
    ELSE
        RAISE EXCEPTION 'Parâmetros inválidos: especifique log_ids, older_than_days ou log_type';
    END IF;

    -- Retornar resultados
    IF admin_deleted > 0 THEN
        RETURN QUERY SELECT admin_deleted, 'admin'::TEXT;
    END IF;
    
    IF budget_deleted > 0 THEN
        RETURN QUERY SELECT budget_deleted, 'budget_deletion'::TEXT;
    END IF;
    
    IF license_deleted > 0 THEN
        RETURN QUERY SELECT license_deleted, 'license_validation'::TEXT;
    END IF;
    
    IF file_deleted > 0 THEN
        RETURN QUERY SELECT file_deleted, 'file_upload'::TEXT;
    END IF;
    
    -- Se nenhum log foi deletado
    IF admin_deleted = 0 AND budget_deleted = 0 AND license_deleted = 0 AND file_deleted = 0 THEN
        RETURN QUERY SELECT 0, 'none'::TEXT;
    END IF;
END;
$$;

-- Conceder permissões para as funções
GRANT EXECUTE ON FUNCTION public.admin_get_all_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_logs_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_log_types TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_logs TO authenticated;

-- Conceder permissões para a tabela file_upload_audit
GRANT ALL PRIVILEGES ON public.file_upload_audit TO authenticated;
GRANT ALL PRIVILEGES ON public.file_upload_audit TO anon;

-- Comentários nas funções
COMMENT ON FUNCTION public.admin_get_all_logs IS 'Obtém todos os logs unificados do sistema com filtros opcionais';
COMMENT ON FUNCTION public.admin_get_logs_statistics IS 'Obtém estatísticas dos logs do sistema';
COMMENT ON FUNCTION public.admin_get_log_types IS 'Obtém os tipos de logs disponíveis no sistema';
COMMENT ON FUNCTION public.admin_delete_logs IS 'Deleta logs em massa com base em critérios específicos';
COMMENT ON TABLE public.file_upload_audit IS 'Auditoria de uploads de arquivos para monitoramento de segurança';