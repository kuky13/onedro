-- Migração para triggers automáticos do sistema de licenças
-- Criado em: 2025-01-20
-- Descrição: Implementa triggers para criação automática de licenças de teste e log de ativações

-- 1. Função trigger para criar licença de teste automaticamente para novos usuários
CREATE OR REPLACE FUNCTION auto_create_trial_license()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_result jsonb;
BEGIN
  -- Aguardar um pouco para garantir que o usuário foi criado completamente
  PERFORM pg_sleep(0.1);
  
  -- Tentar criar licença de teste
  BEGIN
    SELECT public.create_trial_license(NEW.id) INTO trial_result;
    
    -- Log do resultado (se a função de log existir)
    BEGIN
      INSERT INTO public.system_logs (
        log_type,
        message,
        user_id,
        metadata,
        created_at
      ) VALUES (
        'TRIAL_LICENSE_AUTO_CREATED',
        'Licença de teste criada automaticamente para novo usuário',
        NEW.id,
        trial_result,
        NOW()
      );
    EXCEPTION
      WHEN undefined_table THEN
        -- Tabela de logs não existe, ignorar
        NULL;
    END;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro (se a função de log existir)
      BEGIN
        INSERT INTO public.system_logs (
          log_type,
          message,
          user_id,
          metadata,
          created_at
        ) VALUES (
          'TRIAL_LICENSE_AUTO_CREATE_ERROR',
          'Erro ao criar licença de teste automaticamente: ' || SQLERRM,
          NEW.id,
          jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE),
          NOW()
        );
      EXCEPTION
        WHEN undefined_table THEN
          -- Tabela de logs não existe, ignorar
          NULL;
      END;
  END;
  
  RETURN NEW;
END;
$$;

-- 2. Função trigger para log de ativações de licença
CREATE OR REPLACE FUNCTION log_license_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activation_type text;
  log_message text;
BEGIN
  -- Determinar o tipo de ativação
  IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
    activation_type := 'LICENSE_ACTIVATED';
    log_message := 'Licença ativada';
  ELSIF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
    activation_type := 'LICENSE_DEACTIVATED';
    log_message := 'Licença desativada';
  ELSIF OLD.user_id IS NULL AND NEW.user_id IS NOT NULL THEN
    activation_type := 'LICENSE_LINKED';
    log_message := 'Licença vinculada ao usuário';
  ELSIF OLD.user_id IS NOT NULL AND NEW.user_id IS NULL THEN
    activation_type := 'LICENSE_UNLINKED';
    log_message := 'Licença desvinculada do usuário';
  ELSE
    -- Não é uma mudança relevante para log
    RETURN NEW;
  END IF;

  -- Registrar no histórico de licenças (se a tabela existir)
  BEGIN
    INSERT INTO public.license_history (
      license_id,
      admin_id,
      action_type,
      old_values,
      new_values,
      notes,
      created_at
    ) VALUES (
      NEW.id,
      auth.uid(), -- Pode ser NULL se for trigger automático
      activation_type,
      jsonb_build_object(
        'is_active', OLD.is_active,
        'user_id', OLD.user_id,
        'activated_at', OLD.activated_at
      ),
      jsonb_build_object(
        'is_active', NEW.is_active,
        'user_id', NEW.user_id,
        'activated_at', NEW.activated_at
      ),
      log_message,
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de histórico não existe ainda, ignorar
      NULL;
  END;

  -- Registrar no log do sistema (se a tabela existir)
  BEGIN
    INSERT INTO public.system_logs (
      log_type,
      message,
      user_id,
      metadata,
      created_at
    ) VALUES (
      activation_type,
      log_message || ' - Código: ' || NEW.code,
      NEW.user_id,
      jsonb_build_object(
        'license_id', NEW.id,
        'license_code', NEW.code,
        'old_state', jsonb_build_object(
          'is_active', OLD.is_active,
          'user_id', OLD.user_id
        ),
        'new_state', jsonb_build_object(
          'is_active', NEW.is_active,
          'user_id', NEW.user_id
        )
      ),
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de logs não existe, ignorar
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- 3. Função trigger para limpeza automática de licenças de teste expiradas
CREATE OR REPLACE FUNCTION auto_cleanup_expired_trials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_result jsonb;
BEGIN
  -- Executar limpeza apenas ocasionalmente (1 em 100 ativações)
  IF random() < 0.01 THEN
    BEGIN
      SELECT public.cleanup_expired_trial_licenses() INTO cleanup_result;
      
      -- Log do resultado (se a função de log existir)
      BEGIN
        INSERT INTO public.system_logs (
          log_type,
          message,
          metadata,
          created_at
        ) VALUES (
          'TRIAL_CLEANUP_AUTO_EXECUTED',
          'Limpeza automática de licenças de teste executada',
          cleanup_result,
          NOW()
        );
      EXCEPTION
        WHEN undefined_table THEN
          -- Tabela de logs não existe, ignorar
          NULL;
      END;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log do erro (se a função de log existir)
        BEGIN
          INSERT INTO public.system_logs (
            log_type,
            message,
            metadata,
            created_at
          ) VALUES (
            'TRIAL_CLEANUP_AUTO_ERROR',
            'Erro na limpeza automática de licenças de teste: ' || SQLERRM,
            jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE),
            NOW()
          );
        EXCEPTION
          WHEN undefined_table THEN
            -- Tabela de logs não existe, ignorar
            NULL;
        END;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Criar triggers

-- Trigger para criação automática de licença de teste em novos usuários
-- Nota: Este trigger será criado na tabela auth.users se possível, senão será manual
DO $$
BEGIN
  -- Tentar criar trigger na tabela auth.users
  BEGIN
    DROP TRIGGER IF EXISTS auto_trial_license_trigger ON auth.users;
    CREATE TRIGGER auto_trial_license_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_create_trial_license();
  EXCEPTION
    WHEN insufficient_privilege OR undefined_table THEN
      -- Não temos permissão para criar trigger em auth.users
      -- O trigger será criado manualmente ou via função administrativa
      NULL;
  END;
END $$;

-- Trigger para log de ativações de licença
DROP TRIGGER IF EXISTS license_activation_log_trigger ON public.licenses;
CREATE TRIGGER license_activation_log_trigger
  AFTER UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_license_activation();

-- Trigger para limpeza automática ocasional de licenças de teste
DROP TRIGGER IF EXISTS auto_trial_cleanup_trigger ON public.licenses;
CREATE TRIGGER auto_trial_cleanup_trigger
  AFTER UPDATE ON public.licenses
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE AND OLD.is_active = FALSE)
  EXECUTE FUNCTION public.auto_cleanup_expired_trials();

