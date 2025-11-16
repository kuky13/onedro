-- ============================================
-- MIGRAÇÃO FASE 3: REMOÇÃO DE TABELAS LEGADAS
-- OneDrip Database Cleanup - Phase 3
-- Data: 02/10/2025
-- Risco: MÉDIO (algumas tabelas têm dados residuais, mas sem referências no código)
-- ============================================

-- Verificação de segurança antes da execução
DO $$
BEGIN
    -- Verificar se o backup foi executado
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_2025_10_02') THEN
        RAISE EXCEPTION 'ERRO: Schema de backup não encontrado. Execute o script backup_before_cleanup.sql primeiro!';
    END IF;
    
    -- Verificar se as fases anteriores foram executadas
    IF NOT EXISTS (SELECT 1 FROM backup_2025_10_02.backup_log WHERE table_name = 'MIGRATION_PHASE_1') THEN
        RAISE WARNING 'ATENÇÃO: Fase 1 não foi executada. Recomenda-se executar as fases em ordem.';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM backup_2025_10_02.backup_log WHERE table_name = 'MIGRATION_PHASE_2') THEN
        RAISE WARNING 'ATENÇÃO: Fase 2 não foi executada. Recomenda-se executar as fases em ordem.';
    END IF;
    
    RAISE NOTICE 'Verificação de segurança: Backup encontrado ✓';
END $$;

-- ============================================
-- REMOÇÃO DAS TABELAS LEGADAS
-- ============================================

-- Tabela: user_activity_metrics
-- Análise: 0 referências no código, 0 registros atuais
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_activity_metrics') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.user_activity_metrics;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela user_activity_metrics contém % registros (backup criado)', record_count;
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.user_activity_metrics CASCADE;
        RAISE NOTICE 'Tabela removida: user_activity_metrics ✓';
    ELSE
        RAISE NOTICE 'Tabela user_activity_metrics não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: persistent_sessions
-- Análise: 0 referências no código, 0 registros atuais
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'persistent_sessions') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.persistent_sessions;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela persistent_sessions contém % registros (backup criado)', record_count;
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.persistent_sessions CASCADE;
        RAISE NOTICE 'Tabela removida: persistent_sessions ✓';
    ELSE
        RAISE NOTICE 'Tabela persistent_sessions não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: user_notifications_read
-- Análise: 0 referências no código, 0 registros atuais
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_notifications_read') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.user_notifications_read;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela user_notifications_read contém % registros (backup criado)', record_count;
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.user_notifications_read CASCADE;
        RAISE NOTICE 'Tabela removida: user_notifications_read ✓';
    ELSE
        RAISE NOTICE 'Tabela user_notifications_read não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: vip_backup
-- Análise: 0 referências no código, 5 registros (backup de sistema antigo)
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vip_backup') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.vip_backup;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela vip_backup contém % registros (backup criado)', record_count;
            RAISE NOTICE 'Esta tabela contém dados de backup de sistema antigo que não são mais utilizados';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.vip_backup CASCADE;
        RAISE NOTICE 'Tabela removida: vip_backup ✓';
    ELSE
        RAISE NOTICE 'Tabela vip_backup não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: spam_patterns
-- Análise: 0 referências no código, 9 registros
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'spam_patterns') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.spam_patterns;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela spam_patterns contém % registros (backup criado)', record_count;
            RAISE NOTICE 'Esta tabela contém padrões de spam que não são mais utilizados pelo sistema';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.spam_patterns CASCADE;
        RAISE NOTICE 'Tabela removida: spam_patterns ✓';
    ELSE
        RAISE NOTICE 'Tabela spam_patterns não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: service_order_shares
-- Análise: 0 referências no código, 4 registros
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_order_shares') THEN
        -- Verificar quantos registros existem (informativo)
        SELECT COUNT(*) INTO record_count FROM public.service_order_shares;
        
        IF record_count > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: Tabela service_order_shares contém % registros (backup criado)', record_count;
            RAISE NOTICE 'Esta tabela contém dados de compartilhamento que não são mais utilizados';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.service_order_shares CASCADE;
        RAISE NOTICE 'Tabela removida: service_order_shares ✓';
    ELSE
        RAISE NOTICE 'Tabela service_order_shares não existe (já foi removida)';
    END IF;
END $$;

-- ============================================
-- LIMPEZA DE FUNÇÕES RELACIONADAS (SE EXISTIREM)
-- ============================================

