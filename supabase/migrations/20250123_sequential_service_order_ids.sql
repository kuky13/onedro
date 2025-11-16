-- Implementação de IDs Sequenciais para Ordens de Serviço
-- Data: 2025-01-23
-- Descrição: Adiciona sistema de numeração sequencial (0001-9999) mantendo UUIDs como chave primária

-- 1. Criar tabela de controle de sequência
CREATE TABLE IF NOT EXISTS service_order_sequence (
  id SERIAL PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir registro inicial
INSERT INTO service_order_sequence (current_number) VALUES (0)
ON CONFLICT DO NOTHING;

-- 2. Adicionar coluna sequential_number à tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sequential_number INTEGER;

-- Criar índice único para sequential_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_sequential_number 
ON service_orders(sequential_number) 
WHERE sequential_number IS NOT NULL;

-- 3. Função para gerar número sequencial
CREATE OR REPLACE FUNCTION generate_sequential_number()
RETURNS INTEGER AS $$
DECLARE
  v_current_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Lock para evitar concorrência
  LOCK TABLE service_order_sequence IN EXCLUSIVE MODE;
  
  -- Obter número atual
  SELECT current_number INTO v_current_number 
  FROM service_order_sequence 
  WHERE id = 1;
  
  -- Se não existe registro, criar
  IF v_current_number IS NULL THEN
    INSERT INTO service_order_sequence (current_number) VALUES (0);
    v_current_number := 0;
  END IF;
  
  -- Incrementar número
  v_new_number := v_current_number + 1;
  
  -- Reset após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE service_order_sequence 
    SET current_number = v_new_number, 
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = 1;
  ELSE
    UPDATE service_order_sequence 
    SET current_number = v_new_number,
        updated_at = NOW()
    WHERE id = 1;
  END IF;
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para formatação do ID
CREATE OR REPLACE FUNCTION format_service_order_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS: ' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Função do trigger para atribuir número sequencial
CREATE OR REPLACE FUNCTION assign_sequential_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Atribuir número sequencial apenas para novos registros
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_sequential_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger
DROP TRIGGER IF EXISTS trigger_assign_sequential_number ON service_orders;
CREATE TRIGGER trigger_assign_sequential_number
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_sequential_number();

-- 7. Migração de dados existentes
-- Atribuir números sequenciais aos registros existentes
WITH numbered_orders AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as seq_num
  FROM service_orders 
  WHERE deleted_at IS NULL
    AND sequential_number IS NULL
)
UPDATE service_orders 
SET sequential_number = numbered_orders.seq_num
FROM numbered_orders
WHERE service_orders.id = numbered_orders.id;

-- Atualizar contador de sequência
UPDATE service_order_sequence 
SET current_number = (
  SELECT COALESCE(MAX(sequential_number), 0) 
  FROM service_orders
)
WHERE id = 1;

-- 8. Atualizar função RPC get_service_order_by_share_token
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  device_type varchar,
  device_model varchar,
  reported_issue text,
  status varchar,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Validação do token
  IF NOT EXISTS (
    SELECT 1 FROM service_order_shares 
    WHERE share_token = p_share_token 
    AND is_active = true 
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  -- Retornar dados com novo formato
  RETURN QUERY
  SELECT 
    so.id,
    format_service_order_id(so.sequential_number) as formatted_id,
    so.device_type,
    so.device_model,
    so.reported_issue,
    so.status::varchar,
    so.created_at,
    so.updated_at
  FROM service_orders so
  JOIN service_order_shares sos ON so.id = sos.service_order_id
  WHERE sos.share_token = p_share_token
    AND sos.is_active = true
    AND sos.expires_at > now()
    AND so.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. View para monitorar uso da sequência
CREATE OR REPLACE VIEW v_sequence_status AS
SELECT 
  current_number,
  last_reset_at,
  (9999 - current_number) as remaining_numbers,
  CASE 
    WHEN current_number > 9000 THEN 'ALERT'
    WHEN current_number > 8000 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM service_order_sequence
WHERE id = 1;

-- 10. Conceder permissões necessárias
GRANT SELECT ON service_order_sequence TO anon, authenticated;
GRANT SELECT ON v_sequence_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION format_service_order_id(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_service_order_by_share_token(text) TO anon, authenticated;

-- Comentários para documentação
COMMENT ON TABLE service_order_sequence IS 'Controla a numeração sequencial das ordens de serviço (0001-9999)';
COMMENT ON COLUMN service_orders.sequential_number IS 'Número sequencial para exibição (0001-9999)';
COMMENT ON FUNCTION generate_sequential_number() IS 'Gera próximo número sequencial com reset automático após 9999';
COMMENT ON FUNCTION format_service_order_id(INTEGER) IS 'Formata número sequencial para exibição como "OS: 0000"';
COMMENT ON VIEW v_sequence_status IS 'Monitora o status atual da numeração sequencial';