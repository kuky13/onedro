-- ============================================
-- MIGRAÇÃO FASE 2: REMOÇÃO DA COLUNA SEARCH_VECTOR
-- OneDrip Database Cleanup - Phase 2
-- Data: 02/10/2025
-- Risco: BAIXO (coluna não referenciada no código)
-- ============================================

-- Verificação de segurança antes da execução
DO $$
BEGIN
    -- Verificar se o backup foi executado
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backup_2025_10_02') THEN
        RAISE EXCEPTION 'ERRO: Schema de backup não encontrado. Execute o script backup_before_cleanup.sql primeiro!';
    END IF;
    
    -- Verificar se a Fase 1 foi executada
    IF NOT EXISTS (SELECT 1 FROM backup_2025_10_02.backup_log WHERE table_name = 'MIGRATION_PHASE_1') THEN
        RAISE WARNING 'ATENÇÃO: Fase 1 não foi executada. Recomenda-se executar as fases em ordem.';
    END IF;
    
    RAISE NOTICE 'Verificação de segurança: Backup encontrado ✓';
END $$;

-- ============================================
-- REMOÇÃO DOS ÍNDICES RELACIONADOS À SEARCH_VECTOR
-- ============================================

-- Remover índices GIN relacionados à coluna search_vector
DO $$
BEGIN
    -- Índice: idx_budgets_search_vector
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'budgets' AND indexname = 'idx_budgets_search_vector') THEN
        DROP INDEX IF EXISTS public.idx_budgets_search_vector;
        RAISE NOTICE 'Índice removido: idx_budgets_search_vector ✓';
    ELSE
        RAISE NOTICE 'Índice idx_budgets_search_vector não existe (já foi removido)';
    END IF;

    -- Índice: budgets_search_vector_idx (variação do nome)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'budgets' AND indexname = 'budgets_search_vector_idx') THEN
        DROP INDEX IF EXISTS public.budgets_search_vector_idx;
        RAISE NOTICE 'Índice removido: budgets_search_vector_idx ✓';
    ELSE
        RAISE NOTICE 'Índice budgets_search_vector_idx não existe (já foi removido)';
    END IF;

    -- Índice: idx_budgets_search (outro possível nome)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'budgets' AND indexname = 'idx_budgets_search') THEN
        DROP INDEX IF EXISTS public.idx_budgets_search;
        RAISE NOTICE 'Índice removido: idx_budgets_search ✓';
    ELSE
        RAISE NOTICE 'Índice idx_budgets_search não existe (já foi removido)';
    END IF;
END $$;

-- ============================================
-- REMOÇÃO DE TRIGGERS RELACIONADOS
-- ============================================

-- Remover triggers que podem estar relacionados à search_vector
DO $$
BEGIN
    -- Trigger: budgets_search_update
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'budgets' AND trigger_name = 'budgets_search_update') THEN
        DROP TRIGGER IF EXISTS budgets_search_update ON public.budgets;
        RAISE NOTICE 'Trigger removido: budgets_search_update ✓';
    ELSE
        RAISE NOTICE 'Trigger budgets_search_update não existe (já foi removido)';
    END IF;

    -- Trigger: budgets_search_vector_update
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'budgets' AND trigger_name = 'budgets_search_vector_update') THEN
        DROP TRIGGER IF EXISTS budgets_search_vector_update ON public.budgets;
        RAISE NOTICE 'Trigger removido: budgets_search_vector_update ✓';
    ELSE
        RAISE NOTICE 'Trigger budgets_search_vector_update não existe (já foi removido)';
    END IF;
END $$;

-- ============================================
-- REMOÇÃO DE FUNÇÕES RELACIONADAS
-- ============================================

-- Remover funções que podem estar relacionadas à search_vector
DO $$
BEGIN
    -- Função: budgets_search_trigger
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'budgets_search_trigger') THEN
        DROP FUNCTION IF EXISTS public.budgets_search_trigger() CASCADE;
        RAISE NOTICE 'Função removida: budgets_search_trigger ✓';
    ELSE
        RAISE NOTICE 'Função budgets_search_trigger não existe (já foi removida)';
    END IF;

    -- Função: update_budgets_search_vector
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'update_budgets_search_vector') THEN
        DROP FUNCTION IF EXISTS public.update_budgets_search_vector() CASCADE;
        RAISE NOTICE 'Função removida: update_budgets_search_vector ✓';
    ELSE
        RAISE NOTICE 'Função update_budgets_search_vector não existe (já foi removida)';
    END IF;
END $$;

-- ============================================
-- REMOÇÃO DA COLUNA SEARCH_VECTOR
-- ============================================

-- Remover a coluna search_vector da tabela budgets
DO $$
DECLARE
    column_exists BOOLEAN;
    records_with_data INTEGER;
BEGIN
    -- Verificar se a coluna existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets' 
        AND column_name = 'search_vector'
    ) INTO column_exists;

    IF column_exists THEN
        -- Verificar quantos registros têm dados na coluna (informativo)
        EXECUTE 'SELECT COUNT(*) FROM public.budgets WHERE search_vector IS NOT NULL' INTO records_with_data;
        
        IF records_with_data > 0 THEN
            RAISE NOTICE 'INFORMAÇÃO: % registros possuem dados na coluna search_vector (backup criado)', records_with_data;
        END IF;
        
        -- Remover a coluna
        ALTER TABLE public.budgets DROP COLUMN IF EXISTS search_vector;
        RAISE NOTICE 'Coluna removida: budgets.search_vector ✓';
    ELSE
        RAISE NOTICE 'Coluna search_vector não existe na tabela budgets (já foi removida)';
    END IF;
END $$;

-- ============================================
-- VERIFICAÇÃO PÓS-REMOÇÃO
-- ============================================

-- Verificar se a coluna foi realmente removida
DO $$
DECLARE
    column_still_exists BOOLEAN;
    remaining_indexes INTEGER;
BEGIN
    -- Verificar coluna
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets' 
        AND column_name = 'search_vector'
    ) INTO column_still_exists;
    
    -- Verificar índices relacionados
    SELECT COUNT(*) INTO remaining_indexes
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'budgets' 
    AND indexdef LIKE '%search_vector%';
    
    IF column_still_exists THEN
        RAISE WARNING 'ATENÇÃO: Coluna search_vector ainda existe na tabela budgets';
    ELSE
        RAISE NOTICE 'Verificação: Coluna search_vector foi removida com sucesso ✓';
    END IF;
    
    IF remaining_indexes > 0 THEN
        RAISE WARNING 'ATENÇÃO: % índices relacionados à search_vector ainda existem', remaining_indexes;
    ELSE
        RAISE NOTICE 'Verificação: Todos os índices relacionados foram removidos ✓';
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
    'MIGRATION_PHASE_2', 
    'public', 
    'COMPLETED', 
    1, 
    'EXECUTED'
);

-- Exibir resumo final
SELECT 
    'FASE 2 CONCLUÍDA' as status,
    'Coluna removida: budgets.search_vector + índices e triggers relacionados' as detalhes,
    NOW() as timestamp_execucao;

RAISE NOTICE '============================================';
RAISE NOTICE 'MIGRAÇÃO FASE 2 CONCLUÍDA COM SUCESSO!';
RAISE NOTICE 'Coluna removida: budgets.search_vector';
RAISE NOTICE 'Índices e triggers relacionados removidos';
RAISE NOTICE 'Próximo passo: Execute a Fase 3';
RAISE NOTICE '============================================';