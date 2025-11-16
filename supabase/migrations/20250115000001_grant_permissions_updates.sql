-- ============================================
-- PERMISSÕES PARA SISTEMA DE ATUALIZAÇÕES
-- OneDrip - Garantir acesso aos roles anon e authenticated
-- ============================================

-- Conceder permissões básicas para a tabela updates
GRANT SELECT ON updates TO anon;
GRANT SELECT ON updates TO authenticated;

-- Conceder permissões para a tabela user_update_preferences
GRANT SELECT, INSERT, UPDATE ON user_update_preferences TO authenticated;

-- Verificar se as funções existem e conceder permissões
GRANT EXECUTE ON FUNCTION dismiss_update(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_dismissed_update(UUID) TO authenticated;

-- Comentários para documentação
COMMENT ON SCHEMA public IS 'Schema público com permissões para sistema de atualizações';