-- Verificar dados de teste criados
SELECT 
    so.id as service_order_id,
    so.device_type,
    so.device_model,
    so.reported_issue,
    so.status,
    COUNT(soi.id) as image_count
FROM service_orders so
LEFT JOIN service_order_images soi ON so.id = soi.service_order_id
WHERE so.id IN (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    '550e8400-e29b-41d4-a716-446655440002'::uuid
)
GROUP BY so.id, so.device_type, so.device_model, so.reported_issue, so.status
ORDER BY so.created_at DESC;