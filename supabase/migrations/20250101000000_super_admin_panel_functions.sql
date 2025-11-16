-- Super Admin Panel Functions and Tables
-- This migration creates all necessary functions and tables for the super administrator dashboard

-- Create admin_logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_table ON admin_logs(target_table);

-- Enable RLS on admin_logs
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_logs
DROP POLICY IF EXISTS "Admins can view all admin logs" ON admin_logs;
CREATE POLICY "Admins can view all admin logs" ON admin_logs
    FOR SELECT USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can insert admin logs" ON admin_logs;
CREATE POLICY "Admins can insert admin logs" ON admin_logs
    FOR INSERT WITH CHECK (public.is_current_user_admin());

-- Function to get all users with detailed information for super admin
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
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    service_orders_count BIGINT,
    total_revenue NUMERIC
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
        up.is_active,
        up.created_at,
        au.last_sign_in_at as last_login,
        COALESCE(so_stats.orders_count, 0) as service_orders_count,
        COALESCE(so_stats.total_revenue, 0) as total_revenue
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    LEFT JOIN (
        SELECT 
            owner_id,
            COUNT(*) as orders_count,
            SUM(total_price) as total_revenue
        FROM service_orders 
        WHERE deleted_at IS NULL
        GROUP BY owner_id
    ) so_stats ON up.id = so_stats.owner_id
    WHERE 
        (p_search IS NULL OR 
         up.name ILIKE '%' || p_search || '%' OR 
         au.email ILIKE '%' || p_search || '%')
        AND (p_role_filter IS NULL OR up.role = p_role_filter)
        AND (p_status_filter IS NULL OR 
             (p_status_filter = 'active' AND up.is_active = true) OR
             (p_status_filter = 'inactive' AND up.is_active = false))
    ORDER BY up.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to get user service orders for admin
