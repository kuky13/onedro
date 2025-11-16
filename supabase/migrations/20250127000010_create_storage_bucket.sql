-- Criar bucket para armazenar as imagens (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-order-images', 'service-order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o storage bucket
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view service order images in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload service order images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update service order images in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete service order images from storage" ON storage.objects;

-- Criar políticas para o storage bucket
CREATE POLICY "Users can view service order images in storage" ON storage.objects
    FOR SELECT USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload service order images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update service order images in storage" ON storage.objects
    FOR UPDATE USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete service order images from storage" ON storage.objects
    FOR DELETE USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');