-- Corrigir função admin_get_user_service_orders para usar device_type em vez de device_type_id
-- Data: 2025-01-27
-- Descrição: A tabela service_orders tem coluna device_type (varchar), não device_type_id (uuid)

-- Remover função existente primeiro
DROP FUNCTION IF EXISTS admin_get_user_service_orders(UUID, BOOLEAN, TEXT, DATE, DATE, INTEGER, INTEGER);

-- Recriar função admin_get_user_service_orders com referência correta
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
        COALESCE(c.name, 'Cliente não informado') as client_name,
        so.device_type,
        so.device_model,
        so.status,
        so.total_price,
        so.created_at,
        so.updated_at,
        (so.deleted_at IS NOT NULL) as is_deleted,
        so.deleted_at
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
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

-- Conceder permissões
GRANT EXECUTE ON FUNCTION admin_get_user_service_orders TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION admin_get_user_service_orders IS 'Função corrigida para buscar ordens de serviço de um usuário específico - usa device_type em vez de device_type_id e LEFT JOIN com clients';