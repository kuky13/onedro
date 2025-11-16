-- Corrigir ambiguidade na função hard_delete_service_order
-- Data: 2025-01-31
-- Descrição: Resolver erro de coluna "service_order_id" ambígua

-- Recriar função hard_delete_service_order com qualificação de tabela adequada
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
  -- Qualificar explicitamente as colunas com o nome da tabela
  SELECT 
    EXISTS(SELECT 1 FROM service_orders so WHERE so.id = service_order_id AND so.deleted_at IS NOT NULL),
    EXISTS(SELECT 1 FROM service_orders so WHERE so.id = service_order_id AND so.owner_id = current_user_id)
  INTO order_exists, is_owner;

  IF NOT order_exists THEN
    RAISE EXCEPTION 'Service order not found in trash or does not exist';
  END IF;

  -- Check if user is admin or owner of the service order
  IF NOT (public.is_current_user_admin() OR is_owner) THEN
    RAISE EXCEPTION 'Access denied. You can only permanently delete your own service orders or be an admin.';
  END IF;

  -- Delete related records first (service_order_events)
  -- Qualificar explicitamente a coluna service_order_id
  DELETE FROM service_order_events soe WHERE soe.service_order_id = hard_delete_service_order.service_order_id;

  -- Permanently delete the service order
  -- Qualificar explicitamente a coluna id
  DELETE FROM service_orders so WHERE so.id = hard_delete_service_order.service_order_id;
  
  RETURN TRUE;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.hard_delete_service_order IS 'Permite que administradores e proprietários excluam permanentemente ordens de serviço da lixeira (sem ambiguidade)';