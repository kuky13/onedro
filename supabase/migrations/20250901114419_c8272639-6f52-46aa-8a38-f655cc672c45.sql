-- FASE 1: Dropar função existente que está causando conflito
DROP FUNCTION IF EXISTS public.verify_cleanup_integrity() CASCADE;

-- FASE 2: REMOÇÃO SEGURA - Primeiro as views vazias (sem dependências)
DROP VIEW IF EXISTS public.blocked_ips CASCADE;
DROP VIEW IF EXISTS public.failed_events CASCADE;
DROP VIEW IF EXISTS public.recent_attacks CASCADE;
DROP VIEW IF EXISTS public.security_events CASCADE;
DROP VIEW IF EXISTS public.alert_trends CASCADE;
DROP VIEW IF EXISTS public.audit_statistics CASCADE;
DROP VIEW IF EXISTS public.rate_limiting_stats CASCADE;
DROP VIEW IF EXISTS public.security_alert_stats CASCADE;
DROP VIEW IF EXISTS public.recent_critical_alerts CASCADE;
DROP VIEW IF EXISTS public.recent_license_security_events CASCADE;

-- FASE 3: Remoção de funções de manutenção não utilizadas
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_users() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_inactive_push_subscriptions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_security_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_audit_logs() CASCADE;
DROP FUNCTION IF EXISTS public.daily_maintenance() CASCADE;
DROP FUNCTION IF EXISTS public.validate_data_integrity() CASCADE;
DROP FUNCTION IF EXISTS public.verify_system_integrity() CASCADE;
DROP FUNCTION IF EXISTS public.detect_suspicious_patterns() CASCADE;

-- FASE 4: Remoção de tabelas vazias (verificar se existem antes de dropar)
DROP TABLE IF EXISTS public.whatsapp_conversions CASCADE;
DROP TABLE IF EXISTS public.whatsapp_sales CASCADE;
DROP TABLE IF EXISTS public.admin_images CASCADE;

-- FASE 5: Criar função simples de verificação da limpeza
CREATE OR REPLACE FUNCTION public.check_cleanup_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'cleanup_completed', true,
    'remaining_tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'remaining_functions', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public'),
    'remaining_views', (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public'),
    'essential_data_intact', jsonb_build_object(
      'budgets', (SELECT COUNT(*) FROM public.budgets),
      'user_profiles', (SELECT COUNT(*) FROM public.user_profiles),
      'licenses', (SELECT COUNT(*) FROM public.licenses)
    ),
    'timestamp', now()
  ) INTO result;
  
  RETURN result;
END;
$$;