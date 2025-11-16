-- =====================================================
-- Sistema de Licenças - Triggers Automáticos
-- =====================================================

-- =====================================================
-- 1. TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE LICENÇA DE TESTE
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_create_trial_license()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  trial_result JSONB;
BEGIN
  -- Criar licença de teste para novo usuário
  -- Usar TRY/CATCH para evitar falhas na criação do perfil
  BEGIN
    SELECT public.create_trial_license(NEW.id) INTO trial_result;
    
    -- Log do resultado (opcional)
    IF (trial_result->>'success')::BOOLEAN = FALSE THEN
      RAISE NOTICE 'Falha ao criar licença de teste para usuário %: %', NEW.id, trial_result->>'error';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log do erro mas não falha a criação do perfil
      RAISE NOTICE 'Erro ao criar licença de teste para usuário %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_auto_trial_license ON public.user_profiles;

-- Criar trigger para novos perfis de usuário
CREATE TRIGGER trigger_auto_trial_license
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_trial_license();

-- =====================================================
-- 2. TRIGGER PARA LOG DE ATIVAÇÕES DE LICENÇA
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_license_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log apenas quando licença é ativada (mudança de FALSE para TRUE)
  IF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
    INSERT INTO public.license_activation_log (
      license_code,
      user_id,
      days_granted,
      ip_address,
      user_agent
    ) VALUES (
      NEW.code,
      NEW.user_id,
      public.decode_license_days(NEW.code),
      COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', 
               current_setting('request.headers', true)::json->>'x-real-ip')::inet,
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se falhar o log, não impede a ativação da licença
    RAISE NOTICE 'Erro ao registrar log de ativação: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_log_license_activation ON public.licenses;

-- Criar trigger para log de ativações
CREATE TRIGGER trigger_log_license_activation
  AFTER UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.log_license_activation();

-- =====================================================
-- 3. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION public.auto_update_license_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Desativar licenças expiradas automaticamente
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.is_active = TRUE THEN
    NEW.is_active := FALSE;
    RAISE NOTICE 'Licença % desativada automaticamente por expiração', NEW.code;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_auto_update_license_status ON public.licenses;

-- Criar trigger para atualização automática de status
CREATE TRIGGER trigger_auto_update_license_status
  BEFORE UPDATE ON public.licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_update_license_status();

-- =====================================================
-- 4. FUNÇÃO PARA VERIFICAR INTEGRIDADE DO SISTEMA
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_license_system_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_licenses INTEGER;
  active_licenses INTEGER;
  trial_licenses INTEGER;
  expired_active_licenses INTEGER;
  users_without_licenses INTEGER;
BEGIN
  -- Contar licenças
  SELECT COUNT(*) INTO total_licenses FROM public.licenses;
  SELECT COUNT(*) INTO active_licenses FROM public.licenses WHERE is_active = TRUE;
  SELECT COUNT(*) INTO trial_licenses FROM public.licenses WHERE code LIKE 'TRIAL%';
  
  -- Contar licenças ativas mas expiradas (problema)
  SELECT COUNT(*) INTO expired_active_licenses 
  FROM public.licenses 
  WHERE is_active = TRUE AND expires_at < NOW();
  
  -- Contar usuários sem licenças
  SELECT COUNT(*) INTO users_without_licenses
  FROM public.user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM public.licenses l 
    WHERE l.user_id = up.id AND l.is_active = TRUE
  );
  
  result := jsonb_build_object(
    'total_licenses', total_licenses,
    'active_licenses', active_licenses,
    'trial_licenses', trial_licenses,
    'expired_active_licenses', expired_active_licenses,
    'users_without_licenses', users_without_licenses,
    'system_health', CASE 
      WHEN expired_active_licenses = 0 THEN 'healthy'
      WHEN expired_active_licenses < 10 THEN 'warning'
      ELSE 'critical'
    END,
    'check_timestamp', NOW()
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- 5. PERMISSÕES PARA OS TRIGGERS
-- =====================================================

-- Garantir que as funções de trigger podem ser executadas
GRANT EXECUTE ON FUNCTION public.auto_create_trial_license() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_license_activation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_update_license_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_license_system_integrity() TO authenticated;

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION public.auto_create_trial_license() IS 'Trigger function: Cria automaticamente licença de teste para novos usuários';
COMMENT ON FUNCTION public.log_license_activation() IS 'Trigger function: Registra log quando licenças são ativadas';
COMMENT ON FUNCTION public.auto_update_license_status() IS 'Trigger function: Desativa automaticamente licenças expiradas';
COMMENT ON FUNCTION public.check_license_system_integrity() IS 'Verifica integridade e saúde do sistema de licenças';

-- =====================================================
-- FIM DA MIGRAÇÃO DE TRIGGERS
-- =====================================================