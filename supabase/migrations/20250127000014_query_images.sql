-- Query para verificar imagens existentes
SELECT 
    soi.id,
    soi.service_order_id,
    soi.file_name,
    soi.storage_path,
    soi.upload_status,
    soi.created_at,
    so.device_type,
    so.device_model
FROM service_order_images soi
JOIN service_orders so ON soi.service_order_id = so.id
WHERE so.deleted_at IS NULL
ORDER BY soi.created_at DESC
LIMIT 10;