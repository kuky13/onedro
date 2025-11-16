-- Criar bucket para imagens de ordens de serviço
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-order-images',
  'service-order-images',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Images are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Política para permitir upload de imagens (usuários autenticados)
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'service-order-images' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir visualização de imagens (público)
CREATE POLICY "Images are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'service-order-images');

-- Política para permitir atualização de imagens (proprietário)
CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'service-order-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir exclusão de imagens (proprietário)
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'service-order-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);