-- Verificar dados na tabela service_order_images
DO $$
DECLARE
    total_images INTEGER;
    test_order_images INTEGER;
    image_record RECORD;
BEGIN
    -- Contar total de imagens na tabela
    SELECT COUNT(*) INTO total_images FROM service_order_images;
    RAISE NOTICE '📊 Total de imagens na tabela: %', total_images;
    
    -- Contar imagens para o UUID de teste
    SELECT COUNT(*) INTO test_order_images 
    FROM service_order_images 
    WHERE service_order_id = '550e8400-e29b-41d4-a716-446655440001';
    RAISE NOTICE '🎯 Imagens para UUID de teste: %', test_order_images;
    
    -- Listar todas as imagens da tabela (máximo 10)
    RAISE NOTICE '📋 Listando todas as imagens (máximo 10):';
    FOR image_record IN 
        SELECT id, service_order_id, file_name, upload_order, created_at
        FROM service_order_images 
        ORDER BY created_at DESC
        LIMIT 10
    LOOP
        RAISE NOTICE '🖼️ ID: %, ServiceOrderId: %, Nome: %, Ordem: %', 
            image_record.id, 
            image_record.service_order_id, 
            image_record.file_name, 
            image_record.upload_order;
    END LOOP;
    
    -- Verificar se a ordem de serviço existe
    IF EXISTS (SELECT 1 FROM service_orders WHERE id = '550e8400-e29b-41d4-a716-446655440001') THEN
        RAISE NOTICE '✅ Ordem de serviço existe na tabela service_orders';
    ELSE
        RAISE NOTICE '❌ Ordem de serviço NÃO existe na tabela service_orders';
    END IF;
END $$;