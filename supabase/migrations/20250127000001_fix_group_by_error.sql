-- Corrigir erro de GROUP BY na função get_service_order_edit_data
-- Data: 2025-01-27
-- Descrição: Remove agregação desnecessária que estava causando erro de GROUP BY
-- e corrige referência à coluna user_id que não existe na tabela device_types

CREATE OR REPLACE FUNCTION get_service_order_edit_data(p_service_order_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    service_order_data JSON;
    clients_data JSON;
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
        'updated_at', so.updated_at
    )
    INTO service_order_data
    FROM service_orders so
    WHERE so.id = p_service_order_id;

    -- Buscar todos os clientes do usuário para o dropdown (sem agregação)
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'address', c.address
        ) ORDER BY c.name
    )
    INTO clients_data
    FROM clients c
    WHERE c.user_id = auth.uid();

    -- Buscar tipos de dispositivo (sem agregação e sem filtro por usuário)
    -- A tabela device_types é compartilhada entre todos os usuários
    SELECT json_agg(
        json_build_object(
            'id', dt.id,
            'name', dt.name
        ) ORDER BY dt.name
    )
    INTO device_types_data
    FROM device_types dt;

    -- Construir resultado final
    result := json_build_object(
        'service_order', service_order_data,
        'clients', COALESCE(clients_data, '[]'::json),
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
COMMENT ON FUNCTION get_service_order_edit_data(UUID) IS 'Função otimizada para carregar todos os dados necessários para edição de ordem de serviço em uma única chamada, corrigindo erro de GROUP BY e referência incorreta à coluna user_id';