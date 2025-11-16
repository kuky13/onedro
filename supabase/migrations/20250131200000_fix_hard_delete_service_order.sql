-- Corrigir função hard_delete_service_order para remover verificações VIP obsoletas
-- Data: 2025-01-31
-- Descrição: Atualizar função para usar apenas verificações de admin/proprietário

-- Recriar função hard_delete_service_order sem verificações VIP
CREATE OR REPLACE FUNCTION public.hard_delete_service_order(service_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  order_exists BOOLEAN;
  is_owner BOOLEAN;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Validate user ID
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate service order ID
  IF service_order_id IS NULL THEN
    RAISE EXCEPTION 'Service order ID cannot be null';
  END IF;

  -- Check if service order exists and is soft-deleted, and if user is owner
  SELECT 
    EXISTS(SELECT 1 FROM service_orders WHERE id = service_order_id AND deleted_at IS NOT NULL),
    EXISTS(SELECT 1 FROM service_orders WHERE id = service_order_id AND owner_id = current_user_id)
  INTO order_exists, is_owner;

  IF NOT order_exists THEN
    RAISE EXCEPTION 'Service order not found in trash or does not exist';
  END IF;

  -- Check if user is admin or owner of the service order
  IF NOT (public.is_current_user_admin() OR is_owner) THEN
    RAISE EXCEPTION 'Access denied. You can only permanently delete your own service orders or be an admin.';
  END IF;

  -- Delete related records first (service_order_events)
  DELETE FROM service_order_events WHERE service_order_id = service_order_id;

  -- Permanently delete the service order
  DELETE FROM service_orders WHERE id = service_order_id;
  
  RETURN TRUE;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.hard_delete_service_order IS 'Permite que administradores e proprietários excluam permanentemente ordens de ser