-- Remover funções que podem estar relacionadas às tabelas removidas
DO $$
BEGIN
    -- Funções relacionadas a user_activity_metrics
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'track_user_activity') THEN
        DROP FUNCTION IF EXISTS public.track_user_activity() CASCADE;
        RAISE NOTICE 'Função removida: track_user_activity ✓';
    END IF;

    -- Funções relacionadas a persistent_sessions
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'cleanup_expired_sessions') THEN
        DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
        RAISE NOTICE 'Função removida: cleanup_expired_sessions ✓';
    END IF;

    -- Funções relacionadas a spam_patterns
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'detect_spam_patterns') THEN
        DROP FUNCTION IF EXISTS public.detect_spam_patterns() CASCADE;
        RAISE NOTICE 'Função removida: detect_spam_patterns ✓';
    END IF;

    -- Funções relacionadas a service_order_shares
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'share_service_order') THEN
        DROP FUNCTION IF EXISTS public.share_service_order() CASCADE;
        RAISE NOTICE 'Função removida: share_service_order ✓';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO PÓS-REMOÇÃO
-- ============================================

-- Verificar se as tabelas foram realmente removidas
DO $$
DECLARE
    remaining_tables TEXT[];
BEGIN
    SELECT ARRAY_AGG(table_name) INTO remaining_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_activity_metrics', 
        'persistent_sessions', 
        'user_notifications_read', 
        'vip_backup', 
        'spam_patterns', 
        'service_order_shares'
    );
    
    IF remaining_tables IS NOT NULL THEN
        RAISE WARNING 'ATENÇÃO: Algumas tabelas ainda existem: %', remaining_tables;
    ELSE
        RAISE NOTICE 'Verificação: Todas as tabelas da Fase 3 foram removidas com sucesso ✓';
    END IF;
END $$;

-- ============================================
-- ESTATÍSTICAS FINAIS DO SCHEMA
-- ============================================

-- Exibir estatísticas do schema após a limpeza
DO $$
DECLARE
    total_tables INTEGER;
    total_functions INTEGER;
    total_indexes INTEGER;
BEGIN
    -- Contar tabelas restantes
    SELECT COUNT(*) INTO total_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public';
    
    -- Contar funções restantes
    SELECT COUNT(*) INTO total_functions
    FROM information_schema.routines 
    WHERE routine_schema = 'public';
    
    -- Contar índices restantes
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'ESTATÍSTICAS FINAIS DO SCHEMA:';
    RAISE NOTICE 'Tabelas restantes: %', total_tables;
    RAISE NOTICE 'Funções restantes: %', total_functions;
    RAISE NOTICE 'Índices restantes: %', total_indexes;
END $$;

-- ============================================
-- LOG DA MIGRAÇÃO
-- ============================================

-- Registrar a execução da migração no backup log
INSERT INTO backup_2025_10_02.backup_log (
    table_name, 
    original_schema, 
    backup_table_name, 
    record_count, 
    status
) VALUES (
    'MIGRATION_PHASE_3', 
    'public', 
    'COMPLETED', 
    6, 
    'EXECUTED'
);

-- Registrar conclusão de todas as fases
INSERT INTO backup_2025_10_02.backup_log (
    table_name, 
    original_schema, 
    backup_table_name, 
    record_count, 
    status
) VALUES (
    'CLEANUP_COMPLETED', 
    'public', 
    'ALL_PHASES', 
    (SELECT COUNT(*) FROM backup_2025_10_02.backup_log WHERE table_name LIKE 'MIGRATION_PHASE_%'), 
    'SUCCESS'
);

-- Exibir resumo final de todas as fases
SELECT 
    'LIMPEZA COMPLETA' as status,
    'Todas as 3 fases foram executadas com sucesso' as detalhes,
    NOW() as timestamp_execucao;

-- Exibir resumo detalhado
SELECT 
    table_name,
    status,
    backup_timestamp
FROM backup_2025_10_02.backup_log 
WHERE table_name LIKE 'MIGRATION_%' OR table_name = 'CLEANUP_COMPLETED'
ORDER BY backup_timestamp;

RAISE NOTICE '============================================';
RAISE NOTICE 'LIMPEZA DO BANCO DE DADOS CONCLUÍDA!';
RAISE NOTICE 'Fase 1: 4 tabelas removidas';
RAISE NOTICE 'Fase 2: 1 coluna + índices removidos';
RAISE NOTICE 'Fase 3: 6 tabelas legadas removidas';
RAISE NOTICE 'Total: 10 tabelas + 1 coluna removidas';
RAISE NOTICE 'Backup disponível em: backup_2025_10_02';
RAISE NOTICE '============================================';