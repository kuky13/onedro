-- Correção de Conflitos no Sistema de Numeração Sequencial
-- Remove sistema antigo global e implementa separação OS/OR
-- Data: 2025-02-02
-- Autor: OneDrip System

BEGIN;

-- 1. REMOVER SISTEMA ANTIGO DE NUMERAÇÃO GLOBAL COM CASCADE
-- Remover view primeiro
DROP VIEW IF EXISTS v_sequence_status CASCADE;

-- Remover trigger antigo
DROP TRIGGER IF EXISTS trigger_assign_sequential_number ON service_orders;

-- Remover função antiga
DROP FUNCTION IF EXISTS assign_sequential_number() CASCADE;

-- Remover índice antigo que está causando conflito
DROP INDEX IF EXISTS idx_service_orders_sequential_number;

-- Remover tabela de controle global com CASCADE
DROP TABLE IF EXISTS service_order_sequence CASCADE;

-- 2. CRIAR SISTEMA DE NUMERAÇÃO SEPARADO PARA OS E OR
-- Criar tabela de controle separada para cada tipo
CREATE TABLE IF NOT EXISTS user_sequence_control_service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_number INTEGER NOT NULL DEFAULT 0 CHECK (current_number >= 0 AND current_number <= 9999),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_sequence_control_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_number INTEGER NOT NULL DEFAULT 0 CHECK (current_number >= 0 AND current_number <= 9999),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_sequence_service_orders_user_id ON user_sequence_control_service_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sequence_budgets_user_id ON user_sequence_control_budgets(user_id);

-- 3. FUNÇÕES PARA GERAR NÚMEROS SEQUENCIAIS SEPARADOS
-- Função para Service Orders (OS)
CREATE OR REPLACE FUNCTION generate_service_order_sequential_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Lock advisory para evitar concorrência
  PERFORM pg_advisory_lock(hashtext('service_order_' || p_user_id::text));
  
  -- Inserir registro se não existir
  INSERT INTO user_sequence_control_service_orders (user_id, current_number)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Obter número atual
  SELECT current_number INTO v_current_number 
  FROM user_sequence_control_service_orders 
  WHERE user_id = p_user_id;
  
  -- Calcular próximo número
  v_new_number := v_current_number + 1;
  
  -- Reset automático após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE user_sequence_control_service_orders 
    SET current_number = v_new_number, 
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_sequence_control_service_orders 
    SET current_number = v_new_number,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Liberar lock
  PERFORM pg_advisory_unlock(hashtext('service_order_' || p_user_id::text));
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para Budgets (OR)
CREATE OR REPLACE FUNCTION generate_budget_sequential_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Lock advisory para evitar concorrência
  PERFORM pg_advisory_lock(hashtext('budget_' || p_user_id::text));
  
  -- Inserir registro se não existir
  INSERT INTO user_sequence_control_budgets (user_id, current_number)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Obter número atual
  SELECT current_number INTO v_current_number 
  FROM user_sequence_control_budgets 
  WHERE user_id = p_user_id;
  
  -- Calcular próximo número
  v_new_number := v_current_number + 1;
  
  -- Reset automático após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE user_sequence_control_budgets 
    SET current_number = v_new_number, 
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_sequence_control_budgets 
    SET current_number = v_new_number,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Liberar lock
  PERFORM pg_advisory_unlock(hashtext('budget_' || p_user_id::text));
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÕES DE FORMATAÇÃO SEPARADAS
-- Função para formatação de Service Orders (OS)
CREATE OR REPLACE FUNCTION format_service_order_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS: ' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para formatação de Budgets (OR)
CREATE OR REPLACE FUNCTION format_budget_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OR: ' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. TRIGGERS ATUALIZADOS
-- Trigger para Service Orders
CREATE OR REPLACE FUNCTION assign_service_order_sequential_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_service_order_sequential_number(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_sequential_service_orders ON service_orders;
CREATE TRIGGER trigger_assign_service_order_sequential
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_service_order_sequential_number();

-- Trigger para Budgets
CREATE OR REPLACE FUNCTION assign_budget_sequential_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_budget_sequential_number(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_sequential_budgets ON budgets;
CREATE TRIGGER trigger_assign_budget_sequential
  BEFORE INSERT ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION assign_budget_sequential_number();

-- 6. MIGRAÇÃO DE DADOS EXISTENTES
-- Resetar sequential_number para evitar conflitos
UPDATE service_orders SET sequential_number = NULL WHERE sequential_number IS NOT NULL;
UPDATE budgets SET sequential_number = NULL WHERE sequential_number IS NOT NULL;

-- Atribuir novos números sequenciais para Service Orders
WITH numbered_service_orders AS (
  SELECT 
    id,
    owner_id,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at) as new_seq_num
  FROM service_orders 
  WHERE deleted_at IS NULL
)
UPDATE service_orders 
SET sequential_number = numbered_service_orders.new_seq_num
FROM numbered_service_orders
WHERE service_orders.id = numbered_service_orders.id;

-- Atribuir novos números sequenciais para Budgets
WITH numbered_budgets AS (
  SELECT 
    id,
    owner_id,
    ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at) as new_seq_num
  FROM budgets 
  WHERE deleted_at IS NULL
)
UPDATE budgets 
SET sequential_number = numbered_budgets.new_seq_num
FROM numbered_budgets
WHERE budgets.id = numbered_budgets.id;

