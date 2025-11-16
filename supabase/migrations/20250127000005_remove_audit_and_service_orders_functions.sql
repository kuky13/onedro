-- Remove audit and service orders functions from super admin panel
-- This migration removes the RPC functions related to audit logs and service orders

-- Drop the audit logs function
DROP FUNCTION IF EXISTS admin_get_audit_logs(INTEGER, INTEGER, TEXT, UUID, DATE, DATE);

-- Drop the user service orders function  
DROP FUNCTION IF EXISTS admin_get_user_service_orders(UUID, BOOLEAN, TEXT, DATE, DATE, INTEGER, INTEGER);

-- Update admin_get_all_users_detailed to remove service_orders_count
CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_search TEXT DEFAULT NULL,
    p_role_filter TEXT DEFAULT NULL,
    p_status_filter TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    total_budgets BIGINT,
    total_revenue NUMERIC
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
        up.is_active,
        up.created_at,
        au.last_sign_in_at as last_login,
        COALESCE(budget_stats.budgets_count, 0) as total_budgets,
        COALESCE(budget_stats.total_revenue, 0) as total_revenue
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    LEFT JOIN (
        SELECT 
            owner_id,
            COUNT(*) as budgets_count,
            SUM(total_price) as total_revenue
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) budget_stats ON up.id = budget_stats.owner_id
    WHERE 
        (p_search IS NULL OR 
         up.name ILIKE '%' || p_search || '%' OR 
         au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
        AND (p_status_filter IS NULL OR 
             (p_status_filter = 'active' AND up.is_active = true) OR
             (p_status_filter = 'inactive' AND up.is_active = false))
    ORDER BY up.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Update admin_get_dashboard_stats to remove service order statistics
CREATE OR REPLACE FUNCTION admin_get_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSON;
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar estatísticas';
    END IF;
    
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM user_profiles),
        'active_users', (SELECT COUNT(*) FROM user_profiles WHERE is_active = true),
        'inactive_users', (SELECT COUNT(*) FROM user_profiles WHERE is_active = false),
        'admin_users', (SELECT COUNT(*) FROM user_profiles WHERE role = 'admin'),
        'total_budgets', (SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL),
        'deleted_budgets', (SELECT COUNT(*) FROM budgets WHERE deleted_at IS NOT NULL),
        'total_revenue', (SELECT COALESCE(SUM(total_price), 0) FROM budgets WHERE deleted_at IS NULL),
        'recent_registrations', (
            SELECT COUNT(*) FROM user_profiles 
            WHERE created_at >= NOW() - INTERVAL '30 days'
        ),
        'recent_budgets', (
            SELECT COUNT(*) FROM budgets 
            WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL
        ),
        'budgets_growth_percentage', (
            WITH current_month AS (
                SELECT COUNT(*) as current_count
                FROM budgets 
                WHERE created_at >= date_trunc('month', NOW()) 
                AND deleted_at IS NULL
            ),
            previous_month AS (
                SELECT COUNT(*) as previous_count
                FROM budgets 
                WHERE created_at >= date_trunc('month', NOW() - INTERVAL '1 month')
                AND created_at < date_trunc('month', NOW())
                AND deleted_at IS NULL
            )
            SELECT 
                CASE 
                    WHEN pm.previous_count = 0 THEN 0
                    ELSE ROUND(((cm.current_count - pm.previous_count)::DECIMAL / pm.previous_count) * 100, 2)
                END
            FROM current_month cm, previous_month pm
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

-- Update admin_delete_user_completely to remove service_orders and audit_logs references
CREATE OR REPLACE FUNCTION admin_delete_user_completely(
    p_user_id UUID,
    p_confirmation_code TEXT,
    p_delete_auth_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_deleted_records JSON;
    v_user_profile_deleted BOOLEAN := false;
    v_transactions_deleted INTEGER := 0;
    v_files_deleted INTEGER := 0;
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;
    
    -- Verificar código de confirmação
    IF p_confirmation_code != 'DELETE_USER_PERMANENTLY' THEN
        RAISE EXCEPTION 'Código de confirmação inválido';
    END IF;
    
    v_admin_id := auth.uid();
    
    -- Deletar transações relacionadas
    DELETE FROM transactions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_transactions_deleted = ROW_COUNT;
    
    -- Deletar arquivos relacionados
    DELETE FROM user_files WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_files_deleted = ROW_COUNT;
    
    -- Deletar perfil do usuário
    DELETE FROM user_profiles WHERE id = p_user_id;
    GET DIAGNOSTICS v_user_profile_deleted = FOUND;
    
    -- Deletar usuário do auth se solicitado
    IF p_delete_auth_user THEN
        PERFORM auth.admin_delete_user(p_user_id);
    END IF;
    
    -- Construir resposta
    v_deleted_records := json_build_object(
        'user_profile', v_user_profile_deleted,
        'transactions', v_transactions_deleted,
        'files', v_files_deleted
    );
    
    -- Log da ação usando a estrutura existente
    INSERT INTO admin_logs (
        admin_user_id, action, target_user_id, details,
        action_type, target_table, target_id, new_values, created_at
    ) VALUES (
        v_admin_id, 'DELETE_USER_COMPLETELY', p_user_id, v_deleted_records,
        'DELETE_USER_COMPLETELY', 'user_profiles', p_user_id, v_deleted_records, NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'deleted_data', v_deleted_records,
        'message', 'Usuário excluído completamente do sistema'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro usando a estrutura existente
        INSERT INTO admin_logs (
            admin_user_id, action, target_user_id, details,
            action_type, target_table, target_id, new_values, created_at
        ) VALUES (
            auth.uid(), 'DELETE_USER_ERROR', p_user_id, 
            json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE),
            'DELETE_USER_ERROR', 'user_profiles', p_user_id,
            json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE), NOW()
        );
        
        RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
END;
$$;

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user_completely TO authenticated;

-- Add comment to document the changes
COMMENT ON FUNCTION admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Retorna lista detalhada de usuários para super administradores. Versão atualizada sem service_orders_count.';
COMMENT ON FUNCTION admin_get_dashboard_stats() IS 'Retorna estatísticas do dashboard administrativo. Versão atualizada sem estatísticas de service orders.';
COMMENT ON FUNCTION admin_delete_user_completely(UUID, TEXT, BOOLEAN) IS 'Exclui usuário completamente do sistema. Versão atualizada sem referências a service_orders e audit_logs.';