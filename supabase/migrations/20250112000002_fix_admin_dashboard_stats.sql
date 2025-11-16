-- Fix admin_get_dashboard_stats function - Remove is_active column references
-- Date: 2025-01-12
-- Description: Corrige a função admin_get_dashboard_stats removendo referências à coluna is_active que não existe

-- Replace the function to remove is_active references
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
        'admin_users', (SELECT COUNT(*) FROM user_profiles WHERE role = 'admin'),
        'total_service_orders', (SELECT COUNT(*) FROM service_orders WHERE deleted_at IS NULL),
        'deleted_service_orders', (SELECT COUNT(*) FROM service_orders WHERE deleted_at IS NOT NULL),
        'total_budgets', (SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL),
        'total_revenue', (SELECT COALESCE(SUM(total_price), 0) FROM service_orders WHERE deleted_at IS NULL),
        'recent_registrations', (
            SELECT COUNT(*) FROM user_profiles 
            WHERE created_at >= NOW() - INTERVAL '30 days'
        ),
        'recent_orders', (
            SELECT COUNT(*) FROM service_orders 
            WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL
        ),
        'active_licenses', (
            SELECT COUNT(*) FROM licenses 
            WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        ),
        'expired_licenses', (
            SELECT COUNT(*) FROM licenses 
            WHERE is_active = true AND expires_at <= NOW()
        ),
        'total_licenses', (SELECT COUNT(*) FROM licenses)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

-- Drop and recreate admin_get_all_users_detailed function to fix return type
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_search TEXT DEFAULT NULL,
    p_role_filter TEXT DEFAULT NULL,
    p_status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    role TEXT,
    license_status TEXT,
    license_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    service_orders_count BIGINT,
    budgets_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar usuários';
    END IF;
    
    RETURN QUERY
    SELECT 
        up.id,
        up.name,
        au.email,
        up.role,
        CASE 
            WHEN l.is_active = true AND (l.expires_at IS NULL OR l.expires_at > NOW()) THEN 'Ativa'
            WHEN l.is_active = true AND l.expires_at <= NOW() THEN 'Expirada'
            WHEN l.is_active = false THEN 'Inativa'
            ELSE 'Sem licença'
        END as license_status,
        l.expires_at as license_expires_at,
        up.created_at,
        au.last_sign_in_at,
        COALESCE(so_stats.orders_count, 0) as service_orders_count,
        COALESCE(b_stats.budgets_count, 0) as budgets_count
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    LEFT JOIN licenses l ON l.user_id = up.id AND l.is_active = true
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as orders_count
        FROM service_orders 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) so_stats ON so_stats.owner_id = up.id
    LEFT JOIN (
        SELECT created_by, COUNT(*) as budgets_count
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY created_by
    ) b_stats ON b_stats.created_by = up.id
    WHERE 
        (p_search IS NULL OR 
         up.name ILIKE '%' || p_search || '%' OR 
         au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
        AND (p_status_filter IS NULL OR 
             (p_status_filter = 'active' AND l.is_active = true AND (l.expires_at IS NULL OR l.expires_at > NOW())) OR
             (p_status_filter = 'inactive' AND (l.is_active = false OR l.expires_at <= NOW() OR l.id IS NULL)))
    ORDER BY up.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_get_dashboard_stats() IS 'Retorna estatísticas do dashboard administrativo. Não depende da coluna is_active em user_profiles.';
COMMENT ON FUNCTION admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT) IS 'Retorna lista detalhada de usuários para administradores. Usa status de licenças ao invés de is_active.';