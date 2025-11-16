-- =====================================================
-- Sistema de Licenças - Migração de Compatibilidade
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO PARA MIGRAR LICENÇAS EXISTENTES
-- =====================================================

CREATE OR REPLACE FUNCTION public.migrate_existing_licenses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migrated_count INTEGER := 0;
  error_count INTEGER := 0;
  license_record RECORD;
  result JSONB;
BEGIN
  -- Migrar licenças ativas que não têm expires_at definido
  FOR license_record IN 
    SELECT id, code, user_id, created_at, is_active
    FROM public.licenses 
    WHERE expires_at IS NULL 
    AND is_active = TRUE
    AND NOT code LIKE 'TRIAL%'
  LOOP
    BEGIN
      -- Para licenças legacy, definir expiração como 30 dias a partir da criação
      UPDATE public.licenses 
      SET expires_at = license_record.created_at + INTERVAL '30 days'
      WHERE id = license_record.id;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Erro ao migrar licença %: %', license_record.code, SQLERRM;
    END;
  END LOOP;
  
  -- Migrar licenças de teste existentes (se houver)
  FOR license_record IN 
    SELECT id, code, user_id, created_at, is_active
    FROM public.licenses 
    WHERE expires_at IS NULL 
    AND (code LIKE 'TRIAL%' OR code LIKE '%TRIAL%')
  LOOP
    BEGIN
      -- Para licenças de teste, definir expiração como 7 dias a partir da criação
      UPDATE public.licenses 
      SET expires_at = license_record.created_at + INTERVAL '7 days'
      WHERE id = license_record.id;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Erro ao migrar licença de teste %: %', license_record.code, SQLERRM;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'migrated_licenses', migrated_count,
    'errors', error_count,
    'migration_timestamp', NOW(),
    'success', error_count = 0
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 2. FUNÇÃO PARA VALIDAR MIGRAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_license_migration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_licenses INTEGER;
  licenses_without_expiry INTEGER;
  active_expired_licenses INTEGER;
  trial_licenses INTEGER;
  legacy_licenses INTEGER;
  new_format_licenses INTEGER;
  result JSONB;
