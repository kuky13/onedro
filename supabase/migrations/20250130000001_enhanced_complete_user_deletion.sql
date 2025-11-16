-- Enhanced Complete User Deletion System
-- This migration creates an improved user deletion function that removes ALL traces of a user
-- ensuring the email is completely freed for new registrations

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
    v_tables_affected INTEGER := 0;
    v_count INTEGER;
BEGIN
    -- Security checks
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;
    
    v_admin_id := auth.uid();
    
    -- Prevent admin from deleting themselves
    IF p_user_id = v_admin_id THEN
        RAISE EXCEPTION 'Não é possível excluir sua própria conta';
    END IF;
    
    -- Get user data for verification
    SELECT au.email, up.name 
    INTO v_user_email, v_user_name
    FROM auth.users au
    LEFT JOIN user_profiles up ON au.id = up.id
    WHERE au.id = p_user_id;
    
    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;
    
    -- Verify confirmation code (must be exact email)
    IF v_user_email != p_confirmation_code THEN
        RAISE EXCEPTION 'Código de confirmação inválido. Digite o email exato do usuário.';
    END IF;
    
    -- Start atomic transaction for complete deletion
    BEGIN
        -- 1. Delete from user_license_history
        DELETE FROM user_license_history WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_license_history', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 2. Delete from user_cookie_preferences
        DELETE FROM user_cookie_preferences WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_cookie_preferences', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 3. Delete from push_subscriptions
        DELETE FROM push_subscriptions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('push_subscriptions', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 4. Delete from user_notifications
        DELETE FROM user_notifications WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_notifications', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 5. Delete from notifications (as target_user_id)
        DELETE FROM notifications WHERE target_user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('notifications_as_target', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 6. Update notifications (as created_by) to NULL to preserve notification history
        UPDATE notifications SET created_by = NULL WHERE created_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('notifications_created_by_nullified', v_count);
        
        -- 7. Delete from whatsapp_analytics_sessions
        DELETE FROM whatsapp_analytics_sessions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_sessions', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 8. Delete from whatsapp_analytics_messages
        DELETE FROM whatsapp_analytics_messages WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('whatsapp_analytics_messages', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 9. Delete from sequential_numbers
        DELETE FROM sequential_numbers WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('sequential_numbers', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 10. Delete from user_files
        DELETE FROM user_files WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_files', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 11. Delete from transactions
        DELETE FROM transactions WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('transactions', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 12. Delete from clients
        DELETE FROM clients WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('clients', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 13. Delete from company_share_settings
        DELETE FROM company_share_settings WHERE owner_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('company_share_settings', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 14. Delete from user_updates
        DELETE FROM user_updates WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_updates', v_count);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 15. Update budgets (set owner to NULL to preserve budget history for reporting)
        UPDATE budgets SET owner_id = NULL, updated_by = v_admin_id WHERE owner_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_owner_nullified', v_count);
        
        -- 16. Update budgets (set created_by to NULL)
        UPDATE budgets SET created_by = NULL WHERE created_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_created_by_nullified', v_count);
        
        -- 17. Update budgets (set updated_by to NULL)
        UPDATE budgets SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('budgets_updated_by_nullified', v_count);
        
        -- 18. Update system_status_houston (set updated_by to NULL)
        UPDATE system_status_houston SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('system_status_updated_by_nullified', v_count);
        
        -- 19. Update user_profiles (set updated_by to NULL)
        UPDATE user_profiles SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_profiles_updated_by_nullified', v_count);
        
        -- 20. Update shop_profiles (set updated_by to NULL)
        UPDATE shop_profiles SET updated_by = NULL WHERE updated_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('shop_profiles_updated_by_nullified', v_count);
        
        -- 21. Update updates_system (set created_by to NULL)
        UPDATE updates_system SET created_by = NULL WHERE created_by = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('updates_system_created_by_nullified', v_count);
        
        -- 22. Update deleted records (set deleted_by to NULL)
        UPDATE budgets SET deleted_by = NULL WHERE deleted_by = p_user_id;
        UPDATE clients SET deleted_by = NULL WHERE deleted_by = p_user_id;
        UPDATE trash_items SET deleted_by = NULL WHERE deleted_by = p_user_id;
        
        -- 23. Delete from user_profiles (this should be done last)
        DELETE FROM user_profiles WHERE id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted_data := v_deleted_data || jsonb_build_object('user_profile', v_count > 0);
        IF v_count > 0 THEN v_tables_affected := v_tables_affected + 1; END IF;
        
        -- 24. Delete from auth.users if requested (this MUST be last)
        IF p_delete_auth_user THEN
            PERFORM auth.admin_delete_user(p_user_id);
            v_deleted_data := v_deleted_data || jsonb_build_object('auth_user_deleted', true);
            v_tables_affected := v_tables_affected + 1;
        END IF;
        
        -- Add summary information
        v_deleted_data := v_deleted_data || jsonb_build_object(
            'total_tables_affected', v_tables_affected,
            'user_email', v_user_email,
            'user_name', v_user_name,
            'deleted_at', NOW(),
            'deleted_by_admin', v_admin_id
        );
        
        -- Log the complete deletion action
        INSERT INTO admin_logs (
            admin_user_id, action, target_user_id, details,
            action_type, target_table, target_id, new_values, created_at
        ) VALUES (
            v_admin_id, 'DELETE_USER_COMPLETELY_ENHANCED', p_user_id, v_deleted_data,
            'DELETE_USER_COMPLETE', 'multiple_tables', p_user_id, v_deleted_data, NOW()
        );
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error
            INSERT INTO admin_logs (
                admin_user_id, action, target_user_id, details,
                action_type, target_table, target_id, new_values, created_at
            ) VALUES (
                v_admin_id, 'DELETE_USER_ERROR_ENHANCED', p_user_id,
                jsonb_build_object(
                    'error', SQLERRM, 
                    'sqlstate', SQLSTATE,
                    'user_email', v_user_email,
                    'partial_deleted_data', v_deleted_data
                ),
                'DELETE_USER_ERROR', 'multiple_tables', p_user_id,
                jsonb_build_object('error', SQLERRM), NOW()
            );
            
            RAISE EXCEPTION 'Erro ao excluir usuário completamente: %', SQLERRM;
    END;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Usuário %s (%s) excluído completamente do sistema', v_user_name, v_user_email),
        'deleted_data', v_deleted_data
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Final error handling
        RAISE EXCEPTION 'Erro crítico na exclusão do usuário: %', SQLERRM;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_delete_user_completely_enhanced TO authenticated;

-- Add function comment
COMMENT ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) IS 
'Função aprimorada para exclusão completa de usuários. Remove TODOS os dados do usuário de todas as tabelas relacionadas, garantindo que o email seja completamente liberado para novo cadastro. Versão 2.0 - Enhanced Complete Deletion.';

-- Create indexes for better performance on deletion operations
CREATE INDEX IF NOT EXISTS idx_user_license_history_user_id ON user_license_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cookie_preferences_user_id ON user_cookie_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_sessions_user_id ON whatsapp_analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_analytics_messages_user_id ON whatsapp_analytics_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sequential_numbers_user_id ON sequential_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_company_share_settings_owner_id ON company_share_settings(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_updates_user_id ON user_updates(user_id);

-- Log the initialization
INSERT INTO admin_logs (
    admin_user_id, action, details, action_type, target_table, created_at
) 
SELECT 
    id, 'SYSTEM_INIT_ENHANCED_DELETE_FUNCTION',
    jsonb_build_object(
        'message', 'Função de exclusão completa aprimorada inicializada',
        'version', '2.0',
        'features', jsonb_build_array(
            'Complete data removal from all tables',
            'Email liberation for new registrations',
            'Atomic transactions',
            'Detailed audit logging',
            'Enhanced security checks'
        )
    ),
    'SYSTEM_INIT', 'admin_logs', NOW()
FROM auth.users 
WHERE id IN (
    SELECT up.id FROM user_profiles up WHERE up.role = 'admin'
)
LIMIT 1;