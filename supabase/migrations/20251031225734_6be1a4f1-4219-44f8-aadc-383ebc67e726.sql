-- Adicionar política RLS para permitir visualização pública de imagens
-- Permite acesso às imagens quando elas são de ordens de serviço que podem ser compartilhadas
CREATE POLICY "Anyone can view service order images"
ON service_order_images
FOR SELECT
USING (true);

-- Garantir que o bucket service-order-images seja público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'service-order-images';