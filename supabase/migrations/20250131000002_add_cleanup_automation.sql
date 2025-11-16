-- Criar tabela de logs de limpeza
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_count INTEGER NOT NULL DEFAULT 0,
    cleanup_date TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_cleanup_date 
ON cleanup_logs(cleanup_date DESC);

-- Índice simples para ordens excluídas (sem predicado com NOW())
CREATE INDEX IF NOT EXISTS idx_service_orders_deleted_at 
ON service_orders(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Função de limpeza automática
CREATE OR REPLACE FUNCTION cleanup_old_deleted_service_orders()
RETURNS TABLE(deleted_count INTEGER, cleanup_date TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cleanup_date TIMESTAMPTZ;
    v_order_ids UUID[];
    v_threshold_date TIMESTAMPTZ;
BEGIN
    v_cleanup_date := NOW();
    v_threshold_date := NOW() - INTERVAL '30 days';
    
    -- Buscar IDs das ordens para excluir (> 30 dias na lixeira)
    SELECT array_agg(id) INTO v_order_ids
    FROM service_orders 
    WHERE deleted_at IS NOT NULL 
    AND deleted_at < v_threshold_date;
    
    -- Se não há ordens para excluir
    IF v_order_ids IS NULL OR array_length(v_order_ids, 1) = 0 THEN
        v_deleted_count := 0;
    ELSE
        -- Excluir eventos relacionados primeiro
        DELETE FROM service_order_events 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir itens relacionados
        DELETE FROM service_order_items 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir anexos relacionados
        DELETE FROM service_order_attachments 
        WHERE service_order_id = ANY(v_order_ids);
        
        -- Excluir as ordens permanentemente
        DELETE FROM service_orders 
        WHERE id = ANY(v_order_ids);
        
        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    END IF;
    
    -- Registrar log de limpeza
    INSERT INTO cleanup_logs (deleted_count, cleanup_date, details)
    VALUES (
        v_deleted_count, 
        v_cleanup_date,
        jsonb_build_object(
            'order_ids', COALESCE(v_order_ids, ARRAY[]::UUID[]),
            'threshold_date', v_threshold_date,
            'total_orders_checked', (
                SELECT COUNT(*) FROM service_orders 
                WHERE deleted_at IS NOT NULL
            )
        )
    );
    
    RETURN QUERY SELECT v_deleted_count, v_cleanup_date;
END;
$$;

-- Permissões
GRANT SELECT ON cleanup_logs TO authenticated;
GRANT ALL PRIVILEGES ON cleanup_logs TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_service_orders() TO service_role;

-- Comentários
COMMENT ON TABLE cleanup_logs IS 'Logs de auditoria para limpeza automática da lixeira de ordens de serviço';
COMMENT ON FUNCTION cleanup_old_deleted_service_orders IS 'Função para limpeza automática de ordens excluídas há mais de 30 dias';

-- Fix function overloading conflict by dropping parameterized version and redefining parameterless version
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

-- Add comment
COMMENT ON FUNCTION public.get_deleted_service_orders IS 'Get deleted service orders for current user or admin - parameterless version';