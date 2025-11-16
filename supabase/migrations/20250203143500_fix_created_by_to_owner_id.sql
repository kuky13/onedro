-- Fix admin_get_all_users_detailed function - replace created_by with owner_id
-- This migration fixes the "column created_by does not exist" error

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, integer, integer);
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text);
DROP FUNCTION IF EXISTS admin_get_all_users_detailed();

-- Create the corrected function
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
    is_active boolean,
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
            WHEN l.id IS NOT NULL AND l.expires_at > NOW() THEN true 
            ELSE false 
        END as is_active,
        COALESCE(b_count.count, 0) as budgets_count,
        COALESCE(so_count.count, 0) as service_orders_count
    FROM user_profiles up
    JOIN auth.users au ON up.id = au.id
    LEFT JOIN licenses l ON up.id = l.user_id 
        AND l.deleted_at IS NULL 
        AND l.expires_at > NOW()
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
            owner_id,  -- Changed from created_by to owner_id
            COUNT(*) as count 
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id  -- Changed from created_by to owner_id
    ) b_count ON up.id = b_count.owner_id  -- Changed from created_by to owner_id
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
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, integer, integer) IS 'Get all users with detailed information for admin panel - fixed created_by references';