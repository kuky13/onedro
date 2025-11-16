-- Drop and recreate get_optimized_budgets function without the issue column
DROP FUNCTION IF EXISTS public.get_optimized_budgets(uuid, text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.get_optimized_budgets(p_user_id uuid, p_search_term text DEFAULT NULL::text, p_status_filter text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, client_name text, client_phone text, device_type text, device_model text, part_quality text, status text, workflow_status text, total_price numeric, cash_price numeric, installment_price numeric, delivery_date date, expires_at date, valid_until date, created_at timestamp with time zone, updated_at timestamp with time zone, is_paid boolean, is_delivered boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar se é o próprio usuário ou admin
  IF p_user_id != auth.uid() AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: você só pode acessar seus próprios orçamentos';
  END IF;

  RETURN QUERY
  SELECT 
    b.id, b.client_name, b.client_phone, b.device_type, b.device_model,
    b.part_quality, b.status, b.workflow_status, b.total_price,
    b.cash_price, b.installment_price, b.delivery_date, b.expires_at,
    b.valid_until, b.created_at, b.updated_at, b.is_paid, b.is_delivered
  FROM public.budgets b
  WHERE b.owner_id = p_user_id 
    AND b.deleted_at IS NULL
    AND (p_search_term IS NULL OR 
         b.client_name ILIKE '%' || p_search_term || '%' OR
         b.client_phone ILIKE '%' || p_search_term || '%' OR
         b.device_model ILIKE '%' || p_search_term || '%')
    AND (p_status_filter IS NULL OR b.workflow_status = p_status_filter)
  ORDER BY b.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$