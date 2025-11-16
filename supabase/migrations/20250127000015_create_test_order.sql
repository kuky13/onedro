-- Criar uma ordem de serviço de teste simples
DO $$
DECLARE
    test_order_id UUID := '550e8400-e29b-41d4-a716-446655440001'::uuid;
    existing_user_id UUID;
BEGIN
    -- Buscar um usuário existente
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE deleted_at IS NULL
    LIMIT 1;
    
    -- Se não houver usuário, usar um UUID padrão (pode falhar, mas vamos tentar)
    IF existing_user_id IS NULL THEN
        existing_user_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    
    -- Inserir ordem de serviço se não existir
    INSERT INTO service_orders (
        id,
        owner_id,
        device_type,
        device_model,
        reported_issue,
        status,
        priority,
        created_at
    ) 
    SELECT 
        test_order_id,
        existing_user_id,
        'smartphone',
        'iPhone 12 Pro',
        'Tela quebrada - teste de carregamento de imagens existentes',
        'pending',
        'medium',
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM service_orders 
        WHERE id = test_order_id
    );
    
    -- Inserir imagens de teste
    INSERT INTO service_order_images (
        id,
        service_order_id,
        uploadthing_key,
        uploadthing_url,
        file_name,
        storage_path,
        file_size,
        mime_type,
        upload_order,
        upload_status,
        uploaded_by,
        created_at
    ) 
    SELECT 
        '550e8400-e29b-41d4-a716-446655440010'::uuid,
        test_order_id,
        'test-image-1-' || extract(epoch from now()),
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Teste+Imagem+1',
        'teste-imagem-1.jpg',
        'https://via.placeholder.com/400x300/0066cc/ffffff?text=Teste+Imagem+1',
        50000,
        'image/jpeg',
        1,
        'completed',
        existing_user_id,
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM service_order_images 
        WHERE id = '550e8400-e29b-41d4-a716-446655440010'::uuid
    );
    
    INSERT INTO service_order_images (
        id,
        service_order_id,
        uploadthing_key,
        uploadthing_url,
        file_name,
        storage_path,
        file_size,
        mime_type,
        upload_order,
        upload_status,
        uploaded_by,
        created_at
    ) 
    SELECT 
        '550e8400-e29b-41d4-a716-446655440011'::uuid,
        test_order_id,
        'test-image-2-' || extract(epoch from now()),
        'https://via.placeholder.com/400x300/ff6600/ffffff?text=Teste+Imagem+2',
        'teste-imagem-2.jpg',
        'https://via.placeholder.com/400x300/ff6600/ffffff?text=Teste+Imagem+2',
        75000,
        'image/jpeg',
        2,
        'completed',
        existing_user_id,
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM service_order_images 
        WHERE id = '550e8400-e29b-41d4-a716-446655440011'::uuid
    );
    
    RAISE NOTICE 'Ordem de teste criada com ID: % e usuário: %', test_order_id, existing_user_id;
END $$;