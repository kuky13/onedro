-- Limpeza de funções admin duplicadas antes da correção final
-- Remove todas as versões das funções admin para evitar conflitos

-- Remover todas as versões da função admin_update_license
DROP FUNCTION IF EXISTS public.admin_update_license(uuid, text, timestamp with time zone, boolean, text);
DROP FUNCTION IF EXISTS public.admin_update_license(uuid, text, timestamp with time zone, boolean);
DROP FUNCTION IF EXISTS public.admin_update_license(uuid, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.admin_update_license(uuid, text);
DROP FUNCTION IF EXISTS public.admin_update_license(uuid);

-- Remover todas as versões da função admin_extend_license
DROP FUNCTION IF EXISTS public.admin_extend_license(uuid, integer);
DROP FUNCTION IF EXISTS public.admin_extend_license(uuid);

-- Remover todas as versões da função admin_transfer_license
DROP FUNCTION IF EXISTS public.admin_transfer_license(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_transfer_license(uuid);

-- Remover índices antigos que podem estar duplicados
DROP INDEX IF EXISTS public.idx_license_history_admin_id;

-- Comentário
COMMENT ON SCHEMA public IS 'Limpeza de funções admin duplicadas concluída';