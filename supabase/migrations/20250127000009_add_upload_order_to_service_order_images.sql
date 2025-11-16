-- Adicionar coluna upload_order à tabela service_order_images se não existir
DO $$
BEGIN
    -- Verificar se a coluna upload_order existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'service_order_images' 
        AND column_name = 'upload_order'
    ) THEN
        -- Adicionar a coluna upload_order
        ALTER TABLE service_order_images 
        ADD COLUMN upload_order INTEGER NOT NULL DEFAULT 1;
        
        -- Criar índice para melhor performance
        CREATE INDEX IF NOT EXISTS idx_service_order_images_upload_order 
        ON service_order_images(service_order_id, upload_order);
        
        -- Adicionar constraint para limitar máximo de 3 imagens por ordem de serviço
        ALTER TABLE service_order_images 
        ADD CONSTRAINT check_max_images_per_order 
        CHECK (upload_order <= 3);
        
        -- Adicionar constraint para garantir que upload_order seja único por service_order_id
        ALTER TABLE service_order_images 
        ADD CONSTRAINT unique_upload_order_per_service_order 
        UNIQUE (service_order_id, upload_order);
        
        -- Atualizar registros existentes com valores sequenciais de upload_order
        WITH numbered_images AS (
            SELECT id, 
                   ROW_NUMBER() OVER (PARTITION BY service_order_id ORDER BY created_at) as row_num
            FROM service_order_images
        )
        UPDATE service_order_images 
        SET upload_order = numbered_images.row_num
        FROM numbered_images 
        WHERE service_order_images.id = numbered_images.id;
    END IF;
END $$;