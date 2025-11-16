-- Criar dados de teste simples sem triggers
DO $$
DECLARE
    test_order_id UUID := '550e8400-e29b-41d4-a716-446655440002'::uuid;
    existing_user_id UUID;
BEGIN
    -- Buscar um usuário existente
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE deleted_at IS NULL
    LIMIT 1;
    
    -- Se não houver usuário, usar um UUID padrão
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
        'Samsung Galaxy S21',
        'Problema de carregamento - teste de imagens',
        'pending',
        'medium',
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM service_orders 
        WHERE id = test_order_id
    );
    
    RAISE NOTICE 'Ordem de teste criada com ID: % e usuário: %', test_order_id, existing_user_id;
END $$;