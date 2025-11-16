-- Limpeza forçada de todas as funções admin
-- Remove todas as possíveis versões das funções admin

-- Buscar e remover todas as funções admin_update_license
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'admin_update_license' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s)', func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Buscar e remover todas as funções admin_extend_license
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'admin_extend_license' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s)', func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Buscar e remover todas as funções admin_transfer_license
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname = 'admin_transfer_license' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s)', func_record.proname, func_record.args);
    END LOOP;
END $$;

-- Remover índices antigos
DROP INDEX IF EXISTS public.idx_license_history_admin_id;