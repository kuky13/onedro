-- Fix get_optimized_budgets function to return all necessary fields for budget editing
-- This migration ensures that all fields required by WormBudgetForm are returned

-- Drop the existing function
DROP FUNCTION IF EXISTS get_optimized_budgets(text, text, integer, integer);

-- Create the updated function with all necessary fields
CREATE OR REPLACE FUNCTION get_optimized_budgets(
    search_term text DEFAULT '',
    status_filter text DEFAULT 'all',
    limit_count integer DEFAULT 50,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    client_name text,
    client_phone text,
    client_id uuid,
    device_type text,
    device_model text,
    part_type text,
    part_quality text,
    total_price numeric,
    cash_price numeric,
    installment_price numeric,
    payment_condition text,
    installments integer,
    warranty_months integer,
    includes_delivery boolean,
    includes_screen_protector boolean,
    custom_services text,
    notes text,
    issue text,
    status text,
    workflow_status text,
    is_paid boolean,
    is_delivered boolean,
    created_at timestamptz,
    updated_at timestamptz,
    delivery_date date,
    valid_until date,
    expires_at date,
    approved_at timestamptz,
    payment_confirmed_at timestamptz,
    delivery_confirmed_at timestamptz,
    sequential_number integer,
    owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has access
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Access denied: User not authenticated';
    END IF;

    -- Return filtered budgets with all fields
    RETURN QUERY
    SELECT 
        b.id,
        b.client_name,
        b.client_phone,
        b.client_id,
        b.device_type,
        b.device_model,
        b.part_type,
        b.part_quality,
        b.total_price,
        b.cash_price,
        b.installment_price,
        b.payment_condition,
        b.installments,
        b.warranty_months,
        b.includes_delivery,
        b.includes_screen_protector,
        b.custom_services,
        b.notes,
        b.issue,
        b.status,
        b.workflow_status,
        b.is_paid,
        b.is_delivered,
        b.created_at,
        b.updated_at,
        b.delivery_date,
        b.valid_until,
        b.expires_at,
        b.approved_at,
        b.payment_confirmed_at,
        b.delivery_confirmed_at,
        b.sequential_number,
        b.owner_id
    FROM budgets b
    WHERE 
        b.owner_id = auth.uid()
        AND b.deleted_at IS NULL
        AND (
            search_term = '' OR
            b.search_vector @@ plainto_tsquery('portuguese', search_term) OR
            b.client_name ILIKE '%' || search_term || '%' OR
            b.client_phone ILIKE '%' || search_term || '%' OR
            b.device_model ILIKE '%' || search_term || '%' OR
            b.device_type ILIKE '%' || search_term || '%' OR
            b.sequential_number::text ILIKE '%' || search_term || '%'
        )
        AND (
            status_filter = 'all' OR
            (status_filter = 'pending' AND b.status = 'pending') OR
            (status_filter = 'approved' AND b.status = 'approved') OR
            (status_filter = 'completed' AND b.status = 'completed') OR
            (status_filter = 'cancelled' AND b.status = 'cancelled')
        )
    ORDER BY b.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_optimized_budgets(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_optimized_budgets(text, text, integer, integer) TO anon;

-- Add comment
COMMENT ON FUNCTION get_optimized_budgets(text, text, integer, integer) IS 'Returns optimized budget data with all fields necessary for editing, with search and filtering capabilities';