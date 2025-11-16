-- Fix confirmation code mismatch between frontend and SQL function
-- Frontend sends 'DELETE_USER_PERMANENTLY' but SQL expects 'CONFIRMAR_EXCLUSAO'

-- Update the enhanced user deletion function to accept the correct confirmation code
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

    -- Validate confirmation code (updated to match frontend)
    IF p_confirmation_code != 'DELETE_USER_PERMANENTLY' THEN
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
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_files', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 2. Delete from user_subscriptions
    DELETE FROM user_subscriptions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_subscriptions', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 3. Delete from user_sessions
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_sessions', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 4. Delete from user_preferences
    DELETE FROM user_preferences WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_preferences', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 5. Delete from user_notifications
    DELETE FROM user_notifications WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_notifications', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 6. Delete from user_activity_logs
    DELETE FROM user_activity_logs WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_activity_logs', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 7. Delete from user_profiles (main table)
    DELETE FROM user_profiles WHERE id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
        v_deleted_data := v_deleted_data || jsonb_build_object('user_profiles', v_count);
        v_total_tables_affected := v_total_tables_affected + 1;
    END IF;

    -- 8. Delete from auth.users if requested
    IF p_delete_auth_user THEN
        DELETE FROM auth.users WHERE id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            v_deleted_data := v_deleted_data || jsonb_build_object('auth_users', v_count);
            v_total_tables_affected := v_total_tables_affected + 1;
        END IF;
    END IF;

    -- Log the successful deletion (using correct column name admin_user_id)
    INSERT INTO admin_logs (
        admin_user_id,
        target_user_id,
        action,
        details,
        action_type,
        target_table,
        target_id,
        old_values,
        new_values
    ) VALUES (
        v_admin_id,
        p_user_id,
        'DELETE_USER_COMPLETELY',
        format('Usuário %s (%s) excluído completamente. Tabelas afetadas: %s. Dados removidos: %s', 
               v_user_name, v_user_email, v_total_tables_affected, v_deleted_data::text),
        'DELETE',
        'user_profiles',
        p_user_id,
        jsonb_build_object(
            'email', v_user_email,
            'name', v_user_name,
            'deleted_data', v_deleted_data
        ),
        NULL
    );

    -- Return success response
    RETURN json_build_object(
        'success', true,
        'message', format('Usuário %s excluído com sucesso', v_user_email),
        'deleted_data', v_deleted_data,
        'tables_affected', v_total_tables_affected
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error (using correct column name admin_user_id)
        INSERT INTO admin_logs (
            admin_user_id,
            target_user_id,
            action,
            details,
            action_type,
            target_table,
            target_id
        ) VALUES (
            v_admin_id,
            p_user_id,
            'DELETE_USER_COMPLETELY_ERROR',
            format('Erro ao excluir usuário %s: %s', COALESCE(v_user_email, 'ID: ' || p_user_id), SQLERRM),
            'ERROR',
            'user_profiles',
            p_user_id
        );
        
        -- Re-raise the exception
        RAISE;
END;
$$;