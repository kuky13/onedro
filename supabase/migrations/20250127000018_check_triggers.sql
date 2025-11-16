-- Verificar triggers na tabela service_order_images
SELECT 
    t.tgname AS trigger_name,
    p.proname AS function_name,
    t.tgenabled AS enabled,
    t.tgtype AS trigger_type
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'service_order_images'
AND t.tgisinternal = false;