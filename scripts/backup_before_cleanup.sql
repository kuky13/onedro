-- ============================================
-- SCRIPT DE BACKUP PREVENTIVO ANTES DA LIMPEZA
-- OneDrip Database Cleanup - Backup Phase
-- Data: 02/10/2025
-- ============================================

-- Criar schema de backup com timestamp
CREATE SCHEMA IF NOT EXISTS backup_2025_10_02;

-- Criar tabela de log do backup
CREATE TABLE IF NOT EXISTS backup_2025_10_02.backup_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    original_schema VARCHAR(50),
    backup_table_name VARCHAR(100),
    record_count INTEGER,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'SUCCESS'
);

-- ============================================
-- BACKUP DAS TABELAS QUE SERÃO REMOVIDAS
-- ============================================

-- FASE 1: Tabelas completamente não utilizadas
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Backup pix_transactions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pix_transactions') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.pix_transactions_backup AS SELECT * FROM public.pix_transactions';
        SELECT COUNT(*) INTO table_count FROM public.pix_transactions;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('pix_transactions', 'public', 'pix_transactions_backup', table_count);
        RAISE NOTICE 'Backup criado: pix_transactions (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('pix_transactions', 'public', 'pix_transactions_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela pix_transactions não existe';
    END IF;

    -- Backup login_attempts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_attempts') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.login_attempts_backup AS SELECT * FROM public.login_attempts';
        SELECT COUNT(*) INTO table_count FROM public.login_attempts;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('login_attempts', 'public', 'login_attempts_backup', table_count);
        RAISE NOTICE 'Backup criado: login_attempts (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('login_attempts', 'public', 'login_attempts_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela login_attempts não existe';
    END IF;

    -- Backup rate_limit_tracking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limit_tracking') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.rate_limit_tracking_backup AS SELECT * FROM public.rate_limit_tracking';
        SELECT COUNT(*) INTO table_count FROM public.rate_limit_tracking;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('rate_limit_tracking', 'public', 'rate_limit_tracking_backup', table_count);
        RAISE NOTICE 'Backup criado: rate_limit_tracking (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('rate_limit_tracking', 'public', 'rate_limit_tracking_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela rate_limit_tracking não existe';
    END IF;

    -- Backup rate_limiting
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limiting') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.rate_limiting_backup AS SELECT * FROM public.rate_limiting';
        SELECT COUNT(*) INTO table_count FROM public.rate_limiting;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('rate_limiting', 'public', 'rate_limiting_backup', table_count);
        RAISE NOTICE 'Backup criado: rate_limiting (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('rate_limiting', 'public', 'rate_limiting_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela rate_limiting não existe';
    END IF;
END $$;

-- FASE 2: Backup da coluna search_vector da tabela budgets
DO $$
DECLARE
    column_exists BOOLEAN;
    table_count INTEGER;
BEGIN
    -- Verificar se a coluna search_vector existe na tabela budgets
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets' 
        AND column_name = 'search_vector'
    ) INTO column_exists;

    IF column_exists THEN
        -- Criar backup apenas da coluna search_vector
        EXECUTE 'CREATE TABLE backup_2025_10_02.budgets_search_vector_backup AS SELECT id, search_vector FROM public.budgets WHERE search_vector IS NOT NULL';
        SELECT COUNT(*) INTO table_count FROM public.budgets WHERE search_vector IS NOT NULL;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('budgets.search_vector', 'public', 'budgets_search_vector_backup', table_count);
        RAISE NOTICE 'Backup criado: budgets.search_vector (% registros com dados)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('budgets.search_vector', 'public', 'budgets_search_vector_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Coluna search_vector não existe na tabela budgets';
    END IF;
END $$;

