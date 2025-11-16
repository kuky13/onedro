-- Update admin_get_all_users_detailed function to include ALL license fields
-- This migration adds complete license data to the admin users function

-- Drop existing function
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, integer, integer);

-- Create updated function with complete license data
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
    service_orders_count bigint,
    -- Complete license data
    license_id uuid,
    license_code text,
    license_expires_at timestamptz,
    license_created_at timestamptz,
    license_updated_at timestamptz,
    license_activated_at timestamptz,
    license_is_active boolean,
    license_notes text,
    -- Legacy fields for compatibility
    license_status text,
    license_type text
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
            WHEN l.id IS NOT NULL AND l.expires_at > NOW() AND l.is_active = true THEN true 
            ELSE false 
        END as is_active,
        COALESCE(b_count.count, 0) as budgets_count,
        COALESCE(so_count.count, 0) as service_orders_count,
        -- Complete license data
        l.id as license_id,
        l.code as license_code,
        l.expires_at as license_expires_at,
        l.created_at as license_created_at,
        l.updated_at as license_updated_at,
        l.activated_at as license_activated_at,
        l.is_active as license_is_active,
        l.notes as license_notes,
        -- Legacy fields for compatibility
        CASE 
            WHEN l.id IS NULL THEN 'no_license'
            WHEN l.expires_at <= NOW() THEN 'expired'
            WHEN l.is_active = false THEN 'inactive'
            WHEN l.activated_at IS NULL THEN 'not_activated'
            ELSE 'active'
        END as license_status,
        CASE 
            WHEN l.id IS NULL THEN NULL
            ELSE 'standard'
        END as license_type
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
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, integer, integer) IS 'Get all users with complete license information for admin panel - includes all license table fields'