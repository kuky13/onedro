-- Adicionar colunas para armazenamento Redis nas imagens
ALTER TABLE service_order_images 
  ADD COLUMN IF NOT EXISTS redis_key TEXT,
  ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'redis';

-- Criar índice para busca por chave Redis
CREATE INDEX IF NOT EXISTS idx_service_order_images_redis_key 
  ON service_order_images(redis_key);

-- Comentários explicativos
COMMENT ON COLUMN service_order_images.redis_key IS 'Chave única para acesso à imagem no Redis/Upstash';
COMMENT ON COLUMN service_order_images.storage_type IS 'Tipo de armazenamento: redis ou supabase';