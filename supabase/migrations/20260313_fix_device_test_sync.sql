-- Função RPC para atualizar um resultado de teste específico
CREATE OR REPLACE FUNCTION update_device_test_result(
  p_session_id UUID,
  p_test_id TEXT,
  p_result JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE device_test_sessions
  SET test_results = jsonb_set(
    COALESCE(test_results, '{}'::jsonb),
    ARRAY[p_test_id],
    p_result,
    true
  ),
  updated_at = NOW()
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índice para melhorar a busca por origem do teste (quick_test vs diagnostic)
CREATE INDEX IF NOT EXISTS idx_device_test_sessions_source 
ON device_test_sessions ((device_info->>'source'));

-- Garantir que as políticas de RLS permitem atualização para quem tem acesso
-- (As policies existentes já devem cobrir, mas reforçando a segurança da RPC)
GRANT EXECUTE ON FUNCTION update_device_test_result TO authenticated, anon;
