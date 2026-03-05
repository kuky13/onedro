-- Delete all budgets and related parts
DELETE FROM public.budget_parts;
DELETE FROM public.budgets;
DELETE FROM public.budget_deletion_audit;

-- Delete various log / debug tables that do not affect core system behavior
DELETE FROM public.access_logs;
DELETE FROM public.admin_logs;
DELETE FROM public.audit_logs;
DELETE FROM public.cleanup_logs;
DELETE FROM public.file_upload_audit;
DELETE FROM public.license_activation_log;
DELETE FROM public.license_cleanup_logs;
DELETE FROM public.license_expiration_log;
DELETE FROM public.login_attempts;
DELETE FROM public.mercadopago_subscription_events;
DELETE FROM public.notification_views;
DELETE FROM public.push_notification_logs;
DELETE FROM public.rate_limit_tracking;
DELETE FROM public.rate_limiting;
DELETE FROM public.security_alerts;