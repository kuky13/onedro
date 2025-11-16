-- Fix admin_get_all_users_detailed function - Final Resolution
-- This migration definitively resolves both the 'id' ambiguity and structure mismatch errors

-- Drop all existing versions of the function to ensure clean state
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, text, integer, integer);
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(integer, integer, text, text, text);

-- Create the function with correct parameter order and structure
CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_search text DEFAULT '',
    p_role_filter text DEFAULT '',
    p_status_filter text DEFAULT '',
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
BEGIN
    RETURN QUERY
    SELECT 
        up.id,  -- Explicitly reference user_profiles.id to resolve ambiguity
        up.name,
        up.email,
        up.role,
        CASE 
            WHEN l.id IS NULL THEN 'inactive'::text
            WHEN l.expires_at < NOW() THEN 'expired'::text
            WHEN l.is_active = false THEN 'inactive'::text
            ELSE 'active'::text
        END as license_status,
        l.expires_at as license_expires_at,
        up.created_at,
        up.last_sign_in_at,
        COALESCE(budget_counts.count, 0)::bigint as budgets_count
    FROM user_profiles up
    LEFT JOIN licenses l ON l.user_id = up.id AND l.is_active = true
    LEFT JOIN (
        SELECT 
            owner_id,
            COUNT(*)::bigint as count
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) budget_counts ON budget_counts.owner_id = up.id
    WHERE 
        (p_search = '' OR 
         up.name ILIKE '%' || p_search || '%' OR 
         up.email ILIKE '%' || p_search || '%')
        AND (p_role_filter = '' OR up.role = p_role_filter)
        AND (p_status_filter = '' OR 
             CASE 
                 WHEN l.id IS NULL THEN 'inactive'
                 WHEN l.expires_at < NOW() THEN 'expired'
                 WHEN l.is_active = false THEN 'inactive'
                 ELSE 'active'
             END = p_status_filter)
    ORDER BY up.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) IS 
'Returns detailed user information for admin panel with proper parameter order and resolved id ambiguity';