CREATE OR REPLACE FUNCTION admin_get_user_service_orders(
    p_user_id UUID,
    p_include_deleted BOOLEAN DEFAULT false,
    p_status_filter TEXT DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    sequential_number INTEGER,
    client_name TEXT,
    device_type TEXT,
    device_model TEXT,
    status TEXT,
    total_price NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar ordens de serviço';
    END IF;
    
    RETURN QUERY
    SELECT 
        so.id,
        so.sequential_number,
        so.client_name,
        dt.name as device_type,
        so.device_model,
        so.status,
        so.total_price,
        so.created_at,
        so.updated_at,
        (so.deleted_at IS NOT NULL) as is_deleted,
        so.deleted_at
    FROM service_orders so
    LEFT JOIN device_types dt ON so.device_type_id = dt.id
    WHERE 
        so.owner_id = p_user_id
        AND (p_include_deleted = true OR so.deleted_at IS NULL)
        AND (p_status_filter IS NULL OR so.status = p_status_filter)
        AND (p_date_from IS NULL OR so.created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR so.created_at::date <= p_date_to)
    ORDER BY so.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Function to completely delete a user and all related data
CREATE OR REPLACE FUNCTION admin_delete_user_completely(
    p_user_id UUID,
    p_confirmation_code TEXT,
    p_delete_auth_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_deleted_records JSON;
    v_service_orders_count INTEGER;
    v_budgets_count INTEGER;
    v_user_email TEXT;
    v_user_name TEXT;
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;
    
    -- Obter dados do usuário para verificação
    SELECT au.email, up.name 
    INTO v_user_email, v_user_name
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE au.id = p_user_id;
    
    -- Verificar se usuário existe
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
    
    -- Verificar código de confirmação (deve ser o email do usuário)
    IF v_user_email != p_confirmation_code THEN
        RAISE EXCEPTION 'Código de confirmação inválido. Digite o email exato do usuário.';
    END IF;
    
    v_admin_id := auth.uid();
    
    -- Contar registros antes da exclusão
    SELECT COUNT(*) INTO v_service_orders_count 
    FROM service_orders WHERE owner_id = p_user_id;
    
    SELECT COUNT(*) INTO v_budgets_count 
    FROM budgets WHERE created_by = p_user_id;
    
    -- Excluir dados relacionados em ordem
    -- 1. Excluir itens de ordens de serviço
    DELETE FROM service_order_items 
    WHERE service_order_id IN (
        SELECT id FROM service_orders WHERE owner_id = p_user_id
    );
    
    -- 2. Excluir eventos de ordens de serviço
    DELETE FROM service_order_events 
    WHERE service_order_id IN (
        SELECT id FROM service_orders WHERE owner_id = p_user_id
    );
    
    -- 3. Excluir anexos de ordens de serviço
    DELETE FROM service_order_attachments 
    WHERE service_order_id IN (
        SELECT id FROM service_orders WHERE owner_id = p_user_id
    );
    
    -- 4. Excluir orçamentos
    DELETE FROM budgets WHERE created_by = p_user_id;
    
    -- 5. Excluir ordens de serviço
    DELETE FROM service_orders WHERE owner_id = p_user_id;
    
    -- 6. Excluir notificações do usuário
    DELETE FROM user_notifications WHERE user_id = p_user_id;
    
    -- 7. Excluir perfil do usuário
    DELETE FROM user_profiles WHERE id = p_user_id;
    
    -- 8. Excluir licenças do usuário
    DELETE FROM user_licenses WHERE user_id = p_user_id;
    
    -- Preparar resposta
    v_deleted_records := json_build_object(
        'user_id', p_user_id,
        'user_email', v_user_email,
        'user_name', v_user_name,
        'service_orders_deleted', v_service_orders_count,
        'budgets_deleted', v_budgets_count,
        'auth_user_deleted', p_delete_auth_user,
        'deleted_at', NOW(),
        'deleted_by', v_admin_id
    );
    
    -- Registrar log administrativo
    INSERT INTO admin_logs (
        admin_id, action_type, target_table, target_id, 
        new_values, created_at
    ) VALUES (
        v_admin_id, 'DELETE_USER_COMPLETELY', 'user_profiles', p_user_id,
        v_deleted_records, NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'deleted_records', v_deleted_records,
        'message', 'Usuário excluído completamente do sistema'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro (usando auth.uid() diretamente para evitar problemas de escopo)
        INSERT INTO admin_logs (
            admin_id, action_type, target_table, target_id, 
            new_values, created_at
        ) VALUES (
            auth.uid(), 'DELETE_USER_ERROR', 'user_profiles', p_user_id,
            json_build_object('error', SQLERRM, 'sqlstate', SQLSTATE), NOW()
        );
        
        RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
END;
$$;

-- Function to get admin dashboard statistics
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
        'active_users', (SELECT COUNT(*) FROM user_profiles WHERE is_active = true),
        'inactive_users', (SELECT COUNT(*) FROM user_profiles WHERE is_active = false),
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
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

-- Function to get audit logs for admin
CREATE OR REPLACE FUNCTION admin_get_audit_logs(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_action_filter TEXT DEFAULT NULL,
    p_admin_filter UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    admin_id UUID,
    admin_name TEXT,
    admin_email TEXT,
    action_type TEXT,
    target_table TEXT,
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se é admin
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem visualizar logs de auditoria';
    END IF;
    
    RETURN QUERY
    SELECT 
        al.id,
        al.admin_id,
        up.name as admin_name,
        au.email as admin_email,
        al.action_type,
        al.target_table,
        al.target_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.created_at
    FROM admin_logs al
    LEFT JOIN auth.users au ON al.admin_id = au.id
    LEFT JOIN user_profiles up ON al.admin_id = up.id
    WHERE 
        (p_action_filter IS NULL OR al.action_type = p_action_filter)
        AND (p_admin_filter IS NULL OR al.admin_id = p_admin_filter)
        AND (p_date_from IS NULL OR al.created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR al.created_at::date <= p_date_to)
    ORDER BY al.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Grant permissions to authenticated users (will be filtered by RLS)
GRANT SELECT ON admin_logs TO authenticated;
GRANT INSERT ON admin_logs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION admin_get_all_users_detailed TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_service_orders TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user_completely TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_audit_logs TO authenticated;

-- Insert initial log entry
INSERT INTO admin_logs (admin_id, action_type, target_table, target_id, new_values)
SELECT 
    id, 'SYSTEM_INIT', 'admin_logs', gen_random_uuid(),
    '{"message": "Sistema de super administrador inicializado", "version": "1.0"}'::jsonb
FROM user_profiles 
WHERE role = 'admin' 
LIMIT 1;