-- Check the current definition of get_service_order_by_share_token function
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_service_order_by_share_token'
  AND n.nspname = 'public';