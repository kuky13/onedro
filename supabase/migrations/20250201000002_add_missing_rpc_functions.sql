-- Adicionar funções RPC que estavam faltando no sistema de numeração sequencial
-- Data: 2025-02-01
-- Descrição: Implementar funções RPC adicionais conforme especificação

BEGIN;

-- 1. Função RPC para obter próximo número sequencial (sem incrementar)
CREATE OR REPLACE FUNCTION public.get_next_sequential_number()
RETURNS INTEGER AS $$
DECLARE
  v_user_id UUID;
  v_current_number INTEGER;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Obter número atual (sem incrementar)
  SELECT current_number INTO v_current_number 
  FROM user_sequence_control 
  WHERE user_id = v_user_id;
  
  -- Se não existir registro, retornar 1 (próximo será 1)
  IF v_current_number IS NULL THEN
    RETURN 1;
  END IF;
  
  -- Retornar próximo número
  IF v_current_number >= 9999 THEN
    RETURN 1; -- Reset após 9999
  ELSE
    RETURN v_current_number + 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Função RPC para listar sequências do usuário
CREATE OR REPLACE FUNCTION public.list_user_sequences()
RETURNS TABLE(
  current_number INTEGER,
  next_number INTEGER,
  last_reset_at TIMESTAMPTZ,
  remaining_numbers INTEGER,
  status TEXT,
  total_service_orders BIGINT,
  total_budgets BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  RETURN QUERY
  SELECT 
    usc.current_number,
    CASE 
      WHEN usc.current_number >= 9999 THEN 1
      ELSE usc.current_number + 1
    END as next_number,
    usc.last_reset_at,
    (9999 - usc.current_number) as remaining_numbers,
    CASE 
      WHEN usc.current_number > 9000 THEN 'CRITICAL'::TEXT
      WHEN usc.current_number > 8000 THEN 'WARNING'::TEXT
      WHEN usc.current_number > 6000 THEN 'ATTENTION'::TEXT
      ELSE 'OK'::TEXT
    END as status,
    (
      SELECT COUNT(*) FROM service_orders 
      WHERE owner_id = v_user_id AND deleted_at IS NULL
    ) as total_service_orders,
    (
      SELECT COUNT(*) FROM budgets 
      WHERE owner_id = v_user_id AND deleted_at IS NULL
    ) as total_budgets,
    usc.created_at,
    usc.updated_at
  FROM user_sequence_control usc
  WHERE usc.user_id = v_user_id;
  
  -- Se não existir registro, retornar valores padrão
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      0 as current_number,
      1 as next_number,
      NULL::TIMESTAMPTZ as last_reset_at,
      9999 as remaining_numbers,
      'OK'::TEXT as status,
      (
        SELECT COUNT(*) FROM service_orders 
        WHERE owner_id = v_user_id AND deleted_at IS NULL
      ) as total_service_orders,
      (
        SELECT COUNT(*) FROM budgets 
        WHERE owner_id = v_user_id AND deleted_at IS NULL
      ) as total_budgets,
      NULL::TIMESTAMPTZ as created_at,
      NULL::TIMESTAMPTZ as updated_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função RPC para reset de sequência do usuário
CREATE OR REPLACE FUNCTION public.reset_user_sequence()
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_affected_rows INTEGER;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Inserir registro se não existir
  INSERT INTO user_sequence_control (user_id, current_number)
  VALUES (v_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Reset da sequência
  UPDATE user_sequence_control 
  SET 
    current_number = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  RETURN v_affected_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função RPC para formatação de número sequencial (versão pública)
CREATE OR REPLACE FUNCTION public.format_sequential_number(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF seq_number IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN format_user_sequence_id(seq_number);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 5. Função RPC para busca por número sequencial (versão simplificada)
CREATE OR REPLACE FUNCTION public.search_by_sequential_number(search_number INTEGER)
RETURNS TABLE(
  item_type TEXT,
  id UUID,
  formatted_id TEXT,
  title TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Obter ID do usuário autenticado
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  RETURN QUERY
  SELECT * FROM search_by_sequential_id(v_user_id, search_number::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Permissões para as novas funções
GRANT EXECUTE ON FUNCTION get_next_sequential_number() TO authenticated;
GRANT EXECUTE ON FUNCTION list_user_sequences() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_user_sequence() TO authenticated;
GRANT EXECUTE ON FUNCTION format_sequential_number(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_by_sequential_number(INTEGER) TO authenticated;

-- 7. Função para verificar permissões das tabelas
CREATE OR REPLACE FUNCTION check_table_permissions()
RETURNS TABLE(
  table_name TEXT,
  grantee TEXT,
  privilege_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rtg.table_name::TEXT,
    rtg.grantee::TEXT,
    rtg.privilege_type::TEXT
  FROM information_schema.role_table_grants rtg
  WHERE rtg.table_schema = 'public' 
    AND rtg.grantee IN ('anon', 'authenticated')
    AND rtg.table_name IN ('user_sequence_control', 'service_orders', 'budgets')
  ORDER BY rtg.table_name, rtg.grantee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_table_permissions() TO authenticated;

-- 8. Garantir permissões básicas nas tabelas
GRANT SELECT ON user_sequence_control TO anon;
GRANT ALL PRIVILEGES ON user_sequence_control TO authenticated;

GRANT SELECT ON service_orders TO anon;
GRANT ALL PRIVILEGES ON service_orders TO authenticated;

GRANT SELECT ON budgets TO anon;
GRANT ALL PRIVILEGES ON budgets TO authenticated;

COMMIT;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Funções RPC adicionais criadas com sucesso!';
  RAISE NOTICE 'Novas funções disponíveis:';
  RAISE NOTICE '- get_next_sequential_number(): Obter próximo número';
  RAISE NOTICE '- list_user_sequences(): Listar sequências do usuário';
  RAISE NOTICE '- reset_user_sequence(): Reset da sequência';
  RAISE NOTICE '- format_sequential_number(int): Formatação de número';
  RAISE NOTICE '- search_by_sequential_number(int): Busca por número';
  RAISE NOTICE '- check_table_permissions(): Verificar permissões';
END
$$;