-- =====================================================
-- MIGRAÇÃO SEGURA PARA O NOVO SISTEMA DE LICENÇAS
-- =====================================================
-- Este script migra licenças existentes para o novo formato
-- mantendo compatibilidade total com o sistema atual

-- Função para migrar licenças existentes de forma segura
CREATE OR REPLACE FUNCTION public.migrate_existing_licenses_safely()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migration_stats jsonb;
  legacy_count integer := 0;
  migrated_count integer := 0;
  error_count integer := 0;
  license_record record;
  new_code text;
  migration_log text := '';
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar migrações';
  END IF;

  -- Log início da migração
  migration_log := migration_log || format('Iniciando migração em %s\n', NOW());
  
  -- Contar licenças legadas (códigos que não seguem o novo padrão)
  SELECT COUNT(*) INTO legacy_count
  FROM public.licenses
  WHERE LENGTH(code) = 13 
    AND NOT (code ~ '^[0-9]{6}[A-Z0-9]{7}$' OR code LIKE 'TRIAL%');

  migration_log := migration_log || format('Encontradas %s licenças legadas para migração\n', legacy_count);

  -- Migrar cada licença legada
  FOR license_record IN 
    SELECT * FROM public.licenses
    WHERE LENGTH(code) = 13 
      AND NOT (code ~ '^[0-9]{6}[A-Z0-9]{7}$' OR code LIKE 'TRIAL%')
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Determinar quantos dias atribuir baseado na data de criação
      -- Licenças antigas recebem 365 dias, mais recentes recebem 30 dias
      DECLARE
        days_to_assign integer;
        creation_age_days integer;
      BEGIN
        creation_age_days := EXTRACT(DAY FROM NOW() - license_record.created_at);
        
        -- Lógica de atribuição de dias baseada na idade da licença
        IF creation_age_days > 365 THEN
          days_to_assign := 365; -- Licenças muito antigas recebem 1 ano
        ELSIF creation_age_days > 180 THEN
          days_to_assign := 180; -- Licenças de 6+ meses recebem 6 meses
        ELSIF creation_age_days > 90 THEN
          days_to_assign := 90;  -- Licenças de 3+ meses recebem 3 meses
        ELSE
          days_to_assign := 30;  -- Licenças recentes recebem 30 dias
        END IF;

        -- Gerar novo código com os dias especificados
        new_code := public.generate_license_code_with_days(days_to_assign);
        
        -- Atualizar a licença com o novo código
        UPDATE public.licenses
        SET 
          code = new_code,
          updated_at = NOW(),
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'migrated_from', license_record.code,
            'migration_date', NOW(),
            'assigned_days', days_to_assign,
            'migration_reason', 'legacy_format_conversion'
          )
        WHERE id = license_record.id;

        -- Log da migração individual
        migration_log := migration_log || format(
          'Migrada licença %s -> %s (%s dias)\n', 
          license_record.code, 
          new_code, 
          days_to_assign
        );

        migrated_count := migrated_count + 1;

        -- Registrar no histórico se a tabela existir
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'license_history') THEN
          INSERT INTO public.license_history (
            license_id,
            action,
            details,
            admin_user_id,
            created_at
          ) VALUES (
            license_record.id,
            'migrated',
            jsonb_build_object(
              'old_code', license_record.code,
              'new_code', new_code,
              'assigned_days', days_to_assign,
              'migration_type', 'legacy_conversion'
            ),
            auth.uid(),
            NOW()
          );
        END IF;

      EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        migration_log := migration_log || format(
          'ERRO ao migrar licença %s: %s\n', 
          license_record.code, 
          SQLERRM
        );
      END;
    END;
  END LOOP;

  -- Registrar estatísticas da migração
  migration_stats := jsonb_build_object(
    'migration_date', NOW(),
    'legacy_licenses_found', legacy_count,
    'successfully_migrated', migrated_count,
    'errors', error_count,
    'success_rate', CASE 
      WHEN legacy_count > 0 THEN ROUND((migrated_count::decimal / legacy_count) * 100, 2)
      ELSE 100
    END,
    'migration_log', migration_log
  );

  -- Log no sistema se a tabela existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO public.system_logs (
      log_level,
      message,
      details,
      created_at
    ) VALUES (
      'info',
      'Migração de licenças legadas concluída',
      migration_stats,
      NOW()
    );
  END IF;

  RETURN migration_stats;
END;
$$;

-- Função para verificar o status da migração
CREATE OR REPLACE FUNCTION public.check_migration_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  status_info jsonb;
  total_licenses integer;
  legacy_licenses integer;
  new_format_licenses integer;
  trial_licenses integer;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem verificar status de migração';
  END IF;

  -- Contar diferentes tipos de licenças
  SELECT COUNT(*) INTO total_licenses FROM public.licenses;
  
  SELECT COUNT(*) INTO legacy_licenses
  FROM public.licenses
  WHERE LENGTH(code) = 13 
    AND NOT (code ~ '^[0-9]{6}[A-Z0-9]{7}$' OR code LIKE 'TRIAL%');
  
  SELECT COUNT(*) INTO new_format_licenses
  FROM public.licenses
  WHERE code ~ '^[0-9]{6}[A-Z0-9]{7}$';
  
  SELECT COUNT(*) INTO trial_licenses
  FROM public.licenses
  WHERE code LIKE 'TRIAL%';

  status_info := jsonb_build_object(
    'check_date', NOW(),
    'total_licenses', total_licenses,
    'legacy_format_licenses', legacy_licenses,
    'new_format_licenses', new_format_licenses,
    'trial_licenses', trial_licenses,
    'migration_needed', legacy_licenses > 0,
    'migration_progress', CASE 
      WHEN total_licenses > 0 THEN ROUND(((new_format_licenses + trial_licenses)::decimal / total_licenses) * 100, 2)
      ELSE 100
    END
  );

  RETURN status_info;