-- FASE 3: Tabelas legadas
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    -- Backup user_activity_metrics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_metrics') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.user_activity_metrics_backup AS SELECT * FROM public.user_activity_metrics';
        SELECT COUNT(*) INTO table_count FROM public.user_activity_metrics;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('user_activity_metrics', 'public', 'user_activity_metrics_backup', table_count);
        RAISE NOTICE 'Backup criado: user_activity_metrics (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('user_activity_metrics', 'public', 'user_activity_metrics_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela user_activity_metrics não existe';
    END IF;

    -- Backup persistent_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persistent_sessions') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.persistent_sessions_backup AS SELECT * FROM public.persistent_sessions';
        SELECT COUNT(*) INTO table_count FROM public.persistent_sessions;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('persistent_sessions', 'public', 'persistent_sessions_backup', table_count);
        RAISE NOTICE 'Backup criado: persistent_sessions (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('persistent_sessions', 'public', 'persistent_sessions_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela persistent_sessions não existe';
    END IF;

    -- Backup user_notifications_read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications_read') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.user_notifications_read_backup AS SELECT * FROM public.user_notifications_read';
        SELECT COUNT(*) INTO table_count FROM public.user_notifications_read;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('user_notifications_read', 'public', 'user_notifications_read_backup', table_count);
        RAISE NOTICE 'Backup criado: user_notifications_read (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('user_notifications_read', 'public', 'user_notifications_read_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela user_notifications_read não existe';
    END IF;

    -- Backup vip_backup
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vip_backup') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.vip_backup_backup AS SELECT * FROM public.vip_backup';
        SELECT COUNT(*) INTO table_count FROM public.vip_backup;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('vip_backup', 'public', 'vip_backup_backup', table_count);
        RAISE NOTICE 'Backup criado: vip_backup (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('vip_backup', 'public', 'vip_backup_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela vip_backup não existe';
    END IF;

    -- Backup spam_patterns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spam_patterns') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.spam_patterns_backup AS SELECT * FROM public.spam_patterns';
        SELECT COUNT(*) INTO table_count FROM public.spam_patterns;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('spam_patterns', 'public', 'spam_patterns_backup', table_count);
        RAISE NOTICE 'Backup criado: spam_patterns (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('spam_patterns', 'public', 'spam_patterns_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela spam_patterns não existe';
    END IF;

    -- Backup service_order_shares
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_order_shares') THEN
        EXECUTE 'CREATE TABLE backup_2025_10_02.service_order_shares_backup AS SELECT * FROM public.service_order_shares';
        SELECT COUNT(*) INTO table_count FROM public.service_order_shares;
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count) 
        VALUES ('service_order_shares', 'public', 'service_order_shares_backup', table_count);
        RAISE NOTICE 'Backup criado: service_order_shares (% registros)', table_count;
    ELSE
        INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
        VALUES ('service_order_shares', 'public', 'service_order_shares_backup', 0, 'NOT_EXISTS');
        RAISE NOTICE 'Tabela service_order_shares não existe';
    END IF;
END $$;

-- ============================================
-- RESUMO DO BACKUP
-- ============================================

-- Inserir resumo final
INSERT INTO backup_2025_10_02.backup_log (table_name, original_schema, backup_table_name, record_count, status) 
VALUES ('BACKUP_SUMMARY', 'backup_2025_10_02', 'ALL_TABLES', 
    (SELECT COUNT(*) FROM backup_2025_10_02.backup_log WHERE status = 'SUCCESS'), 
    'COMPLETED');

-- Exibir resumo
SELECT 
    'BACKUP CONCLUÍDO' as status,
    COUNT(*) as total_backups_criados,
    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as backups_sucesso,
    SUM(CASE WHEN status = 'NOT_EXISTS' THEN 1 ELSE 0 END) as tabelas_nao_encontradas,
    SUM(record_count) as total_registros_backup
FROM backup_2025_10_02.backup_log 
WHERE table_name != 'BACKUP_SUMMARY';

-- Comando para verificar o backup
SELECT 
    table_name,
    backup_table_name,
    record_count,
    status,
    backup_timestamp
FROM backup_2025_10_02.backup_log 
ORDER BY backup_timestamp;

RAISE NOTICE '============================================';
RAISE NOTICE 'BACKUP PREVENTIVO CONCLUÍDO COM SUCESSO!';
RAISE NOTICE 'Schema de backup: backup_2025_10_02';
RAISE NOTICE 'Execute: SELECT * FROM backup_2025_10_02.backup_log;';
RAISE NOTICE 'para ver o resumo completo do backup.';
RAISE NOTICE '============================================';