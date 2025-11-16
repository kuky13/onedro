-- Fix function signature conflict that's causing multiple logs
-- Drop all versions of the function and create a single, correct version

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS admin_delete_user_completely_enhanced(UUID, UUID, TEXT);

-- Create the correct function with the signature that matches the frontend call
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
    v_admin_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_admin_email TEXT;
    v_admin_name TEXT;
    v_is_admin BOOLEAN;
    v_result JSON;
BEGIN
    -- Get admin user ID from current session
    v_admin_user_id := auth.uid();
    
    -- Check if the requesting user is an admin
    SELECT 
        up.is_admin,
        up.email,
        up.name
    INTO v_is_admin, v_admin_email, v_admin_name
    FROM user_profiles up
    WHERE up.id = v_admin_user_id;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários';
    END IF;

    -- Validate confirmation code (FIXED: now accepts 'DELETE_USER_PERMANENTLY')
    IF p_confirmation_code != 'DELETE_USER_PERMANENTLY' THEN
        RAISE EXCEPTION 'Código de confirmação inválido';
    END IF;

    -- Get user info before deletion
    SELECT email, name INTO v_user_email, v_user_name
    FROM user_profiles WHERE id = p_user_id;

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;

    -- Start transaction for complete deletion
    BEGIN
        -- Delete from auth.users (this will cascade to user_profiles due to foreign key)
        DELETE FROM auth.users WHERE id = p_user_id;
        
        -- Verify deletion was successful
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Falha ao excluir usuário do sistema de autenticação';
        END IF;

        -- Log the admin action with proper admin_user_id (SINGLE LOG ENTRY)
        INSERT INTO admin_logs (
            admin_user_id,
            action,
            target_user_id,
            target_user_email,
            details,
            created_at
        ) VALUES (
            v_admin_user_id,  -- Use the admin_user_id from session
            'DELETE_USER_PERMANENTLY',
            p_user_id,
            v_user_email,
            jsonb_build_object(
                'user_name', v_user_name,
                'admin_email', v_admin_email,
                'admin_name', v_admin_name,
                'confirmation_code', p_confirmation_code,
                'deletion_timestamp', NOW(),
                'delete_auth_user', p_delete_auth_user
            ),
            NOW()
        );

        -- Build success response
        v_result := json_build_object(
            'success', true,
            'message', 'Usuário excluído permanentemente com sucesso',
            'deleted_user', json_build_object(
                'id', p_user_id,
                'email', v_user_email,
                'name', v_user_name
            ),
            'admin_info', json_build_object(
                'id', v_admin_user_id,
                'email', v_admin_email,
                'name', v_admin_name
            ),
            'timestamp', NOW()
        );

        RETURN v_result;

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error (SINGLE ERROR LOG ENTRY)
            INSERT INTO admin_logs (
                admin_user_id,
                action,
                target_user_id,
                target_user_email,
                details,
                created_at
            ) VALUES (
                v_admin_user_id,
                'DELETE_USER_PERMANENTLY_ERROR',
                p_user_id,
                v_user_email,
                jsonb_build_object(
                    'error_message', SQLERRM,
                    'error_state', SQLSTATE,
                    'admin_email', v_admin_email,
                    'admin_name', v_admin_name,
                    'confirmation_code', p_confirmation_code
                ),
                NOW()
            );
            
            -- Re-raise the exception
            RAISE;
    END;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) TO service_role;

-- Add comment
COMMENT ON FUNCTION admin_delete_user_completely_enhanced(UUID, TEXT, BOOLEAN) IS
'Função corrigida para exclusão de usuários que aceita DELETE_USER_PERMANENTLY e gera apenas 1 log por operação. Assinatura compatível com o frontend.';