-- Sistema de Numeração Sequencial Unificado
-- Implementa numeração OS: 0001-9999 por usuário para Service Orders e Worm Budgets
-- Data: 2025-02-01
-- Autor: OneDrip System

-- Início da transação
BEGIN;

-- 1. Criar tabela de controle de sequência por usuário
CREATE TABLE IF NOT EXISTS user_sequence_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_number INTEGER NOT NULL DEFAULT 0 CHECK (current_number >= 0 AND current_number <= 9999),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_sequence_control_user_id ON user_sequence_control(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sequence_control_current_number ON user_sequence_control(current_number);

-- Comentários
COMMENT ON TABLE user_sequence_control IS 'Controla numeração sequencial por usuário (0001-9999)';
COMMENT ON COLUMN user_sequence_control.current_number IS 'Número atual da sequência (0-9999)';
COMMENT ON COLUMN user_sequence_control.last_reset_at IS 'Última vez que a sequência foi resetada';

-- 2. Adicionar campo sequential_number na tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sequential_number INTEGER;

-- Índice único por usuário para service_orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_user_sequential 
ON service_orders(owner_id, sequential_number) 
WHERE sequential_number IS NOT NULL AND deleted_at IS NULL;

-- Comentário
COMMENT ON COLUMN service_orders.sequential_number IS 'Número sequencial por usuário (1-9999)';

-- 3. Adicionar campo sequential_number na tabela budgets
ALTER TABLE budgets 
ADD COLUMN IF NOT EXISTS sequential_number INTEGER;

-- Índice único por usuário para budgets
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_sequential 
ON budgets(owner_id, sequential_number) 
WHERE sequential_number IS NOT NULL AND deleted_at IS NULL;

-- Comentário
COMMENT ON COLUMN budgets.sequential_number IS 'Número sequencial por usuário (1-9999)';

-- 4. Função para gerar próximo número sequencial
CREATE OR REPLACE FUNCTION generate_user_sequential_number(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Lock advisory para evitar concorrência
  PERFORM pg_advisory_lock(hashtext(p_user_id::text));
  
  -- Inserir registro se não existir
  INSERT INTO user_sequence_control (user_id, current_number)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Obter número atual
  SELECT current_number INTO v_current_number 
  FROM user_sequence_control 
  WHERE user_id = p_user_id;
  
  -- Calcular próximo número
  v_new_number := v_current_number + 1;
  
  -- Reset automático após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE user_sequence_control 
    SET current_number = v_new_number, 
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_sequence_control 
    SET current_number = v_new_number,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Liberar lock
  PERFORM pg_advisory_unlock(hashtext(p_user_id::text));
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função para formatação
CREATE OR REPLACE FUNCTION format_user_sequence_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS: ' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Triggers para atribuição automática em service_orders
CREATE OR REPLACE FUNCTION assign_user_sequential_number_service_orders()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_user_sequential_number(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_sequential_service_orders ON service_orders;
CREATE TRIGGER trigger_assign_user_sequential_service_orders
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_sequential_number_service_orders();

-- 7. Triggers para atribuição automática em budgets
CREATE OR REPLACE FUNCTION assign_user_sequential_number_budgets()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_user_sequential_number(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_user_sequential_budgets ON budgets;
CREATE TRIGGER trigger_assign_user_sequential_budgets
  BEFORE INSERT ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION assign_user_sequential_number_budgets();

-- 8. Função RPC para busca unificada por ID sequencial
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
  -- Extrair número da busca (ex: "OS: 0001" -> 1)
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
    format_user_sequence_id(so.sequential_number) as formatted_id,
    (so.device_type || ' - ' || so.device_model) as title,
    so.created_at
  FROM service_orders so
  WHERE so.owner_id = p_user_id
    AND so.deleted_at IS NULL
    AND so.sequential_number IS NOT NULL
    AND (
      v_search_number IS NOT NULL AND so.sequential_number = v_search_number
      OR format_user_sequence_id(so.sequential_number) ILIKE '%' || p_search_term || '%'
      OR so.device_type ILIKE '%' || p_search_term || '%'
      OR so.device_model ILIKE '%' || p_search_term || '%'
    )
  
  UNION ALL
  
  -- Buscar em Budgets
  SELECT 
    'budget'::text as item_type,
    b.id,
    format_user_sequence_id(b.sequential_number) as formatted_id,
    (COALESCE(b.client_name, 'Cliente não informado') || ' - ' || COALESCE(b.device_type, 'Dispositivo')) as title,
    b.created_at
  FROM budgets b
  WHERE b.owner_id = p_user_id
    AND b.deleted_at IS NULL
    AND b.sequential_number IS NOT NULL
    AND (
      v_search_number IS NOT NULL AND b.sequential_number = v_search_number
      OR format_user_sequence_id(b.sequential_number) ILIKE '%' || p_search_term || '%'
      OR b.client_name ILIKE '%' || p_search_term || '%'
      OR b.device_type ILIKE '%' || p_search_term || '%'
    )
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Atualizar função get_service_orders para incluir formatted_id
CREATE OR REPLACE FUNCTION public.get_service_orders_with_sequence(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  device_type varchar,
  device_model varchar,
  status varchar,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    CASE 
      WHEN so.sequential_number IS NOT NULL THEN format_user_sequence_id(so.sequential_number)
      ELSE NULL
    END as formatted_id,
    so.device_type,
    so.device_model,
    so.status::varchar,
    so.created_at
  FROM service_orders so
  WHERE so.owner_id = auth.uid()
    AND so.deleted_at IS NULL
    AND (p_status IS NULL OR so.status::text = p_status)
  ORDER BY so.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Criar função para buscar budgets com formatted_id
CREATE OR REPLACE FUNCTION public.get_worm_budgets_with_sequence(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  client_name text,
  device_type text,
  total_price numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    CASE 
      WHEN b.sequential_number IS NOT NULL THEN format_user_sequence_id(b.sequential_number)
      ELSE NULL
    END as formatted_id,
    b.client_name,
    b.device_type,
    b.total_price,
    b.created_at
  FROM budgets b
  WHERE b.owner_id = p_user_id
    AND b.deleted_at IS NULL
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Permissões para usuários autenticados
GRANT SELECT ON user_sequence_control TO authenticated;
GRANT EXECUTE ON FUNCTION generate_user_sequential_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION format_user_sequence_id(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_by_sequential_id(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_orders_with_sequence(INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_worm_budgets_with_sequence(UUID, INTEGER, INTEGER) TO authenticated;

-- 12. RLS (Row Level Security)
ALTER TABLE user_sequence_control ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seu próprio controle de sequência
DROP POLICY IF EXISTS "Users can view own sequence control" ON user_sequence_control;
CREATE POLICY "Users can view own sequence control" ON user_sequence_control
  FOR SELECT USING (user_id = auth.uid());

-- Política para usuários atualizarem apenas seu próprio controle
DROP POLICY IF EXISTS "Users can update own sequence control" ON user_sequence_control;
CREATE POLICY "Users can update own sequence control" ON user_sequence_control
  FOR UPDATE USING (user_id = auth.uid());

-- Política para inserção (sistema)
DROP POLICY IF EXISTS "System can insert sequence control" ON user_sequence_control;
CREATE POLICY "System can insert sequence control" ON user_sequence_control
  FOR INSERT WITH CHECK (true);

-- 13. View para monitoramento de status das sequências
CREATE OR REPLACE VIEW v_user_sequence_status AS
SELECT 
  usc.user_id,
  up.name as user_name,
  usc.current_number,
  usc.last_reset_at,
  (9999 - usc.current_number) as remaining_numbers,
  CASE 
    WHEN usc.current_number > 9000 THEN 'CRITICAL'
    WHEN usc.current_number > 8000 THEN 'WARNING'
    WHEN usc.current_number > 6000 THEN 'ATTENTION'
    ELSE 'OK'
  END as status,
  (
    SELECT COUNT(*) FROM service_orders 
    WHERE owner_id = usc.user_id AND deleted_at IS NULL
  ) as total_service_orders,
  (
    SELECT COUNT(*) FROM budgets 
    WHERE owner_id = usc.user_id AND deleted_at IS NULL
  ) as total_budgets,
  usc.created_at,
  usc.updated_at
FROM user_sequence_control usc
LEFT JOIN user_profiles up ON up.id = usc.user_id
ORDER BY usc.current_number DESC;

-- Permissões para a view
GRANT SELECT ON v_user_sequence_status TO authenticated;

-- 14. Função de validação de integridade
CREATE OR REPLACE FUNCTION validate_sequence_integrity()
RETURNS TABLE(
  user_id uuid,
  issue_type text,
  description text
) AS $$
BEGIN
  RETURN QUERY
  -- Verificar duplicatas em service orders
  SELECT 
    so.owner_id,
    'DUPLICATE_SERVICE_ORDER'::text,
    'Números sequenciais duplicados em service orders'::text
  FROM service_orders so
  WHERE so.deleted_at IS NULL
    AND so.sequential_number IS NOT NULL
  GROUP BY so.owner_id, so.sequential_number
  HAVING COUNT(*) > 1
  
  UNION ALL
  
  -- Verificar duplicatas em budgets
  SELECT 
    b.owner_id,
    'DUPLICATE_BUDGET'::text,
    'Números sequenciais duplicados em budgets'::text
  FROM budgets b
  WHERE b.deleted_at IS NULL
    AND b.sequential_number IS NOT NULL
  GROUP BY b.owner_id, b.sequential_number
  HAVING COUNT(*) > 1
  
  UNION ALL
  
  -- Verificar conflitos entre service orders e budgets
  SELECT 
    so.owner_id,
    'CROSS_TABLE_CONFLICT'::text,
    'Mesmo número sequencial usado em service order e budget'::text
  FROM service_orders so
  INNER JOIN budgets b ON so.owner_id = b.owner_id 
    AND so.sequential_number = b.sequential_number
  WHERE so.deleted_at IS NULL 
    AND b.deleted_at IS NULL
    AND so.sequential_number IS NOT NULL
    AND b.sequential_number IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_sequence_integrity() TO authenticated;

-- 15. Função administrativa para reset de sequência (apenas admins)
CREATE OR REPLACE FUNCTION admin_reset_user_sequence(
  p_user_id uuid,
  p_admin_id uuid
)
RETURNS boolean AS $$
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem resetar sequências';
  END IF;
  
  -- Reset da sequência
  UPDATE user_sequence_control 
  SET 
    current_number = 0,
    last_reset_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log da operação (se a tabela admin_logs existir)
  BEGIN
    INSERT INTO admin_logs (
      admin_id,
      action,
      target_user_id,
      details
    ) VALUES (
      p_admin_id,
      'RESET_USER_SEQUENCE',
      p_user_id,
      jsonb_build_object(
        'action', 'Manual sequence reset',
        'timestamp', NOW()
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Ignorar se tabela admin_logs não existir
      NULL;
  END;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_reset_user_sequence(UUID, UUID) TO authenticated;

-- Confirmar transação
COMMIT;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE 'Sistema de Numeração Sequencial Unificado implementado com sucesso!';
  RAISE NOTICE 'Funcionalidades disponíveis:';
  RAISE NOTICE '- Numeração OS: 0001-9999 por usuário';
  RAISE NOTICE '- Compartilhamento de sequência entre Service Orders e Budgets';
  RAISE NOTICE '- Busca unificada por ID sequencial';
  RAISE NOTICE '- Funções RPC para frontend';
  RAISE NOTICE '- Sistema de monitoramento e validação';
  RAISE NOTICE '- Permissões e segurança configuradas';
END
$$;