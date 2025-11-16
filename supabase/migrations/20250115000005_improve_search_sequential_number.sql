-- Improve get_optimized_budgets function to search by sequential_number
-- This migration adds the ability to search by budget codes (0001-9999)
-- Supports flexible search: searching "38" will find budget with sequential_number 38 (displayed as 0038)

DROP FUNCTION IF EXISTS public.get_optimized_budgets(uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_optimized_budgets(
    p_user_id uuid, 
    p_search_term text DEFAULT NULL::text, 
    p_status_filter text DEFAULT NULL::text, 
    p_limit integer DEFAULT 50, 
    p_offset integer DEFAULT 0
)
RETURNS TABLE(
    id uuid,
    client_name text,
    client_phone text,
    device_type text,
    device_model text,
    part_quality text,
    status text,
    workflow_status text,
    total_price numeric,
    cash_price numeric,
    installment_price numeric,
    delivery_date date,
    expires_at date,
    valid_until date,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    is_paid boolean,
    is_delivered boolean,
    -- Additional fields needed for edit form
    notes text,
    custom_services text,
    installments integer,
    issue text,
    includes_delivery boolean,
    includes_screen_protector boolean,
    warranty_months integer,
    payment_condition text,
    sequential_number integer,
    client_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    search_as_number integer;
BEGIN
    -- Verificar se é o próprio usuário ou admin
    IF p_user_id != auth.uid() AND NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: você só pode acessar seus próprios orçamentos';
    END IF;

    -- Try to convert search term to integer for sequential_number search
    -- This will be NULL if conversion fails (non-numeric search)
    BEGIN
        search_as_number := p_search_term::integer;
    EXCEPTION WHEN OTHERS THEN
        search_as_number := NULL;
    END;

    RETURN QUERY
    SELECT 
        b.id, 
        b.client_name, 
        b.client_phone, 
        b.device_type, 
        b.device_model,
        b.part_quality, 
        b.status, 
        b.workflow_status, 
        b.total_price,
        b.cash_price, 
        b.installment_price, 
        b.delivery_date, 
        b.expires_at,
        b.valid_until, 
        b.created_at, 
        b.updated_at, 
        b.is_paid, 
        b.is_delivered,
        -- Additional fields for edit form
        COALESCE(b.notes, '') as notes,
        COALESCE(b.custom_services, '') as custom_services,
        COALESCE(b.installments, 1) as installments,
        COALESCE(b.issue, '') as issue,
        COALESCE(b.includes_delivery, false) as includes_delivery,
        COALESCE(b.includes_screen_protector, false) as includes_screen_protector,
        COALESCE(b.warranty_months, 12) as warranty_months,
        COALESCE(b.payment_condition, 'Cartão de Crédito') as payment_condition,
        b.sequential_number,
        b.client_id
    FROM public.budgets b
    WHERE b.owner_id = p_user_id 
        AND b.deleted_at IS NULL
        AND (p_search_term IS NULL OR 
             -- Search by client info and device model (existing functionality)
             b.client_name ILIKE '%' || p_search_term || '%' OR
             b.client_phone ILIKE '%' || p_search_term || '%' OR
             b.device_model ILIKE '%' || p_search_term || '%' OR
             -- NEW: Search by sequential_number (supports searching "38" to find 0038)
             (search_as_number IS NOT NULL AND b.sequential_number = search_as_number))
        AND (p_status_filter IS NULL OR b.workflow_status = p_status_filter)
    ORDER BY b.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_optimized_budgets(uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_optimized_budgets(uuid, text, text, integer, integer) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_optimized_budgets(uuid, text, text, integer, integer) IS 'Returns optimized budget data with search by sequential_number support. Searching "38" will find budget 0038.';