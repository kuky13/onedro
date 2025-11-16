-- Fix get_deleted_service_orders function overloading and column reference issues
-- Drop all existing versions of the function first

DROP FUNCTION IF EXISTS public.get_deleted_service_orders();
DROP FUNCTION IF EXISTS public.get_deleted_service_orders(p_limit integer, p_offset integer, p_search text, p_start_date date, p_end_date date, p_sort_by text, p_sort_order text);

-- Recreate the parameterless version that ServiceOrderTrash.tsx expects
CREATE OR REPLACE FUNCTION public.get_deleted_service_orders()
RETURNS TABLE (
    id uuid,
    owner_id uuid,
    client_id uuid,
    device_type character varying,
    device_model character varying,
    imei_serial character varying,
    reported_issue text,
    status character varying,
    priority character varying,
    total_price numeric,
    labor_cost numeric,
    parts_cost numeric,
    is_paid boolean,
    delivery_date timestamp with time zone,
    warranty_months integer,
    notes text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    deleted_by uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    -- Access control: Users can view their own deleted service orders, admins can view all
    SELECT so.id, so.owner_id, so.client_id, so.device_type, so.device_model, so.imei_serial, so.reported_issue, so.status, so.priority, so.total_price, so.labor_cost, so.parts_cost, so.is_paid, so.delivery_date, so.warranty_months, so.notes, so.created_at, so.updated_at, so.deleted_at, so.deleted_by
    FROM service_orders so
    WHERE so.deleted_at IS NOT NULL
    AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin())
    ORDER BY so.deleted_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_deleted_service_orders() TO authenticated;

COMMENT ON FUNCTION public.get_deleted_service_orders() IS 'Retorna ordens de serviço excluídas. Usuários veem apenas suas próprias, admins veem todas.';