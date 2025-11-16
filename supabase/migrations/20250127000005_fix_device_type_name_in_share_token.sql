-- Fix get_service_order_by_share_token function to return device type name instead of UUID
-- Date: 2025-01-27
-- Description: Join with device_types table to return the device name instead of UUID

CREATE OR REPLACE FUNCTION get_service_order_by_share_token(share_token_param UUID)
RETURNS TABLE (
    id UUID,
    client_id UUID,
    device_type VARCHAR,
    device_model VARCHAR,
    imei_serial VARCHAR,
    reported_issue TEXT,
    status VARCHAR,
    priority VARCHAR,
    total_price NUMERIC,
    labor_cost NUMERIC,
    parts_cost NUMERIC,
    is_paid BOOLEAN,
    delivery_date TIMESTAMPTZ,
    warranty_months INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    entry_date TIMESTAMPTZ,
    exit_date TIMESTAMPTZ,
    sequential_number INTEGER,
    payment_status TEXT,
    estimated_completion TIMESTAMPTZ,
    actual_completion TIMESTAMPTZ,
    customer_notes TEXT,
    technician_notes TEXT,
    last_customer_update TIMESTAMPTZ,
    customer_visible BOOLEAN,
    formatted_id TEXT,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        so.id,
        so.client_id,
        COALESCE(dt.name, so.device_type) AS device_type, -- Return device type name or fallback to original value
        so.device_model,
        so.imei_serial,
        so.reported_issue,
        so.status,
        so.priority,
        so.total_price,
        so.labor_cost,
        so.parts_cost,
        so.is_paid,
        so.delivery_date,
        so.warranty_months,
        so.notes,
        so.created_at,
        so.updated_at,
        so.entry_date,
        so.exit_date,
        so.sequential_number,
        so.payment_status,
        so.estimated_completion,
        so.actual_completion,
        so.customer_notes,
        so.technician_notes,
        so.last_customer_update,
        so.customer_visible,
        CASE 
            WHEN so.sequential_number IS NOT NULL THEN 
                'OS: ' || LPAD(so.sequential_number::TEXT, 4, '0')
            ELSE 
                'OS: ' || SUBSTRING(so.id::TEXT FROM 1 FOR 8)
        END AS formatted_id,
        c.name AS client_name,
        c.email AS client_email,
        c.phone AS client_phone
    FROM service_orders so
    LEFT JOIN clients c ON so.client_id = c.id
    LEFT JOIN device_types dt ON dt.id::text = so.device_type -- Join with device_types to get the name
    INNER JOIN service_order_shares sos ON so.id = sos.service_order_id
    WHERE sos.share_token = share_token_param
      AND sos.is_active = true
      AND sos.expires_at > NOW()
      AND so.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the fix
COMMENT ON FUNCTION get_service_order_by_share_token(UUID) IS 'Função para buscar ordem de serviço por token de compartilhamento - corrigida para retornar nome do tipo de dispositivo em vez de UUID';