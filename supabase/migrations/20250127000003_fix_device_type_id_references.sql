-- Corrigir referências incorretas a device_type_id na função search_service_orders
-- Data: 2025-01-27
-- Descrição: A tabela service_orders tem coluna device_type (varchar), não device_type_id (uuid)

-- Remover função existente primeiro
DROP FUNCTION IF EXISTS search_service_orders(TEXT, VARCHAR, VARCHAR, UUID, DATE, DATE, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS search_service_orders(TEXT, VARCHAR, VARCHAR, VARCHAR, DATE, DATE, INTEGER, INTEGER);

-- Recriar função search_service_orders com referência correta
CREATE OR REPLACE FUNCTION search_service_orders(
    p_search_query TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT NULL,
    p_device_type VARCHAR DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    order_number VARCHAR,
    client_name VARCHAR,
    client_phone VARCHAR,
    device_model VARCHAR,
    status VARCHAR,
    priority VARCHAR,
    total_price DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    delivery_date TIMESTAMP WITH TIME ZONE,
    search_rank REAL
)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has access to service orders beta
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND (service_orders_beta_enabled = true OR role = 'admin')
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Acesso negado: Módulo Service Orders (Beta) não habilitado';
    END IF;

    RETURN QUERY
    SELECT 
        so.id,
        COALESCE(format_service_order_id(so.sequential_number), so.id::text) as order_number,
        c.name as client_name,
        c.phone as client_phone,
        so.device_model,
        so.status,
        so.priority,
        so.total_price,
        so.created_at,
        so.delivery_date,
        CASE 
            WHEN p_search_query IS NOT NULL THEN
                ts_rank(so.search_vector, plainto_tsquery('portuguese', p_search_query))
            ELSE 1.0
        END as search_rank
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    WHERE 
        so.deleted_at IS NULL
        AND so.owner_id = auth.uid()
        AND (p_search_query IS NULL OR so.search_vector @@ plainto_tsquery('portuguese', p_search_query))
        AND (p_status IS NULL OR so.status = p_status)
        AND (p_priority IS NULL OR so.priority = p_priority)
        AND (p_device_type IS NULL OR so.device_type = p_device_type)
        AND (p_date_from IS NULL OR so.created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR so.created_at::date <= p_date_to)
    ORDER BY 
        CASE WHEN p_search_query IS NOT NULL THEN search_rank END DESC,
        so.priority DESC,
        so.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_service_orders IS 'Função corrigida para buscar ordens de serviço - usa device_type em vez de device_type_id';