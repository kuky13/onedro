-- Remove service_orders_count from admin_get_all_users_detailed function
-- to match the SuperAdminUser interface in /hooks/super-admin/useSuperAdminUsers.ts

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(INTEGER, INTEGER, TEXT, TEXT, TEXT);

-- Create the function without service_orders_count to match the TypeScript interface
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
    license_status text,
    license_expires_at timestamp with time zone,
    created_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    budgets_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_role text;
BEGIN
    -- Verificar se o usuário atual é super admin
    SELECT raw_user_meta_data->>'role' INTO current_user_role
    FROM auth.users 
    WHERE id = auth.uid();
    
    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.email,
        COALESCE(u.raw_user_meta_data->>'role', 'user') as role,
        CASE 
            WHEN l.id IS NOT NULL AND l.expires_at > NOW() THEN 'active'
            WHEN l.id IS NOT NULL AND l.expires_at <= NOW() THEN 'expired'
            ELSE 'none'
        END as license_status,
        l.expires_at as license_expires_at,
        u.created_at,
        u.last_sign_in_at,
        COALESCE(b_count.count, 0) as budgets_count
    FROM auth.users u
    LEFT JOIN licenses l ON u.id = l.user_id
    LEFT JOIN (
        SELECT 
            owner_id,
            COUNT(*) as count 
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) b_count ON u.id = b_count.owner_id
    WHERE 
        u.deleted_at IS NULL
        AND (p_search IS NULL OR 
             u.email ILIKE '%' || p_search || '%' OR 
             COALESCE(u.raw_user_meta_data->>'name', '') ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR 
             COALESCE(u.raw_user_meta_data->>'role', 'user') = p_role_filter)
        AND (p_status_filter IS NULL OR 
             CASE 
                 WHEN p_status_filter = 'active' THEN l.id IS NOT NULL AND l.expires_at > NOW()
                 WHEN p_status_filter = 'expired' THEN l.id IS NOT NULL AND l.expires_at <= NOW()
                 WHEN p_status_filter = 'none' THEN l.id IS NULL
                 ELSE TRUE
             END)
    ORDER BY u.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_all_users_detailed(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Retorna lista detalhada de usuários para super administradores. Versão alinhada com interface SuperAdminUser (sem service_orders_count).';