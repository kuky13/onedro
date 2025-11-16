-- Fix admin_delete_user_completely_enhanced function
-- This migration ensures the function exists and works correctly

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN);

-- Create enhanced complete user deletion function
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
    SELECT auth.uid() INTO v_admin_id;
    
    -- Validate admin permissions
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = v_admin_id 
        AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;

    -- Validate confirmation code
    IF p_confirmation_code != 'DELETE_USER_PERMANENTLY' THEN
        RAISE EXCEPTION 'Código de confirmação inválido. Digite: DELETE_USER_PERMANENTLY';
    END IF;

    -- Get user info before deletion
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    SELECT name INTO v_user_name FROM user_profiles WHERE id = p_user_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;

    -- Start deletion process
    BEGIN
        -- 1. Delete from user_license_history
        DELETE FROM user_license_history WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_license_history', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 2. Delete from user_cookie_preferences
        DELETE FROM user_cookie_preferences WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_cookie_preferences', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 3. Delete from push_subscriptions
        DELETE FROM push_subscriptions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('push_subscriptions', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 4. Delete from user_notifications
        DELETE FROM user_notifications WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_notifications', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 5. Delete from notifications (as target_user_id)
        DELETE FROM notifications WHERE target_user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('notifications_as_target', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 6. Nullify created_by in notifications
        UPDATE notifications SET created_by = NULL WHERE created_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('notifications_created_by_nullified', v_count);

        -- 7. Delete from whatsapp_analytics_sessions
        DELETE FROM whatsapp_analytics_sessions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_sessions', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 8. Delete from whatsapp_analytics_messages
        DELETE FROM whatsapp_analytics_messages WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_messages', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 9. Delete from sequential_numbers
        DELETE FROM sequential_numbers WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('sequential_numbers', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 10. Delete from user_files
        DELETE FROM user_files WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('files', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 11. Delete from transactions
        DELETE FROM transactions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('transactions', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 12. Delete from clients
        DELETE FROM clients WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('clients', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 13. Delete from company_share_settings
        DELETE FROM company_share_settings WHERE owner_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('company_share_settings', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 14. Delete from user_updates
        DELETE FROM user_updates WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_updates', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 15. Nullify owner_id in budgets
        UPDATE budgets SET owner_id = NULL WHERE owner_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_owner_nullified', v_count);

        -- 16. Nullify created_by in budgets
        UPDATE budgets SET created_by = NULL WHERE created_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_created_by_nullified', v_count);

        -- 17. Nullify updated_by in budgets
        UPDATE budgets SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_updated_by_nullified', v_count);

        -- 18. Nullify updated_by in user_profiles
        UPDATE user_profiles SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_profiles_updated_by_nullified', v_count);

        -- 19. Nullify deleted_by in various tables
        UPDATE budgets SET deleted_by = NULL WHERE deleted_by = p_user_id;
        UPDATE clients SET deleted_by = NULL WHERE deleted_by = p_user_id;
        
        -- 20. Delete from user_profiles (this should be done before auth.users)
        DELETE FROM user_profiles WHERE id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_profile', v_count > 0);
        v_total_tables_affected := v_total_tables_affected + 1;

        -- 21. Delete from auth.users if requested (this MUST be last)
        IF p_delete_auth_user THEN
            PERFORM auth.admin_delete_user(p_user_id);
            v_deleted_data := v_deleted_data || jsonb_build_object('auth_user_deleted', true);
        ELSE
            v_deleted_data := v_deleted_data || jsonb_build_object('auth_user_deleted', false);
        END IF;

        -- Add summary information
        v_deleted_data := v_deleted_data || jsonb_build_object(
            'total_tables_affected', v_total_tables_affected,
            'user_email', v_user_email,
            'user_name', COALESCE(v_user_name, 'N/A'),
            'deleted_at', NOW(),
            'deleted_by_admin', v_admin_id
        );

        -- Log the successful deletion
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
        -- Log the error
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
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_delete_user_completely_enhanced TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) IS
'Exclui usuário completamente do sistema com logging detalhado. Versão aprimorada que remove dados de todas as tabelas relacionadas.';