
DO $$
DECLARE
  v_uid uuid := '88e717ac-d5ca-4dd9-ac4e-4b3116c7d97c';
BEGIN
  -- Nullify all nullable FK references to this user across public tables
  UPDATE api_keys SET created_by = NULL WHERE created_by = v_uid;
  UPDATE api_keys SET updated_by = NULL WHERE updated_by = v_uid;
  UPDATE budget_deletion_audit SET deleted_by = (SELECT id FROM auth.users LIMIT 1) WHERE deleted_by = v_uid;
  UPDATE budget_parts SET deleted_by = NULL WHERE deleted_by = v_uid;
  UPDATE budgets SET deleted_by = NULL WHERE deleted_by = v_uid;
  UPDATE budgets SET updated_by = NULL WHERE updated_by = v_uid;
  UPDATE device_test_sessions SET created_by = NULL WHERE created_by = v_uid;
  UPDATE drippy_settings SET updated_by = NULL WHERE updated_by = v_uid;
  UPDATE license_cleanup_logs SET executed_by = NULL WHERE executed_by = v_uid;
  UPDATE licenses SET created_by_admin_id = NULL WHERE created_by_admin_id = v_uid;
  UPDATE notifications SET target_user_id = NULL WHERE target_user_id = v_uid;
  UPDATE push_notifications SET created_by = (SELECT id FROM auth.users WHERE id != v_uid LIMIT 1) WHERE created_by = v_uid;
  UPDATE push_notifications SET target_user_id = NULL WHERE target_user_id = v_uid;
  UPDATE security_alerts SET escalated_to = NULL WHERE escalated_to = v_uid;
  UPDATE security_alerts SET resolved_by = NULL WHERE resolved_by = v_uid;
  UPDATE shop_profiles SET updated_by = NULL WHERE updated_by = v_uid;
  UPDATE system_status SET updated_by = NULL WHERE updated_by = v_uid;
  UPDATE updates SET created_by = (SELECT id FROM auth.users WHERE id != v_uid LIMIT 1) WHERE created_by = v_uid;
  UPDATE user_profiles SET updated_by = NULL WHERE updated_by = v_uid;

  -- Delete data from tables with user_id
  DELETE FROM chat_messages WHERE user_id = v_uid;
  DELETE FROM chat_mood WHERE user_id = v_uid;
  DELETE FROM notification_views WHERE user_id = v_uid;
  DELETE FROM license_activation_log WHERE user_id = v_uid;
  DELETE FROM license_validation_audit WHERE user_id = v_uid;
  DELETE FROM access_logs WHERE user_id = v_uid;
  DELETE FROM admin_logs WHERE admin_user_id = v_uid;
  DELETE FROM persistent_sessions WHERE user_id = v_uid;
  DELETE FROM coupon_usage WHERE user_id = v_uid;
  DELETE FROM peliculas_suggestions WHERE user_id = v_uid;
  DELETE FROM pdf_templates WHERE user_id = v_uid;
  DELETE FROM pix_transactions WHERE user_id = v_uid;
  DELETE FROM audit_logs WHERE user_id = v_uid;
  DELETE FROM file_upload_audit WHERE user_id = v_uid;
  DELETE FROM site_events WHERE user_id = v_uid;
  DELETE FROM system_logs WHERE user_id = v_uid;
  DELETE FROM user_activity_logs WHERE user_id = v_uid;
  DELETE FROM user_api_keys WHERE user_id = v_uid;
  DELETE FROM user_cookie_preferences WHERE user_id = v_uid;
  DELETE FROM push_notification_logs WHERE user_id = v_uid;
  DELETE FROM repair_monthly_closings WHERE user_id = v_uid;
  DELETE FROM repair_services WHERE user_id = v_uid;
  DELETE FROM repair_technicians WHERE user_id = v_uid;
  DELETE FROM shop_profiles WHERE user_id = v_uid;
  DELETE FROM stores WHERE owner_id = v_uid;
  DELETE FROM kowalski_instances WHERE owner_id = v_uid;

  -- Mercadopago
  DELETE FROM mercadopago_subscription_events WHERE subscription_id IN (
    SELECT id FROM mercadopago_subscriptions WHERE user_id = v_uid
  );
  DELETE FROM mercadopago_subscriptions WHERE user_id = v_uid;

  -- Licenses
  DELETE FROM license_history WHERE license_id IN (
    SELECT id FROM licenses WHERE user_id = v_uid
  );
  DELETE FROM licenses WHERE user_id = v_uid;

  DELETE FROM purchase_registrations WHERE user_id = v_uid;
  DELETE FROM payments WHERE user_id = v_uid;

  -- Clients (disable trigger)
  DELETE FROM clients WHERE user_id = v_uid AND (is_default IS NULL OR is_default = false);
  ALTER TABLE clients DISABLE TRIGGER prevent_default_client_deletion_trigger;
  DELETE FROM clients WHERE user_id = v_uid;
  ALTER TABLE clients ENABLE TRIGGER prevent_default_client_deletion_trigger;

  -- Company
  DELETE FROM company_share_settings WHERE owner_id = v_uid;
  DELETE FROM company_info WHERE owner_id = v_uid;

  -- Budgets
  DELETE FROM budget_parts WHERE budget_id IN (SELECT id FROM budgets WHERE owner_id = v_uid);
  DELETE FROM budgets WHERE owner_id = v_uid;

  -- Notifications
  UPDATE notifications SET created_by = (SELECT id FROM auth.users WHERE id != v_uid LIMIT 1) WHERE created_by = v_uid;

  -- User profile
  DELETE FROM user_profiles WHERE id = v_uid;

  -- Auth
  DELETE FROM auth.sessions WHERE user_id = v_uid;
  DELETE FROM auth.mfa_factors WHERE user_id = v_uid;
  DELETE FROM auth.identities WHERE user_id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;
END $$;
