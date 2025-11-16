-- Criar bucket para imagens de ordens de serviço
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-order-images',
  'service-order-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Política para visualizar imagens (público)
CREATE POLICY "Imagens são visíveis publicamente"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'service-order-images');

-- Política para upload de imagens (usuários autenticados)
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-order-images');

-- Política para deletar imagens (usuários autenticados)
CREATE POLICY "Usuários podem deletar imagens próprias"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-order-images');

-- Atualizar tabela service_order_images para remover colunas Redis
ALTER TABLE service_order_images 
  DROP COLUMN IF EXISTS redis_key,
  DROP COLUMN IF EXISTS storage_type;

-- Adicionar coluna storage_path se não existir  
ALTER TABLE service_order_images 
  ADD COLUMN IF NOT EXISTS storage_path TEXT;