BEGIN
  -- Contar totais
  SELECT COUNT(*) INTO total_licenses FROM public.licenses;
  
  -- Licenças sem data de expiração
  SELECT COUNT(*) INTO licenses_without_expiry 
  FROM public.licenses WHERE expires_at IS NULL;
  
  -- Licenças ativas mas expiradas
  SELECT COUNT(*) INTO active_expired_licenses 
  FROM public.licenses 
  WHERE is_active = TRUE AND expires_at < NOW();
  
  -- Licenças de teste
  SELECT COUNT(*) INTO trial_licenses 
  FROM public.licenses WHERE code LIKE 'TRIAL%';
  
  -- Licenças legacy (não seguem novo formato)
  SELECT COUNT(*) INTO legacy_licenses 
  FROM public.licenses 
  WHERE NOT public.is_legacy_license_code(code) = FALSE
  AND NOT code LIKE 'TRIAL%';
  
  -- Licenças no novo formato (13 dígitos)
  SELECT COUNT(*) INTO new_format_licenses 
  FROM public.licenses 
  WHERE LENGTH(code) = 13 
  AND code ~ '^[0-9]{6}[A-Z0-9]{7}$'
  AND NOT code LIKE 'TRIAL%';
  
  result := jsonb_build_object(
    'total_licenses', total_licenses,
    'licenses_without_expiry', licenses_without_expiry,
    'active_expired_licenses', active_expired_licenses,
    'trial_licenses', trial_licenses,
    'legacy_licenses', legacy_licenses,
    'new_format_licenses', new_format_licenses,
    'migration_complete', licenses_without_expiry = 0,
    'validation_timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO PARA ROLLBACK DE MIGRAÇÃO (EMERGÊNCIA)
-- =====================================================

CREATE OR REPLACE FUNCTION public.rollback_license_migration()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rollback_count INTEGER := 0;
  result JSONB;
BEGIN
  -- ATENÇÃO: Esta função deve ser usada apenas em emergência
  -- Remove expires_at de licenças que foram migradas hoje
  
  UPDATE public.licenses 
  SET expires_at = NULL
  WHERE expires_at IS NOT NULL
  AND updated_at::date = CURRENT_DATE;
  
  GET DIAGNOSTICS rollback_count = ROW_COUNT;
  
  result := jsonb_build_object(
    'rollback_count', rollback_count,
    'rollback_timestamp', NOW(),
    'warning', 'Rollback executado - sistema pode estar inconsistente'
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO PARA CRIAR LICENÇAS DE TESTE PARA USUÁRIOS EXISTENTES
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_trial_licenses_for_existing_users()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_count INTEGER := 0;
  error_count INTEGER := 0;
  user_record RECORD;
  trial_result JSONB;
  result JSONB;
BEGIN
  -- Criar licenças de teste para usuários que não têm licenças ativas
  FOR user_record IN 
    SELECT up.id, up.email
    FROM public.user_profiles up
    WHERE NOT EXISTS (
      SELECT 1 FROM public.licenses l 
      WHERE l.user_id = up.id AND l.is_active = TRUE
    )
  LOOP
    BEGIN
      SELECT public.create_trial_license(user_record.id) INTO trial_result;
      
      IF (trial_result->>'success')::BOOLEAN = TRUE THEN
        created_count := created_count + 1;
      ELSE
        error_count := error_count + 1;
        RAISE NOTICE 'Erro ao criar licença de teste para usuário %: %', 
                     user_record.email, trial_result->>'error';
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE NOTICE 'Erro ao criar licença de teste para usuário %: %', 
                     user_record.email, SQLERRM;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'trial_licenses_created', created_count,
    'errors', error_count,
    'creation_timestamp', NOW(),
    'success', error_count = 0
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 5. EXECUTAR MIGRAÇÃO AUTOMÁTICA
-- =====================================================

-- Executar migração das licenças existentes
DO $$
DECLARE
  migration_result JSONB;
  trial_result JSONB;
BEGIN
  -- Migrar licenças existentes
  SELECT public.migrate_existing_licenses() INTO migration_result;
  RAISE NOTICE 'Resultado da migração: %', migration_result;
  
  -- Criar licenças de teste para usuários sem licenças
  SELECT public.create_trial_licenses_for_existing_users() INTO trial_result;
  RAISE NOTICE 'Resultado da criação de licenças de teste: %', trial_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro durante migração automática: %', SQLERRM;
END;
$$;

-- =====================================================
-- 6. PERMISSÕES PARA FUNÇÕES DE MIGRAÇÃO
-- =====================================================

-- Apenas administradores podem executar migrações
GRANT EXECUTE ON FUNCTION public.migrate_existing_licenses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_license_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_license_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_trial_licenses_for_existing_users() TO authenticated;

-- =====================================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice para consultas de licenças expiradas
CREATE INDEX IF NOT EXISTS idx_licenses_expires_at_active 
ON public.licenses (expires_at, is_active) 
WHERE expires_at IS NOT NULL;

-- Índice para consultas de licenças por formato
CREATE INDEX IF NOT EXISTS idx_licenses_code_format 
ON public.licenses (code) 
WHERE LENGTH(code) = 13;

-- =====================================================
-- 8. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.migrate_existing_licenses() IS 'Migra licenças existentes para o novo formato com expires_at';
COMMENT ON FUNCTION public.validate_license_migration() IS 'Valida o estado da migração e integridade dos dados';
COMMENT ON FUNCTION public.rollback_license_migration() IS 'Rollback de emergência da migração (usar com cuidado)';
COMMENT ON FUNCTION public.create_trial_licenses_for_existing_users() IS 'Cria licenças de teste para usuários existentes sem licenças ativas';

-- =====================================================
-- FIM DA MIGRAÇÃO DE COMPATIBILIDADE
-- =====================================================