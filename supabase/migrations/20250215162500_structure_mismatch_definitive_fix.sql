-- MIGRAÇÃO PARA CORRIGIR O ERRO "structure of query does not match function result type"
-- Alinha a função SQL exatamente com a interface TypeScript UserWithLicense

-- Drop da função existente
DROP FUNCTION IF EXISTS admin_get_all_users_detailed(text, text, text, integer, integer) CASCADE;

-- Recriar a função com a estrutura EXATA que o TypeScript espera
CREATE OR REPLACE FUNCTION admin_get_all_users_detailed(
    p_search text DEFAULT NULL,
    p_role_filter text DEFAULT NULL,
    p_status_filter text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    email text,
    name text,
    created_at timestamptz,
    license_id text,
    license_code text,
    license_expires_at timestamptz,
    license_is_active boolean
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
    WHERE auth.users.id = auth.uid();
    
    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access denied. Super admin role required.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.created_at,
        l.id::text as license_id,
        l.code as license_code,
        l.expires_at as license_expires_at,
        CASE 
            WHEN l.id IS NOT NULL AND l.is_active = true AND (l.expires_at IS NULL OR l.expires_at > NOW()) THEN true
            ELSE false
        END as license_is_active
    FROM auth.users u
    LEFT JOIN licenses l ON u.id = l.user_id
    WHERE 
        (p_search IS NULL OR 
         u.email ILIKE '%' || p_search || '%' OR 
         COALESCE(u.raw_user_meta_data->>'name', '') ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR 
             COALESCE(u.raw_user_meta_data->>'role', 'user') = p_role_filter)
        AND (p_status_filter IS NULL OR 
             CASE 
                 WHEN p_status_filter = 'with_license' THEN l.id IS NOT NULL
                 WHEN p_status_filter = 'without_license' THEN l.id IS NULL
                 WHEN p_status_filter = 'expired' THEN l.id IS NOT NULL AND l.expires_at IS NOT NULL AND l.expires_at <= NOW()
                 ELSE TRUE
             END)
    ORDER BY u.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION admin_get_all_users_detailed(text, text, text, integer, integer) IS 'VERSÃO DEFINITIVA - Retorna informações de usuários com estrutura EXATA da interface TypeScript UserWithLicense. Campos: id, email, name, created_at, license_id, license_code, license_expires_at, license_is_active