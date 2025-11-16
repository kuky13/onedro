-- Adicionar colunas para Mercado Pago na tabela payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS mercadopago_preapproval_id TEXT,
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Criar índices para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_payments_mercadopago_preapproval 
ON payments(mercadopago_preapproval_id);

CREATE INDEX IF NOT EXISTS idx_payments_mercadopago_payment 
ON payments(mercadopago_payment_id);

-- Adicionar comentários para documentação
COMMENT ON COLUMN payments.mercadopago_preapproval_id IS 'ID da assinatura (preapproval) no Mercado Pago para pagamentos recorrentes';
COMMENT ON COLUMN payments.mercadopago_payment_id IS 'ID do pagamento individual no Mercado Pago';
COMMENT ON COLUMN payments.payment_method IS 'Método de pagamento usado (credit_card, pix, boleto, etc)';