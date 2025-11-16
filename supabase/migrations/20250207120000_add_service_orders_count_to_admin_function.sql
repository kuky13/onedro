-- Adicionar service_orders_count à função admin_get_all_users_detailed
-- para corresponder exatamente à interface SuperAdminUser do frontend

-- Remover a função existente
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, text, integer, integer);

-- Recriar com todos os campos esperados pelo frontend
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
        -- Return license_status as string (not boolean is_active)
        CASE 
            WHEN l.id IS NOT NULL AND l.expires_at > NOW() THEN 'active'
            WHEN l.id IS NOT NULL AND l.expires_at <= NOW() THEN 'expired'
            ELSE 'none'
        END as license_status,
        -- Include license_expires_at as expected by frontend
        l.expires_at as license_expires_at,
        up.created_at,
        au.last_sign_in_at,
        -- Include service_orders_count as expected by frontend
        COALESCE(service_order_count.count, 0) as service_orders_count,
        -- Include budgets_count as expected by frontend
        COALESCE(budget_count.count, 0) as budgets_count
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    LEFT JOIN licenses l ON up.id = l.user_id AND l.is_active = true
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as count
        FROM service_orders 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) service_order_count ON up.id = service_order_count.owner_id
    LEFT JOIN (
        SELECT owner_id, COUNT(*) as count
        FROM budgets 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) budget_count ON up.id = budget_count.owner_id
    WHERE 
        (p_search IS NULL OR 
         up.name ILIKE '%' || p_search || '%' OR 
         au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
        AND (p_status_filter IS NULL OR 
             CASE 
                 WHEN p_status_filter = 'active' THEN l.id IS NOT NULL AND l.expires_at > NOW()
                 WHEN p_status_filter = 'expired' THEN l.id IS NOT NULL AND l.expires_at <= NOW()
                 WHEN p_status_filter = 'none' THEN l.id IS NULL
                 ELSE TRUE
             END)
    ORDER BY up.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) IS 'Retorna lista detalhada de usuários para super administradores. Inclui service_orders_count e budgets_count para corresponder à interface SuperAdminUser.