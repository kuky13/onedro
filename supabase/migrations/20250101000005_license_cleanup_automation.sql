-- Sistema de Automação para Limpeza de Licenças Expiradas
-- Criado em: 2025-01-01
-- Descrição: Implementa sistema robusto de limpeza automática de licenças expiradas

-- =====================================================
-- 1. TABELA DE LOGS DE LIMPEZA DE LICENÇAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.license_cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_type TEXT NOT NULL CHECK (cleanup_type IN ('TRIAL_CLEANUP', 'EXPIRED_CLEANUP', 'MANUAL_CLEANUP')),
    deleted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    cleanup_date TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    executed_by UUID REFERENCES auth.users(id),
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_license_cleanup_logs_cleanup_date 
ON public.license_cleanup_logs(cleanup_date DESC);

CREATE INDEX IF NOT EXISTS idx_license_cleanup_logs_type 
ON public.license_cleanup_logs(cleanup_type);

-- =====================================================
-- 2. FUNÇÃO MELHORADA DE LIMPEZA DE LICENÇAS DE TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_trial_licenses_enhanced()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_time INTEGER;
  deleted_count INTEGER := 0;
  updated_count INTEGER := 0;
  trial_ids UUID[];
  cleanup_details JSONB;
BEGIN
  start_time := clock_timestamp();
  
  -- Buscar licenças de teste expiradas há mais de 7 dias
  SELECT array_agg(id) INTO trial_ids
  FROM public.licenses 
  WHERE code LIKE 'TRIAL%' 
    AND expires_at < NOW() - INTERVAL '7 days'
    AND is_active = FALSE;
  
  -- Se não há licenças para limpar
  IF trial_ids IS NULL OR array_length(trial_ids, 1) = 0 THEN
    cleanup_details := jsonb_build_object(
      'message', 'Nenhuma licença de teste expirada encontrada para limpeza',
      'deleted_count', 0,
      'updated_count', 0
    );
  ELSE
    -- Primeiro, desativar licenças de teste que ainda estão ativas mas expiradas
    UPDATE public.licenses 
    SET is_active = FALSE, 
        last_validation = NOW()
    WHERE code LIKE 'TRIAL%' 
      AND expires_at < NOW() 
      AND is_active = TRUE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Remover licenças de teste expiradas há mais de 7 dias
    DELETE FROM public.licenses 
    WHERE id = ANY(trial_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    cleanup_details := jsonb_build_object(
      'message', 'Limpeza de licenças de teste concluída',
      'deleted_count', deleted_count,
      'updated_count', updated_count,
      'deleted_license_ids', trial_ids,
      'threshold_date', NOW() - INTERVAL '7 days'
    );
  END IF;
  
  end_time := clock_timestamp();
  execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  -- Registrar log de limpeza
  INSERT INTO public.license_cleanup_logs (
    cleanup_type,
    deleted_count,
    updated_count,
    cleanup_date,
    details,
    executed_by,
    execution_time_ms
  ) VALUES (
    'TRIAL_CLEANUP',
    deleted_count,
    updated_count,
    start_time,
    cleanup_details,
    auth.uid(),
    execution_time
  );
  
  RETURN cleanup_details;
END;
$$;

-- =====================================================
-- 3. FUNÇÃO DE LIMPEZA GERAL DE LICENÇAS EXPIRADAS
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_all_expired_licenses()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  execution_time INTEGER;
  updated_count INTEGER := 0;
  cleanup_details JSONB;
BEGIN
  start_time := clock_timestamp();
  
  -- Desativar todas as licenças expiradas que ainda estão ativas
  UPDATE public.licenses 
  SET is_active = FALSE, 
      last_validation = NOW()
  WHERE expires_at < NOW() 
    AND is_active = TRUE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  end_time := clock_timestamp();
  execution_time := EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
  
  cleanup_details := jsonb_build_object(
    'message', 'Limpeza geral de licenças expiradas concluída',
    'updated_count', updated_count,
    'deleted_count', 0,
    'cleanup_date', start_time
  );
  
  -- Registrar log de limpeza
  INSERT INTO public.license_cleanup_logs (
    cleanup_type,
    deleted_count,
    updated_count,
    cleanup_date,
    details,
    executed_by,
    execution_time_ms
  ) VALUES (
    'EXPIRED_CLEANUP',
    0,
    updated_count,
    start_time,
    cleanup_details,
    auth.uid(),
    execution_time
  );
  
  RETURN cleanup_details;
END;
$$;

-- =====================================================
-- 4. FUNÇÃO DE LIMPEZA COMPLETA (TRIAL + EXPIRADAS)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_licenses_complete()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_result JSONB;
  expired_result JSONB;
  combined_result JSONB;
BEGIN
  -- Executar limpeza de licenças de teste
  SELECT public.cleanup_expired_trial_licenses_enhanced() INTO trial_result;
  
  -- Executar limpeza de licenças expiradas
  SELECT public.cleanup_all_expired_licenses() INTO expired_result;
  
  -- Combinar resultados
  combined_result := jsonb_build_object(
    'trial_cleanup', trial_result,
    'expired_cleanup', expired_result,
    'total_deleted', (trial_result->>'deleted_count')::INTEGER,
    'total_updated', (trial_result->>'updated_count')::INTEGER + (expired_result->>'updated_count')::INTEGER,
    'execution_timestamp', NOW()
  );
  
  RETURN combined_result;
END;
$$;

-- =====================================================
-- 5. FUNÇÃO PARA AGENDAMENTO COM PG_CRON
-- =====================================================

CREATE OR REPLACE FUNCTION public.schedule_license_cleanup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Tentar agendar limpeza diária às 3:00 AM UTC
  BEGIN
    -- Limpeza completa diária
    PERFORM cron.schedule(
      'daily-license-cleanup',
      '0 3 * * *',
      'SELECT public.cleanup_licenses_complete();'
    );
    
    -- Limpeza de licenças expiradas a cada 6 horas
    PERFORM cron.schedule(
      'hourly-expired-license-cleanup',
      '0 */6 * * *',
      'SELECT public.cleanup_all_expired_licenses();'
    );
    
    RAISE NOTICE 'Jobs de limpeza de licenças agendados com sucesso';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron não disponível, usando sistema de triggers';
  END;
END;
$$;

-- =====================================================
-- 6. TRIGGER PARA LIMPEZA AUTOMÁTICA OCASIONAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_license_cleanup_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result JSONB;
BEGIN
  -- Executar limpeza ocasionalmente (1 em 200 ativações para reduzir overhead)
  IF random() < 0.005 THEN
    BEGIN
      -- Executar apenas limpeza de expiradas (mais leve)
      SELECT public.cleanup_all_expired_licenses() INTO cleanup_result;
      
      -- Se for uma ativação de licença de teste, executar limpeza de trials também
      IF NEW.code LIKE 'TRIAL%' AND NEW.is_active = TRUE THEN
        SELECT public.cleanup_expired_trial_licenses_enhanced() INTO cleanup_result;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro se possível, mas não falhar a operação principal
        BEGIN
          INSERT INTO public.license_cleanup_logs (
            cleanup_type,
            deleted_count,
            updated_count,
            details,
            executed_by
          ) VALUES (
            'TRIAL_CLEANUP',
            0,
            0,
            jsonb_build_object(
              'error', SQLERRM,
              'sqlstate', SQLSTATE,
              'trigger_execution', true
            ),
            auth.uid()
          );
        EXCEPTION
          WHEN OTHERS THEN
            -- Se nem o log funcionar, ignorar silenciosamente
            NULL;
        END;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- 7. CRIAR TRIGGERS
-- =====================================================

-- Trigger para limpeza automática em ativações de licença
DROP TRIGGER IF EXISTS auto_license_cleanup_on_activation ON public.licenses;
CREATE TRIGGER auto_license_cleanup_on_activation
  AFTER UPDATE ON public.licenses
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE AND OLD.is_active = FALSE)
  EXECUTE FUNCTION public.auto_license_cleanup_trigger();

