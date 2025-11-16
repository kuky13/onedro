-- Fix get_optimized_budgets function to return all necessary fields
-- This ensures that edit forms display existing data correctly

DROP FUNCTION IF EXISTS public.get_optimized_budgets(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_optimized_budgets(
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
    device_model text,
    device_brand text,
    piece_quality text,
    issue text,
    notes text,
    total_price numeric,
    cash_price numeric,
    installment_price numeric,
    installments integer,
    payment_condition text,
    warranty_months integer,
    includes_delivery boolean,
    includes_screen_protector boolean,
    custom_services text,
    sequential_number integer,
    is_paid boolean,
    is_delivered boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has access to budgets
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE auth.users.id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        b.id,
        b.client_name,
        b.client_phone,
        b.client_id,
        b.device_model,
        b.device_brand,
        b.piece_quality,
        b.issue,
        b.notes,
        b.total_price,
        b.cash_price,
        b.installment_price,
        b.installments,
        b.payment_condition,
        b.warranty_months,
        b.includes_delivery,
        b.includes_screen_protector,
        b.custom_services,
        b.sequential_number,
        b.is_paid,
        b.is_delivered,
        b.created_at,
        b.updated_at,
        b.user_id
    FROM public.budgets b
    WHERE 
        b.user_id = auth.uid()
        AND (
            search_term = '' OR 
            b.client_name ILIKE '%' || search_term || '%' OR
            b.client_phone ILIKE '%' || search_term || '%' OR
            b.device_model ILIKE '%' || search_term || '%' OR
            b.device_brand ILIKE '%' || search_term || '%'
        )
        AND (
            status_filter = 'all' OR
            (status_filter = 'paid' AND b.is_paid = true) OR
            (status_filter = 'unpaid' AND b.is_paid = false) OR
            (status_filter = 'delivered' AND b.is_delivered = true) OR
            (status_filter = 'pending' AND b.is_delivered = false)
        )
    ORDER BY b.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_optimized_budgets(text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_budgets(text, text, integer, integer) TO anon;