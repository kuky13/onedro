-- Force drop all versions of admin_get_all_users_detailed function

-- Drop all possible function signatures
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER) CASCADE;

-- Drop by name (all overloads)
DROP FUNCTION IF EXISTS admin_get_all_users_detailed CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed CASCADE;

-- Create the definitive version that works with the frontend
CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_search text DEFAULT NULL,
    p_role_filter text DEFAULT NULL,
    p_status_filter text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    email text,
    role text,
    is_active boolean,
    created_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    service_orders_count bigint,
    budgets_count bigint
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
        -- Use license status instead of up.is_active (which doesn't exist)
        CASE 
            WHEN l.id IS NOT NULL AND l.expires_at > NOW() THEN true
            ELSE false
        END as is_active,
        up.created_at,
        au.last_sign_in_at,
        COALESCE(so_count.count, 0) as service_orders_count,
        COALESCE(b_count.count, 0) as budgets_count
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    LEFT JOIN licenses l ON up.id = l.user_id AND l.is_active = true
    LEFT JOIN (
        SELECT 
            owner_id, 
            COUNT(*) as count 
        FROM service_orders 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) so_count ON up.id = so_count.owner_id
    LEFT JOIN (
        SELECT 
            created_by as owner_id,
            COUNT(*) as count 
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY created_by
    ) b_count ON up.id = b_count.owner_id
    WHERE 
        au.deleted_at IS NULL
        AND (p_search IS NULL OR 
             up.name ILIKE '%' || p_search || '%' OR 
             au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
        AND (p_status_filter IS NULL OR 
             CASE 
                 WHEN p_status_filter = 'active' THEN l.id IS NOT NULL AND l.expires_at > NOW()
                 WHEN p_status_filter = 'inactive' THEN l.id IS NULL OR l.expires_at <= NOW()
                 ELSE TRUE
             END)
    ORDER BY up.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END