-- Atualizar contadores nas tabelas de controle
INSERT INTO user_sequence_control_service_orders (user_id, current_number)
SELECT 
  owner_id,
  COALESCE(MAX(sequential_number), 0)
FROM service_orders 
WHERE deleted_at IS NULL
GROUP BY owner_id
ON CONFLICT (user_id) DO UPDATE SET current_number = EXCLUDED.current_number;

INSERT INTO user_sequence_control_budgets (user_id, current_number)
SELECT 
  owner_id,
  COALESCE(MAX(sequential_number), 0)
FROM budgets 
WHERE deleted_at IS NULL
GROUP BY owner_id
ON CONFLICT (user_id) DO UPDATE SET current_number = EXCLUDED.current_number;

-- 7. ATUALIZAR FUNÇÃO RPC DE BUSCA
CREATE OR REPLACE FUNCTION public.search_by_sequential_id(
  p_user_id uuid,
  p_search_term text
)
RETURNS TABLE(
  item_type text,
  id uuid,
  formatted_id text,
  title text,
  created_at timestamptz
) AS $$
BEGIN
  -- Extrair número da busca (ex: "OS: 0001" -> 1 ou "OR: 0001" -> 1)
  DECLARE
    v_search_number INTEGER;
  BEGIN
    v_search_number := CAST(regexp_replace(p_search_term, '[^0-9]', '', 'g') AS INTEGER);
  EXCEPTION
    WHEN OTHERS THEN
      v_search_number := NULL;
  END;
  
  RETURN QUERY
  -- Buscar em Service Orders
  SELECT 
    'service_order'::text as item_type,
    so.id,
    format_service_order_id(so.sequential_number) as formatted_id,
    (so.device_type || ' - ' || so.device_model) as title,
    so.created_at
  FROM service_orders so
  WHERE so.owner_id = p_user_id
    AND so.deleted_at IS NULL
    AND so.sequential_number IS NOT NULL
    AND (
      v_search_number IS NOT NULL AND so.sequential_number = v_search_number
      OR format_service_order_id(so.sequential_number) ILIKE '%' || p_search_term || '%'
      OR so.device_type ILIKE '%' || p_search_term || '%'
      OR so.device_model ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- Buscar em Budgets
  SELECT 
    'budget'::text as item_type,
    b.id,
    format_budget_id(b.sequential_number) as formatted_id,
    (COALESCE(b.client_name, 'Cliente não informado') || ' - ' || COALESCE(b.device_type, 'Dispositivo')) as title,
    b.created_at
  FROM budgets b
  WHERE b.owner_id = p_user_id
    AND b.deleted_at IS NULL
    AND b.sequential_number IS NOT NULL
    AND (
      v_search_number IS NOT NULL AND b.sequential_number = v_search_number
      OR format_budget_id(b.sequential_number) ILIKE '%' || p_search_term || '%'
      OR b.client_name ILIKE '%' || p_search_term || '%'
      OR b.device_type ILIKE '%' || p_search_term || '%'
    )
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. CONCEDER PERMISSÕES
GRANT SELECT ON user_sequence_control_service_orders TO anon, authenticated;
GRANT SELECT ON user_sequence_control_budgets TO anon, authenticated;
GRANT EXECUTE ON FUNCTION format_service_order_id(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION format_budget_id(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_by_sequential_id(uuid, text) TO anon, authenticated;

-- 9. COMENTÁRIOS
COMMENT ON TABLE user_sequence_control_service_orders IS 'Controla numeração sequencial de Service Orders por usuário (OS: 0001-9999)';
COMMENT ON TABLE user_sequence_control_budgets IS 'Controla numeração sequencial de Budgets por usuário (OR: 0001-9999)';
COMMENT ON FUNCTION format_service_order_id(INTEGER) IS 'Formata número sequencial para Service Orders como "OS: 0000"';
COMMENT ON FUNCTION format_budget_id(INTEGER) IS 'Formata número sequencial para Budgets como "OR: 0000"';

-- 10. REMOVER FUNÇÕES ANTIGAS DO SISTEMA UNIFICADO
DROP FUNCTION IF EXISTS generate_user_sequential_number(UUID) CASCADE;
DROP FUNCTION IF EXISTS format_user_sequence_id(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS assign_user_sequential_number_service_orders() CASCADE;
DROP FUNCTION IF EXISTS assign_user_sequential_number_budgets() CASCADE;

-- Remover tabela de controle unificada antiga
DROP TABLE IF EXISTS user_sequence_control CASCADE;

COMMIT;