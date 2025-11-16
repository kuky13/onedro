
-- 1) Remover acesso público à tabela de licenças
DROP POLICY IF EXISTS "Allow public read access to licenses" ON public.licenses;

-- Observações:
-- - Mantemos:
--   "Admins can manage all licenses" (ALL via is_current_user_admin())
--   "Users can view their active licenses" (SELECT onde auth.uid() = user_id AND is_active = true)
-- - Usuários sem licença ou com licença expirada continuam sendo atendidos via RPC
--   validate_user_license_complete, que já existe e encapsula a lógica necessária.
