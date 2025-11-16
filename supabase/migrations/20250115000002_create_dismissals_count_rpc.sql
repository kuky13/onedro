-- Função RPC para obter contagem de dismissals (apenas para admins)
-- Esta função permite que administradores obtenham estatísticas globais de dismissals
-- sem violar as políticas RLS

CREATE OR REPLACE FUNCTION get_dismissals_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dismissals_count INTEGER;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem acessar estatísticas globais';
  END IF;
  
  -- Contar total de dismissals
  SELECT COUNT(*)
  INTO dismissals_count
  FROM user_update_preferences
  WHERE dismissed = true;
  
  RETURN COALESCE(dismissals_count, 0);
END;
$$;

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_dismissals_count() TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION get_dismissals_count() IS 'Retorna o número total de dismissals de atualizações. Apenas administradores podem executar esta função.';