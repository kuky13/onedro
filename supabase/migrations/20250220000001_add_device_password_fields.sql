-- Migração para adicionar campos de senha do dispositivo
-- Arquivo: 20250220000001_add_device_password_fields.sql

-- Adicionar campos de senha à tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS device_password_type VARCHAR(20) 
    CHECK (device_password_type IN ('pin', 'abc', 'pattern')),
ADD COLUMN IF NOT EXISTS device_password_value TEXT,
ADD COLUMN IF NOT EXISTS device_password_metadata JSONB;

-- Criar índice para consultas por tipo de senha
CREATE INDEX IF NOT EXISTS idx_service_orders_password_type 
ON service_orders(device_password_type) 
WHERE device_password_type IS NOT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN service_orders.device_password_type IS 'Tipo de senha do dispositivo: pin, abc ou pattern';
COMMENT ON COLUMN service_orders.device_password_value IS 'Valor da senha do dispositivo (armazenado de forma segura)';
COMMENT ON COLUMN service_orders.device_password_metadata IS 'Metadados adicionais para senhas complexas como padrões';

-- Atualizar função de busca para incluir novos campos
CREATE OR REPLACE FUNCTION update_service_orders_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('portuguese', 
        COALESCE(NEW.device_type, '') || ' ' ||
        COALESCE(NEW.device_model, '') || ' ' ||
        COALESCE(NEW.imei_serial, '') || ' ' ||
        COALESCE(NEW.reported_issue, '') || ' ' ||
        COALESCE(NEW.device_password_type, '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Os campos herdam automaticamente as políticas RLS existentes da tabela service_orders