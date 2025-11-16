-- Debug: Verificar dados de imagens para o UUID de teste
DO $$
BEGIN
    RAISE NOTICE '🔍 Verificando dados de imagens para UUID: 550e8400-e29b-41d4-a716-446655440001';
    
    -- Verificar se a ordem de serviço existe
    IF EXISTS (SELECT 1 FROM service_orders WHERE id = '550e8400-e29b-41d4-a716-446655440001') THEN
        RAISE NOTICE '✅ Ordem de serviço encontrada';
    ELSE
        RAISE NOTICE '❌ Ordem de serviço NÃO encontrada';
    END IF;
    
    -- Verificar imagens na tabela
    DECLARE
        image_count INTEGER;
        image_record RECORD;
    BEGIN
        SELECT COUNT(*) INTO image_count 
        FROM service_order_images 
        WHERE service_order_id = '550e8400-e29b-41d4-a716-446655440001';
        
        RAISE NOTICE '📊 Total de imagens encontradas: %', image_count;
        
        -- Listar todas as imagens
        FOR image_record IN 
            SELECT id, file_name, storage_path, upload_order, created_at
            FROM service_order_images 
            WHERE service_order_id = '550e8400-e29b-41d4-a716-446655440001'
            ORDER BY upload_order
        LOOP
            RAISE NOTICE '🖼️ Imagem: ID=%, Nome=%, Ordem=%, Criada em=%', 
                image_record.id, 
                image_record.file_name, 
                image_record.upload_order, 
                image_record.created_at;
        END LOOP;
    END;
END $$;