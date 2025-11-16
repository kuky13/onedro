-- Atualizar função get_service_order_details para incluir formatted_id sequencial
-- Data: 2025-01-23
-- Descrição: Remove e recria função get_service_order_details com formatted_id sequencial

-- Remover função existente
DROP FUNCTION IF EXISTS get_service_order_details(UUID);

-- Recriar função com formatted_id
CREATE OR REPLACE FUNCTION get_service_order_details(
    p_service_order_id UUID
)
RETURNS TABLE (
    -- Service Order fields
    id UUID,
    formatted_id TEXT,
    client_id UUID,
    client_name VARCHAR,
    client_phone VARCHAR,
    client_address TEXT,
    device_type VARCHAR,
    device_model VARCHAR,
    imei_serial VARCHAR,
    reported_issue TEXT,
    status VARCHAR,
    priority VARCHAR,
    parts_cost DECIMAL,
    labor_cost DECIMAL,
    total_price DECIMAL,
    is_paid BOOLEAN,
    delivery_date TIMESTAMP WITH TIME ZONE,
    warranty_months INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    -- Aggregated data
    items_count INTEGER,
    events_count INTEGER,
    attachments_count INTEGER
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
        format_service_order_id(so.sequential_number) as formatted_id,
        so.client_id,
        c.name as client_name,
        c.phone as client_phone,
        c.address as client_address,
        so.device_type,
        so.device_model,
        so.imei_serial,
        so.reported_issue,
        so.status,
        so.priority,
        so.parts_cost,
        so.labor_cost,
        so.total_price,
        so.is_paid,
        so.delivery_date,
        so.warranty_months,
        so.notes,
        so.created_at,
        so.updated_at,
        COALESCE(items.count, 0)::INTEGER as items_count,
        COALESCE(events.count, 0)::INTEGER as events_count,
        COALESCE(attachments.count, 0)::INTEGER as attachments_count
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    LEFT JOIN (
        SELECT service_order_id, COUNT(*) as count
        FROM service_order_items
        WHERE deleted_at IS NULL
        GROUP BY service_order_id
    ) items ON so.id = items.service_order_id
    LEFT JOIN (
        SELECT service_order_id, COUNT(*) as count
        FROM service_order_events
        GROUP BY service_order_id
    ) events ON so.id = events.service_order_id
    LEFT JOIN (
        SELECT service_order_id, COUNT(*) as count
        FROM service_order_attachments
        GROUP BY service_order_id
    ) attachments ON so.id = attachments.service_order_id
    WHERE 
        so.id = p_service_order_id
        AND so.deleted_at IS NULL
        AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin());
END;
$$ LANGUAGE plpgsql;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_service_order_details(UUID) TO anon, authenticated;

-- Comentário
COMMENT ON FUNCTION get_service_order_details(UUID) IS 'Obtém detalhes completos da ordem de serviço com formatted_id sequencial';