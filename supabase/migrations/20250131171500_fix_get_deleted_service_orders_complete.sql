-- Fix get_deleted_service_orders function overloading and column reference issues
-- Drop all existing versions of the function first

DROP FUNCTION IF EXISTS public.get_deleted_service_orders();
DROP FUNCTION IF EXISTS public.get_deleted_service_orders(p_limit integer, p_offset integer, p_search text, p_start_date date, p_end_date date, p_sort_by text, p_sort_order text);

-- Recreate the parameterless version that ServiceOrderTrash.tsx expects
CREATE OR REPLACE FUNCTION public.get_deleted_service_orders()
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    priority text,
    status text,
    owner_id uuid,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    owner_name text,
    owner_username text
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    -- Access control: Users can view their own deleted service orders, admins can view all
    SELECT so.id, so.title, so.description, so.priority, so.status, so.owner_id, so.created_at, so.updated_at, so.deleted_at, up.name as owner_name, up.username as owner_username
    FROM service_orders so
    JOIN user_profiles up ON so.owner_id = up.id
    WHERE so.deleted_at IS NOT NULL
    AND ((so.owner_id = auth.uid()) OR public.is_current_user_admin())
    ORDER BY so.deleted_at DESC;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_deleted_service_orders() TO authenticated;

COMMENT ON FUNCTION public.get_deleted_service_orders() IS 'Retorna ordens de serviço excluídas. Usuários veem apenas suas próprias, admins veem todas.'