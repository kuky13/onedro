-- Ensure Data Management Functions are Available
-- This migration ensures all data management functions exist and work correctly

-- Check if functions exist and create them if they don't
DO $$
BEGIN
    -- Check if admin_get_table_stats exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_get_table_stats'
    ) THEN
        -- Create admin_get_table_stats function
        CREATE OR REPLACE FUNCTION admin_get_table_stats()
        RETURNS TABLE (
            table_name text,
            record_count bigint,
            table_size text,
            last_modified timestamp with time zone
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                t.table_name::text,
                COALESCE(s.n_tup_ins + s.n_tup_upd - s.n_tup_del, 0) as record_count,
                pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema)||'.'||quote_ident(t.table_name))) as table_size,
                GREATEST(
                    COALESCE(s.last_autoanalyze, '1970-01-01'::timestamp),
                    COALESCE(s.last_analyze, '1970-01-01'::timestamp),
                    COALESCE(s.last_autovacuum, '1970-01-01'::timestamp),
                    COALESCE(s.last_vacuum, '1970-01-01'::timestamp)
                ) as last_modified
            FROM information_schema.tables t
            LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
            WHERE t.table_schema = 'public'
            AND t.table_type = 'BASE TABLE'
            AND t.table_name NOT LIKE 'pg_%'
            ORDER BY record_count DESC;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_get_table_stats TO authenticated;
        RAISE NOTICE 'Função admin_get_table_stats criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_get_table_stats já existe';
    END IF;

    -- Check if admin_get_database_stats exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_get_database_stats'
    ) THEN
        -- Create admin_get_database_stats function
        CREATE OR REPLACE FUNCTION admin_get_database_stats()
        RETURNS TABLE (
            total_tables bigint,
            total_records bigint,
            database_size text,
            last_backup timestamp with time zone
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                (SELECT COUNT(*) FROM information_schema.tables 
                 WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as total_tables,
                (SELECT SUM(COALESCE(s.n_tup_ins + s.n_tup_upd - s.n_tup_del, 0))
                 FROM information_schema.tables t
                 LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
                 WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE') as total_records,
                pg_size_pretty(pg_database_size(current_database())) as database_size,
                NOW() - INTERVAL '1 day' as last_backup;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_get_database_stats TO authenticated;
        RAISE NOTICE 'Função admin_get_database_stats criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_get_database_stats já existe';
    END IF;

    -- Check if admin_export_users_data exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_export_users_data'
    ) THEN
        -- Create admin_export_users_data function
        CREATE OR REPLACE FUNCTION admin_export_users_data()
        RETURNS TABLE (
            id uuid,
            email text,
            created_at timestamp with time zone,
            role text,
            name text,
            last_sign_in_at timestamp with time zone
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                u.id,
                u.email::text,
                u.created_at,
                COALESCE(up.role, 'user')::text as role,
                COALESCE(up.name, 'N/A')::text as name,
                u.last_sign_in_at
            FROM auth.users u
            LEFT JOIN user_profiles up ON up.id = u.id
            WHERE u.deleted_at IS NULL
            ORDER BY u.created_at DESC;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_export_users_data TO authenticated;
        RAISE NOTICE 'Função admin_export_users_data criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_export_users_data já existe';
    END IF;

    -- Check if admin_export_logs_data exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_export_logs_data'
    ) THEN
        -- Create admin_export_logs_data function
        CREATE OR REPLACE FUNCTION admin_export_logs_data()
        RETURNS TABLE (
            id uuid,
            admin_id uuid,
            action text,
            details text,
            created_at timestamp with time zone,
            ip_address inet,
            user_agent text
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                al.id,
                al.admin_id,
                al.action::text,
                al.details::text,
                al.created_at,
                al.ip_address,
                al.user_agent::text
            FROM admin_logs al
            ORDER BY al.created_at DESC
            LIMIT 10000;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_export_logs_data TO authenticated;
        RAISE NOTICE 'Função admin_export_logs_data criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_export_logs_data já existe';
    END IF;

    -- Check if admin_export_budgets_data exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_export_budgets_data'
    ) THEN
        -- Create admin_export_budgets_data function
        CREATE OR REPLACE FUNCTION admin_export_budgets_data()
        RETURNS TABLE (
            id uuid,
            client_name text,
            device_type text,
            problem_description text,
            total_value numeric,
            workflow_status text,
            created_at timestamp with time zone,
            owner_email text
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT 
                b.id,
                b.client_name::text,
                b.device_type::text,
                b.problem_description::text,
                b.total_value,
                b.workflow_status::text,
                b.created_at,
                u.email::text as owner_email
            FROM budgets b
            LEFT JOIN auth.users u ON u.id = b.owner_id
            WHERE b.deleted_at IS NULL
            ORDER BY b.created_at DESC
            LIMIT 10000;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_export_budgets_data TO authenticated;
        RAISE NOTICE 'Função admin_export_budgets_data criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_export_budgets_data já existe';
    END IF;

    -- Check if admin_cleanup_old_logs exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_cleanup_old_logs'
    ) THEN
        -- Create admin_cleanup_old_logs function
        CREATE OR REPLACE FUNCTION admin_cleanup_old_logs(days_to_keep integer DEFAULT 90)
        RETURNS TABLE (
            deleted_count bigint,
            operation_status text
        ) AS $func$
        DECLARE
            deleted_rows bigint;
        BEGIN
            DELETE FROM admin_logs 
            WHERE created_at < NOW() - (days_to_keep || ' days')::interval;
            
            GET DIAGNOSTICS deleted_rows = ROW_COUNT;
            
            RETURN QUERY
            SELECT 
                deleted_rows as deleted_count,
                CASE 
                    WHEN deleted_rows > 0 THEN 'Logs antigos removidos com sucesso'
                    ELSE 'Nenhum log antigo encontrado para remoção'
                END::text as operation_status;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_cleanup_old_logs TO authenticated;
        RAISE NOTICE 'Função admin_cleanup_old_logs criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_cleanup_old_logs já existe';
    END IF;

    -- Check if admin_optimize_tables exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'admin_optimize_tables'
    ) THEN
        -- Create admin_optimize_tables function
        CREATE OR REPLACE FUNCTION admin_optimize_tables()
        RETURNS TABLE (
            table_name text,
            operation_status text
        ) AS $func$
        DECLARE
            table_record record;
        BEGIN
            FOR table_record IN 
                SELECT t.table_name 
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
                AND t.table_name IN ('budgets', 'clients', 'user_profiles', 'admin_logs', 'budget_parts')
            LOOP
                EXECUTE 'ANALYZE ' || quote_ident(table_record.table_name);
                
                RETURN QUERY
                SELECT 
                    table_record.table_name::text,
                    'Tabela otimizada com sucesso'::text as operation_status;
            END LOOP;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        
        GRANT EXECUTE ON FUNCTION admin_optimize_tables TO authenticated;
        RAISE NOTICE 'Função admin_optimize_tables criada com sucesso';
    ELSE
        RAISE NOTICE 'Função admin_optimize_tables já existe';
    END IF;

    RAISE NOTICE 'Verificação de funções de gerenciamento de dados concluída';
END $$;