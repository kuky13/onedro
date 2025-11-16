-- Remover trigger problemático se existir
DO $$
BEGIN
    -- Tentar remover a função log_image_events se existir
    DROP FUNCTION IF EXISTS log_image_events() CASCADE;
    
    -- Tentar remover qualquer trigger que possa estar chamando essa função
    DROP TRIGGER IF EXISTS log_image_events_trigger ON service_order_images;
    DROP TRIGGER IF EXISTS trigger_log_image_events ON service_order_images;
    DROP TRIGGER IF EXISTS image_events_trigger ON service_order_images;
    
    RAISE NOTICE 'Triggers problemáticos removidos (se existiam)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover triggers: %', SQLERRM;
END $$;