-- Fix duplicate logs issue in user deletion
-- This migration ensures only one function is used and prevents duplicate logging

-- Drop all old versions of the function to prevent conflicts
DROP FUNCTION IF EXISTS admin_delete_user_completely(UUID, TEXT, BOOLEAN);

-- Ensure the enhanced function exists and is the only one
DROP FUNCTION IF EXISTS admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN);

-- Create the definitive enhanced user deletion function
CREATE OR REPLACE FUNCTION admin_delete_user_completely_enhanced(
    p_user_id UUID,
    p_confirmation_code TEXT,
    p_delete_auth_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_deleted_data JSONB := '{}';
    v_count INTEGER;
    v_total_tables_affected INTEGER := 0;
BEGIN
    -- Get admin user ID
    v_admin_id := auth.uid();
    
    -- Validate admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = v_admin_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;

    -- Validate confirmation code
    IF p_confirmation_code != 'CONFIRMAR_EXCLUSAO' THEN
        RAISE EXCEPTION 'Código de confirmação inválido';
    END IF;

    -- Get user info before deletion
    SELECT email, name INTO v_user_email, v_user_name
    FROM user_profiles WHERE id = p_user_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;

    -- Start deletion process
    
    -- 1. Delete from user_files
    DELETE FROM user_files WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_files', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 2. Delete from transactions
    DELETE FROM transactions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('transactions', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 3. Delete from clients
    DELETE FROM clients WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('clients', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 4. Delete notifications where user is target
    DELETE FROM notifications WHERE target_user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('notifications_as_target', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 5. Nullify notifications created by user
    UPDATE notifications SET created_by = NULL WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('notifications_created_by_nullified', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 6. Delete from push_subscriptions
    DELETE FROM push_subscriptions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('push_subscriptions', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 7. Delete from user_notifications
    DELETE FROM user_notifications WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_notifications', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 8. Delete from user_license_history
    DELETE FROM user_license_history WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_license_history', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 9. Delete from user_cookie_preferences
    DELETE FROM user_cookie_preferences WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_cookie_preferences', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 10. Delete from whatsapp_analytics_sessions
    DELETE FROM whatsapp_analytics_sessions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_sessions', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 11. Delete from whatsapp_analytics_messages
    DELETE FROM whatsapp_analytics_messages WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_messages', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 12. Delete from sequential_numbers
    DELETE FROM sequential_numbers WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('sequential_numbers', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 13. Delete from company_share_settings
    DELETE FROM company_share_settings WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('company_share_settings', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 14. Delete from user_updates
    DELETE FROM user_updates WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_updates', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 15. Nullify budget references
    UPDATE budgets SET owner_id = NULL WHERE owner_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('budgets_owner_nullified', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    UPDATE budgets SET created_by = NULL WHERE created_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('budgets_created_by_nullified', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    UPDATE budgets SET updated_by = NULL WHERE updated_by = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('budgets_updated_by_nullified', v_count);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 16. Delete from user_profiles (this will cascade to user_licenses)
    DELETE FROM user_profiles WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_data := v_deleted_data || jsonb_build_object('user_profile', v_count > 0);
    v_total_tables_affected := v_total_tables_affected + 1;

    -- 17. Delete from auth.users if requested (this MUST be last)
    IF p_delete_auth_user THEN
        DELETE FROM auth.users WHERE id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('auth_user_deleted', v_count > 0);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- Add summary data
    v_deleted_data := v_deleted_data || jsonb_build_object(
        'total_tables_affected', v_total_tables_affected,
        'user_email', v_user_email,
        'user_name', v_user_name,
        'deleted_at', NOW(),
        'deleted_by_admin', v_admin_id
    );

    -- Log the successful deletion (SINGLE LOG ENTRY)
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES (
        v_admin_id, 'DELETE_USER_COMPLETELY_ENHANCED', 
        jsonb_build_object(
            'user_id', p_user_id,
            'user_email', v_user_email,
            'deleted_data', v_deleted_data
        ),
        NOW()
    );

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', 'Usuário excluído completamente com sucesso',
        'deleted_data', v_deleted_data
    );

EXCEPTION WHEN OTHERS THEN
    -- Log the error (SINGLE ERROR LOG ENTRY)
    INSERT INTO admin_logs (admin_id, action, details, created_at)
    VALUES (
        v_admin_id, 'DELETE_USER_ERROR_ENHANCED', 
        jsonb_build_object(
            'user_id', p_user_id,
            'error', SQLERRM,
            'error_state', SQLSTATE
        ),
        NOW()
    );

    -- Re-raise the exception
    RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_delete_user_completely_enhanced TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) IS
'Exclui usuário completamente do sistema com logging único. Versão definitiva que previne logs duplicados.';

-- Create alias for backward compatibility (redirects to enhanced function)
CREATE OR REPLACE FUNCTION admin_delete_user_completely(
    p_user_id UUID,
    p_confirmation_code TEXT,
    p_delete_auth_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Simply call the enhanced function to maintain compatibility
    RETURN admin_delete_user_completely_enhanced(p_user_id, p_confirmation_code, p_delete_auth_user);
END;
$$;

-- Grant execute permission for compatibility function
GRANT EXECUTE ON FUNCTION admin_delete_user_completely TO authenticated;

-- Add comment for compatibility function
COMMENT ON FUNCTION admin_delete_user_completely(UUID, TEXT, BOOLEAN) IS
'Função de compatibilidade que redireciona para admin_delete_user_completely_enhanced.';