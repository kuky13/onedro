-- Criar tabela para armazenar imagens das ordens de serviço
CREATE TABLE service_order_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    upload_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_service_order_images_service_order_id ON service_order_images(service_order_id);
CREATE INDEX idx_service_order_images_upload_order ON service_order_images(service_order_id, upload_order);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_service_order_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_order_images_updated_at
    BEFORE UPDATE ON service_order_images
    FOR EACH ROW
    EXECUTE FUNCTION update_service_order_images_updated_at();

-- Criar bucket para armazenar as imagens (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-order-images', 'service-order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para service_order_images
ALTER TABLE service_order_images ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT para usuários autenticados
CREATE POLICY "Users can view service order images" ON service_order_images
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir INSERT para usuários autenticados
CREATE POLICY "Users can insert service order images" ON service_order_images
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "Users can update service order images" ON service_order_images
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Política para permitir DELETE para usuários autenticados
CREATE POLICY "Users can delete service order images" ON service_order_images
    FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para o storage bucket
CREATE POLICY "Users can view service order images in storage" ON storage.objects
    FOR SELECT USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload service order images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update service order images in storage" ON storage.objects
    FOR UPDATE USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete service order images from storage" ON storage.objects
    FOR DELETE USING (bucket_id = 'service-order-images' AND auth.role() = 'authenticated');

-- Adicionar constraint para limitar máximo de 3 imagens por ordem de serviço
ALTER TABLE service_order_images 
ADD CONSTRAINT check_max_images_per_order 
CHECK (upload_order <= 3);

-- Adicionar constraint para garantir que upload_order seja único por service_order_id
ALTER TABLE service_order_images 
ADD CONSTRAINT unique_upload_order_per_service_order 
UNIQUE (service_order_id, upload_order);