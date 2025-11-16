-- Enhance admin_get_all_users_detailed function to include detailed license information
-- This migration adds comprehensive license data to the admin user management interface

-- Drop existing function
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, integer, integer);

-- Create enhanced function with detailed license information
CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_search text DEFAULT NULL,
    p_role_filter text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    email text,
    name text,
    role text,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    license_status text,
    license_expires_at timestamptz,
    license_code text,
    license_type text,
    license_activated_at timestamptz,
    license_is_active boolean,
    days_remaining integer,
    budgets_count bigint,
    service_orders_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        au.email,
        up.name,
        up.role,
        au.created_at,
        au.last_sign_in_at,
        CASE 
            WHEN l.id IS NULL THEN 'Sem Licença'
            WHEN l.expires_at IS NULL THEN 'Licença Inválida'
            WHEN l.expires_at <= NOW() THEN 'Expirada'
            WHEN l.activated_at IS NULL THEN 'Não Ativada'
            WHEN l.is_active = true AND l.expires_at > NOW() THEN 'Ativa'
            ELSE 'Inativa'
        END as license_status,
        l.expires_at as license_expires_at,
        l.code as license_code,
        COALESCE(l.license_type, 'Standard') as license_type,
        l.activated_at as license_activated_at,
        COALESCE(l.is_active, false) as license_is_active,
        CASE 
            WHEN l.expires_at IS NULL THEN NULL
            WHEN l.expires_at <= NOW() THEN 0
            ELSE EXTRACT(DAY FROM (l.expires_at - NOW()))::integer
        END as days_remaining,
        COALESCE(b_count.count, 0) as budgets_count,
        COALESCE(so_count.count, 0) as service_orders_count
    FROM user_profiles up
    JOIN auth.users au ON up.id = au.id
    LEFT JOIN licenses l ON up.id = l.user_id 
        AND l.deleted_at IS NULL
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
            owner_id,
            COUNT(*) as count 
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) b_count ON up.id = b_count.owner_id
    WHERE 
        au.deleted_at IS NULL
        AND (p_search IS NULL OR 
             up.name ILIKE '%' || p_search || '%' OR 
             au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
    ORDER BY au.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed(text, text, integer, integer) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, integer, integer) IS 'Get all users with comprehensive license information for admin panel - includes license code, type, activation status, and expiration details';