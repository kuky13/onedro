-- Corrigir função get_service_order_edit_data para incluir formatted_id e resolver erro de GROUP BY
-- Data: 2025-01-27
-- Descrição: Atualiza função para incluir formatted_id baseado em sequential_number

CREATE OR REPLACE FUNCTION get_service_order_edit_data(p_service_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    service_order_data JSON;
    client_data JSON;
    device_types_data JSON;
BEGIN
    -- Verificar se a ordem de serviço existe e pertence ao usuário autenticado
    IF NOT EXISTS (
        SELECT 1 FROM service_orders 
        WHERE id = p_service_order_id 
        AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Ordem de serviço não encontrada ou acesso negado';
    END IF;

    -- Buscar dados da ordem de serviço com informações do cliente
    SELECT json_build_object(
        'id', so.id,
        'formatted_id', format_service_order_id(so.sequential_number),
        'device_type', so.device_type,
        'device_model', so.device_model,
        'imei_serial', so.imei_serial,
        'reported_issue', so.reported_issue,
        'priority', so.priority,
        'total_price', so.total_price,
        'labor_cost', so.labor_cost,
        'parts_cost', so.parts_cost,
        'notes', so.notes,
        'is_paid', so.is_paid,
        'delivery_date', so.delivery_date,
        'warranty_months', so.warranty_months,
        'status', so.status,
        'client_id', so.client_id,
        'entry_date', so.entry_date,
        'exit_date', so.exit_date,
        'sequential_number', so.sequential_number,
        'created_at', so.created_at,
        'updated_at', so.updated_at,
        'client', CASE 
            WHEN c.id IS NOT NULL THEN json_build_object(
                'id', c.id,
                'name', c.name,
                'email', c.email,
                'phone', c.phone,
                'address', c.address
            )
            ELSE NULL
        END
    )
    INTO service_order_data
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    WHERE so.id = p_service_order_id;

    -- Buscar todos os clientes do usuário para o dropdown
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'email', email,
            'phone', phone,
            'address', address
        )
    )
    INTO client_data
    FROM clients
    WHERE user_id = auth.uid()
    ORDER BY name;

    -- Buscar tipos de dispositivo
    SELECT json_agg(
        json_build_object(
            'id', id,
            'name', name
        )
    )
    INTO device_types_data
    FROM device_types
    ORDER BY name;

    -- Construir resultado final
    result := json_build_object(
        'service_order', service_order_data,
        'clients', COALESCE(client_data, '[]'::json),
        'device_types', COALESCE(device_types_data, '[]'::json)
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao carregar dados: %', SQLERRM;
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION get_service_order_edit_data(UUID) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION get_service_order_edit_data(UUID) IS 'Função otimizada para carregar todos os dados necessários para edição de ordem de serviço em uma única chamada, incluindo formatted_id';