-- 5. Função administrativa para criar licença de teste manualmente (caso o trigger automático não funcione)
CREATE OR REPLACE FUNCTION admin_create_trial_for_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_result jsonb;
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar licenças de teste manualmente';
  END IF;

  -- Criar licença de teste
  SELECT public.create_trial_license(p_user_id) INTO trial_result;

  -- Log da ação
  BEGIN
    INSERT INTO public.license_history (
      license_id,
      admin_id,
      action_type,
      old_values,
      new_values,
      notes,
      created_at
    ) VALUES (
      (trial_result->>'license_id')::uuid,
      auth.uid(),
      'TRIAL_CREATED_MANUALLY',
      '{}',
      trial_result,
      'Licença de teste criada manualmente pelo administrador',
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- Tabela de histórico não existe ainda, ignorar
      NULL;
  END;

  RETURN trial_result;
END;
$$;

-- 6. Função para verificar e reparar usuários sem licença de teste
CREATE OR REPLACE FUNCTION admin_repair_missing_trial_licenses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record record;
  trial_result jsonb;
  created_count integer := 0;
  error_count integer := 0;
  results jsonb[] := '{}';
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem reparar licenças de teste';
  END IF;

  -- Buscar usuários sem licença de teste
  FOR user_record IN 
    SELECT DISTINCT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.licenses l ON l.user_id = au.id AND l.code LIKE 'TRIAL%'
    WHERE l.id IS NULL
      AND au.created_at > NOW() - INTERVAL '30 days' -- Apenas usuários recentes
  LOOP
    BEGIN
      SELECT public.create_trial_license(user_record.id) INTO trial_result;
      created_count := created_count + 1;
      results := array_append(results, jsonb_build_object(
        'user_id', user_record.id,
        'email', user_record.email,
        'status', 'success',
        'result', trial_result
      ));
    EXCEPTION
      WHEN OTHERS THEN
        error_count := error_count + 1;
        results := array_append(results, jsonb_build_object(
          'user_id', user_record.id,
          'email', user_record.email,
          'status', 'error',
          'error', SQLERRM
        ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reparação de licenças de teste concluída',
    'created_count', created_count,
    'error_count', error_count,
    'results', results
  );
END;
$$;

-- 7. Conceder permissões
GRANT EXECUTE ON FUNCTION admin_create_trial_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_repair_missing_trial_licenses() TO authenticated;

-- 8. Comentários
COMMENT ON FUNCTION auto_create_trial_license() IS 'Trigger function para criar licença de teste automaticamente para novos usuários';
COMMENT ON FUNCTION log_license_activation() IS 'Trigger function para registrar ativações e mudanças de estado das licenças';
COMMENT ON FUNCTION auto_cleanup_expired_trials() IS 'Trigger function para limpeza automática ocasional de licenças de teste expiradas';
COMMENT ON FUNCTION admin_create_trial_for_user(uuid) IS 'Função administrativa para criar licença de teste manualmente';
COMMENT ON FUNCTION admin_repair_missing_trial_licenses() IS 'Função para reparar usuários que não receberam licença de teste automaticamente';