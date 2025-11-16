-- Query para verificar ordens de serviço existentes
SELECT 
    id,
    device_type,
    device_model,
    reported_issue,
    status,
    created_at
FROM service_orders 
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;