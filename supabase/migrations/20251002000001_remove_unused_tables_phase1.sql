-- ============================================
-- MIGRAÇÃO FASE 1: REMOÇÃO DE TABELAS NÃO UTILIZADAS
-- OneDrip Database Cleanup - Phase 1
-- Data: 02/10/2025
-- Risco: BAIXO (tabelas vazias, sem referências no código)
-- ============================================

-- Verificação de segurança antes da execução
DO $$
BEGIN
    -- Verificar se o backup foi executado
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_2025_10_02') THEN
        RAISE EXCEPTION 'ERRO: Schema de backup não encontrado. Execute o script backup_before_cleanup.sql primeiro!';
    END IF;
    
    RAISE NOTICE 'Verificação de segurança: Schema de backup encontrado ✓';
END $$;

-- ============================================
-- REMOÇÃO DAS TABELAS FASE 1
-- ============================================

-- Tabela: pix_transactions
-- Análise: 0 referências no código, 0 registros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pix_transactions') THEN
        -- Verificar se a tabela está vazia (segurança adicional)
        IF (SELECT COUNT(*) FROM public.pix_transactions) > 0 THEN
            RAISE WARNING 'ATENÇÃO: Tabela pix_transactions contém dados. Verifique o backup antes de continuar.';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.pix_transactions CASCADE;
        RAISE NOTICE 'Tabela removida: pix_transactions ✓';
    ELSE
        RAISE NOTICE 'Tabela pix_transactions não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: login_attempts
-- Análise: 0 referências no código, 0 registros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_attempts') THEN
        -- Verificar se a tabela está vazia (segurança adicional)
        IF (SELECT COUNT(*) FROM public.login_attempts) > 0 THEN
            RAISE WARNING 'ATENÇÃO: Tabela login_attempts contém dados. Verifique o backup antes de continuar.';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.login_attempts CASCADE;
        RAISE NOTICE 'Tabela removida: login_attempts ✓';
    ELSE
        RAISE NOTICE 'Tabela login_attempts não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: rate_limit_tracking
-- Análise: 0 referências no código, 0 registros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limit_tracking') THEN
        -- Verificar se a tabela está vazia (segurança adicional)
        IF (SELECT COUNT(*) FROM public.rate_limit_tracking) > 0 THEN
            RAISE WARNING 'ATENÇÃO: Tabela rate_limit_tracking contém dados. Verifique o backup antes de continuar.';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.rate_limit_tracking CASCADE;
        RAISE NOTICE 'Tabela removida: rate_limit_tracking ✓';
    ELSE
        RAISE NOTICE 'Tabela rate_limit_tracking não existe (já foi removida)';
    END IF;
END $$;

-- Tabela: rate_limiting
-- Análise: 0 referências no código, 0 registros
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limiting') THEN
        -- Verificar se a tabela está vazia (segurança adicional)
        IF (SELECT COUNT(*) FROM public.rate_limiting) > 0 THEN
            RAISE WARNING 'ATENÇÃO: Tabela rate_limiting contém dados. Verifique o backup antes de continuar.';
        END IF;
        
        -- Remover tabela
        DROP TABLE IF EXISTS public.rate_limiting CASCADE;
        RAISE NOTICE 'Tabela removida: rate_limiting ✓';
    ELSE
        RAISE NOTICE 'Tabela rate_limiting não existe (já foi removida)';
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
    AND table_name IN ('pix_transactions', 'login_attempts', 'rate_limit_tracking', 'rate_limiting');
    
    IF remaining_tables IS NOT NULL THEN
        RAISE WARNING 'ATENÇÃO: Algumas tabelas ainda existem: %', remaining_tables;
    ELSE
        RAISE NOTICE 'Verificação: Todas as tabelas da Fase 1 foram removidas com sucesso ✓';
    END IF;
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
    'MIGRATION_PHASE_1', 
    'public', 
    'COMPLETED', 
    4, 
    'EXECUTED'
);

-- Exibir resumo final
SELECT 
    'FASE 1 CONCLUÍDA' as status,
    'Tabelas removidas: pix_transactions, login_attempts, rate_limit_tracking, rate_limiting' as detalhes,
    NOW() as timestamp_execucao;

RAISE NOTICE '============================================';
RAISE NOTICE 'MIGRAÇÃO FASE 1 CONCLUÍDA COM SUCESSO!';
RAISE NOTICE 'Tabelas removidas: 4';
RAISE NOTICE 'Próximo passo: Execute a Fase 2';
RAISE NOTICE '============================================';