-- Adicionar colunas para Shopify na tabela payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS shopify_order_id TEXT,
ADD COLUMN IF NOT EXISTS shopify_checkout_id TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payments_shopify_order 
ON payments(shopify_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_shopify_checkout 
ON payments(shopify_checkout_id);

-- Adicionar comentários para documentação
COMMENT ON COLUMN payments.shopify_order_id IS 'ID do pedido no Shopify';
COMMENT ON COLUMN payments.shopify_checkout_id IS 'ID do checkout no Shopify';
COMMENT ON COLUMN payments.completed_at IS 'Data e hora de conclusão do pagamento';