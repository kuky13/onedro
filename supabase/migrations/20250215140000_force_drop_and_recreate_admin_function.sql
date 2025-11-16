-- MIGRAÇÃO DEFINITIVA - Force drop e recriação da função admin_get_all_users_detailed
-- Resolve o erro "cannot change return type of existing function"

-- Drop todas as versões existentes da função
DROP FUNCTION IF EXISTS admin_get_all_users_detailed() CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(integer, integer, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed() CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(text, text, text, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.admin_get_all_users_detailed(integer, integer, text, text, text) CASCADE;

-- Criar nova função com os parâmetros esperados pelo frontend
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
    license_expires_at timestamptz,
    created_at timestamptz,
    last_sign_in_at timestamptz,
    service_orders_count bigint,
    budgets_count bigint,
    license_id uuid,
    license_code text,
    license_user_id uuid,
    license_is_active boolean,
    license_created_at timestamptz,
    license_activated_at timestamptz,
    license_last_validation timestamptz,
    license_notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.email,
        COALESCE(u.raw_user_meta_data->>'role', 'user') as role,
        -- License status logic
        CASE 
            WHEN l.id IS NULL THEN 'no_license'
            WHEN l.is_active = false THEN 'inactive'
            WHEN l.expires_at IS NULL THEN 'active'
            WHEN l.expires_at > NOW() THEN 'active'
            ELSE 'expired'
        END as license_status,
        l.expires_at as license_expires_at,
        u.created_at,
        u.last_sign_in_at,
        COALESCE(so.count, 0) as service_orders_count,
        COALESCE(b.count, 0) as budgets_count,
        -- Real license data from licenses table
        l.id as license_id,
        l.code as license_code,
        l.user_id as license_user_id,
        l.is_active as license_is_active,
        l.created_at as license_created_at,
        l.activated_at as license_activated_at,
        l.last_validation as license_last_validation,
        l.notes as license_notes
    FROM auth.users u
    LEFT JOIN licenses l ON u.id = l.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM service_orders 
        GROUP BY user_id
    ) so ON u.id = so.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as count 
        FROM budgets 
        GROUP BY user_id
    ) b ON u.id = b.user_id
    WHERE 
        -- Filtro de busca por nome ou email (case insensitive)
        (p_search IS NULL OR 
         LOWER(COALESCE(u.raw_user_meta_data->>'name', u.email)) LIKE LOWER('%' || p_search || '%') OR
         LOWER(u.email) LIKE LOWER('%' || p_search || '%'))
        AND
        -- Filtro por role
        (p_role_filter IS NULL OR 
         COALESCE(u.raw_user_meta_data->>'role', 'user') = p_role_filter)
        AND
        -- Filtro por status de licença
        (p_status_filter IS NULL OR 
         CASE 
            WHEN l.id IS NULL THEN 'no_license'
            WHEN l.is_active = false THEN 'inactive'
            WHEN l.expires_at IS NULL THEN 'active'
            WHEN l.expires_at > NOW() THEN 'active'
            ELSE 'expired'
         END = p_status_filter)
    ORDER BY u.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) IS 'VERSÃO DEFINITIVA - Retorna informações detalhadas de usuários para super admin com dados reais da tabela licenses. Aceita parâmetros de filtro e paginação conforme esperado pelo frontend.';