-- =====================================================
-- 8. FUNÇÃO ADMINISTRATIVA PARA LIMPEZA MANUAL
-- =====================================================

CREATE OR REPLACE FUNCTION public.admin_manual_license_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result JSONB;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem executar limpeza manual';
  END IF;
  
  -- Executar limpeza completa
  SELECT public.cleanup_licenses_complete() INTO cleanup_result;
  
  -- Adicionar informação de execução manual
  cleanup_result := cleanup_result || jsonb_build_object(
    'execution_type', 'manual',
    'executed_by_admin', auth.uid()
  );
  
  -- Registrar log específico de limpeza manual
  INSERT INTO public.license_cleanup_logs (
    cleanup_type,
    deleted_count,
    updated_count,
    details,
    executed_by
  ) VALUES (
    'MANUAL_CLEANUP',
    (cleanup_result->>'total_deleted')::INTEGER,
    (cleanup_result->>'total_updated')::INTEGER,
    cleanup_result,
    auth.uid()
  );
  
  RETURN cleanup_result;
END;
$$;

-- =====================================================
-- 9. TENTAR AGENDAR JOBS AUTOMÁTICOS
-- =====================================================

SELECT public.schedule_license_cleanup();

-- =====================================================
-- 10. PERMISSÕES
-- =====================================================

-- Permissões para tabela de logs
GRANT SELECT ON public.license_cleanup_logs TO authenticated;
GRANT ALL PRIVILEGES ON public.license_cleanup_logs TO service_role;

-- Permissões para funções
GRANT EXECUTE ON FUNCTION public.cleanup_expired_trial_licenses_enhanced() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_all_expired_licenses() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_licenses_complete() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_manual_license_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_license_cleanup() TO service_role;

-- =====================================================
-- 11. COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE public.license_cleanup_logs IS 'Logs de auditoria para limpeza automática de licenças';
COMMENT ON FUNCTION public.cleanup_expired_trial_licenses_enhanced() IS 'Limpeza melhorada de licenças de teste expiradas com logs detalhados';
COMMENT ON FUNCTION public.cleanup_all_expired_licenses() IS 'Desativa todas as licenças expiradas que ainda estão ativas';
COMMENT ON FUNCTION public.cleanup_licenses_complete() IS 'Executa limpeza completa de licenças (trials + expiradas)';
COMMENT ON FUNCTION public.admin_manual_license_cleanup() IS 'Função administrativa para limpeza manual de licenças';
COMMENT ON FUNCTION public.schedule_license_cleanup() IS 'Agenda jobs automáticos de limpeza usando pg_cron';
COMMENT ON FUNCTION public.auto_license_cleanup_trigger() IS 'Trigger para limpeza automática ocasional de licenças';