END;
$$;

-- Função para fazer backup das licenças antes da migração
CREATE OR REPLACE FUNCTION public.backup_licenses_before_migration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  backup_info jsonb;
  backup_count integer;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem fazer backup';
  END IF;

  -- Criar tabela de backup se não existir
  CREATE TABLE IF NOT EXISTS public.licenses_backup (
    id uuid,
    code text,
    user_id uuid,
    is_active boolean,
    created_at timestamptz,
    activated_at timestamptz,
    expires_at timestamptz,
    last_validation timestamptz,
    metadata jsonb,
    backup_date timestamptz DEFAULT NOW()
  );

  -- Fazer backup das licenças atuais
  INSERT INTO public.licenses_backup (
    id, code, user_id, is_active, created_at, activated_at, 
    expires_at, last_validation, metadata
  )
  SELECT 
    id, code, user_id, is_active, created_at, activated_at,
    expires_at, last_validation, metadata
  FROM public.licenses
  WHERE NOT EXISTS (
    SELECT 1 FROM public.licenses_backup lb 
    WHERE lb.id = licenses.id
  );

  GET DIAGNOSTICS backup_count = ROW_COUNT;

  backup_info := jsonb_build_object(
    'backup_date', NOW(),
    'licenses_backed_up', backup_count,
    'backup_table', 'public.licenses_backup'
  );

  -- Log do backup
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO public.system_logs (
      log_level,
      message,
      details,
      created_at
    ) VALUES (
      'info',
      'Backup de licenças criado antes da migração',
      backup_info,
      NOW()
    );
  END IF;

  RETURN backup_info;
END;
$$;

-- Função para reverter migração (rollback)
CREATE OR REPLACE FUNCTION public.rollback_license_migration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rollback_info jsonb;
  restored_count integer;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem fazer rollback';
  END IF;

  -- Verificar se existe backup
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'licenses_backup') THEN
    RAISE EXCEPTION 'Tabela de backup não encontrada. Não é possível fazer rollback.';
  END IF;

  -- Restaurar licenças do backup
  UPDATE public.licenses
  SET 
    code = lb.code,
    metadata = lb.metadata,
    updated_at = NOW()
  FROM public.licenses_backup lb
  WHERE licenses.id = lb.id
    AND licenses.metadata ? 'migrated_from';

  GET DIAGNOSTICS restored_count = ROW_COUNT;

  rollback_info := jsonb_build_object(
    'rollback_date', NOW(),
    'licenses_restored', restored_count,
    'status', 'completed'
  );

  -- Log do rollback
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_logs') THEN
    INSERT INTO public.system_logs (
      log_level,
      message,
      details,
      created_at
    ) VALUES (
      'warning',
      'Rollback de migração de licenças executado',
      rollback_info,
      NOW()
    );
  END IF;

  RETURN rollback_info;
END;
$$;

-- Função para validar integridade após migração
CREATE OR REPLACE FUNCTION public.validate_migration_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_info jsonb;
  invalid_codes integer := 0;
  duplicate_codes integer := 0;
  missing_metadata integer := 0;
  validation_errors text[] := '{}';
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem validar migração';
  END IF;

  -- Verificar códigos inválidos
  SELECT COUNT(*) INTO invalid_codes
  FROM public.licenses
  WHERE LENGTH(code) != 13 
    OR (code NOT LIKE 'TRIAL%' AND NOT (code ~ '^[0-9]{6}[A-Z0-9]{7}$'));

  IF invalid_codes > 0 THEN
    validation_errors := array_append(validation_errors, 
      format('%s códigos de licença inválidos encontrados', invalid_codes));
  END IF;

  -- Verificar códigos duplicados
  SELECT COUNT(*) INTO duplicate_codes
  FROM (
    SELECT code, COUNT(*) 
    FROM public.licenses 
    GROUP BY code 
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_codes > 0 THEN
    validation_errors := array_append(validation_errors, 
      format('%s códigos duplicados encontrados', duplicate_codes));
  END IF;

  -- Verificar licenças migradas sem metadata
  SELECT COUNT(*) INTO missing_metadata
  FROM public.licenses
  WHERE code ~ '^[0-9]{6}[A-Z0-9]{7}$'
    AND (metadata IS NULL OR NOT metadata ? 'migrated_from');

  validation_info := jsonb_build_object(
    'validation_date', NOW(),
    'invalid_codes', invalid_codes,
    'duplicate_codes', duplicate_codes,
    'missing_migration_metadata', missing_metadata,
    'validation_errors', validation_errors,
    'is_valid', array_length(validation_errors, 1) = 0 OR validation_errors = '{}'
  );

  RETURN validation_info;
END;
$$;

-- Comentários sobre o uso das funções
COMMENT ON FUNCTION public.migrate_existing_licenses_safely() IS 
'Migra licenças existentes para o novo formato de 13 dígitos de forma segura, mantendo histórico e logs';

COMMENT ON FUNCTION public.check_migration_status() IS 
'Verifica o status atual da migração e quantas licenças ainda precisam ser migradas';

COMMENT ON FUNCTION public.backup_licenses_before_migration() IS 
'Cria backup das licenças antes da migração para permitir rollback se necessário';

COMMENT ON FUNCTION public.rollback_license_migration() IS 
'Reverte a migração usando o backup criado anteriormente';

COMMENT ON FUNCTION public.validate_migration_integrity() IS 
'Valida a integridade dos dados após a migração, verificando códigos inválidos e duplicados';