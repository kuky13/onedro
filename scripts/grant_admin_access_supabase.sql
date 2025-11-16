-- Script para conceder acesso de administrador a um usuário específico
-- Versão compatível com Supabase SQL Editor
-- Uso: Execute diretamente no Supabase SQL Editor
-- Autor: OneDrip System
-- Data: Janeiro 2025

-- Início da transação
BEGIN;

-- Verificar se o usuário existe na tabela auth.users
DO $$
DECLARE
    user_email_var TEXT := 'teste@onedrip.email'; -- Email do usuário
    user_id_var UUID;
    user_exists BOOLEAN := FALSE;
    profile_exists BOOLEAN := FALSE;
    already_admin BOOLEAN := FALSE;
    current_role TEXT;
BEGIN
    -- Buscar o ID do usuário pelo email
    SELECT id INTO user_id_var 
    FROM auth.users 
    WHERE email = user_email_var;
    
    -- Verificar se o usuário foi encontrado
    IF user_id_var IS NOT NULL THEN
        user_exists := TRUE;
        RAISE NOTICE 'Usuário encontrado: % (ID: %)', user_email_var, user_id_var;
        
        -- Verificar se o perfil existe na tabela user_profiles
        SELECT EXISTS(
            SELECT 1 FROM user_profiles 
            WHERE id = user_id_var
        ) INTO profile_exists;
        
        IF profile_exists THEN
            -- Verificar se já possui role de admin
            SELECT role INTO current_role
            FROM user_profiles 
            WHERE id = user_id_var;
            
            IF current_role = 'admin' THEN
                RAISE NOTICE 'AVISO: O usuário % já possui acesso de administrador ativo.', user_email_var;
                already_admin := TRUE;
            ELSE
                -- Conceder acesso de administrador
                UPDATE user_profiles 
                SET 
                    role = 'admin',
                    updated_at = NOW()
                WHERE id = user_id_var;
                
                RAISE NOTICE 'SUCESSO: Acesso de administrador concedido para o usuário %', user_email_var;
                RAISE NOTICE 'Role anterior: % -> Role atual: admin', current_role;
                
                -- Log da operação (se a tabela admin_logs existir)
                BEGIN
                    INSERT INTO admin_logs (
                        admin_id,
                        action,
                        target_user_id,
                        details,
                        created_at
                    ) VALUES (
                        user_id_var, -- Assumindo que é um admin fazendo a operação
                        'GRANT_ADMIN_ACCESS',
                        user_id_var,
                        jsonb_build_object(
                            'email', user_email_var,
                            'previous_role', current_role,
                            'new_role', 'admin',
                            'action', 'Admin access granted via SQL script',
                            'timestamp', NOW()
                        ),
                        NOW()
                    );
                    RAISE NOTICE 'Log da operação registrado com sucesso.';
                EXCEPTION
                    WHEN OTHERS THEN
                        RAISE NOTICE 'AVISO: Não foi possível registrar o log da operação: %', SQLERRM;
                END;
            END IF;
        ELSE
            -- Criar perfil se não existir com role admin
            INSERT INTO user_profiles (
                id,
                role,
                created_at,
                updated_at
            ) VALUES (
                user_id_var,
                'admin',
                NOW(),
                NOW()
            );
            
            RAISE NOTICE 'SUCESSO: Perfil criado e acesso de administrador concedido para o usuário %', user_email_var;
            
            -- Log da criação do perfil admin
            BEGIN
                INSERT INTO admin_logs (
                    admin_id,
                    action,
                    target_user_id,
                    details,
                    created_at
                ) VALUES (
                    user_id_var,
                    'CREATE_ADMIN_PROFILE',
                    user_id_var,
                    jsonb_build_object(
                        'email', user_email_var,
                        'action', 'Admin profile created via SQL script',
                        'timestamp', NOW()
                    ),
                    NOW()
                );
                RAISE NOTICE 'Log da criação do perfil registrado com sucesso.';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE 'AVISO: Não foi possível registrar o log da criação: %', SQLERRM;
            END;
        END IF;
    ELSE
        RAISE EXCEPTION 'ERRO: Usuário com email % não encontrado na base de dados.', user_email_var;
    END IF;
END
$$;

-- Confirmar a transação
COMMIT;

-- Verificação final
SELECT 
    u.email,
    u.id as user_id,
    up.role as user_role,
    up.updated_at as last_updated,
    CASE 
        WHEN up.role = 'admin' THEN 'SIM'
        ELSE 'NÃO'
    END as is_admin
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'teste@onedrip.email';

-- Instruções de uso:
-- 1. Para alterar o email do usuário, modifique a linha 15: user_email_var TEXT := 'novo@email.com';
-- 2. Execute o script completo no Supabase SQL Editor
-- 3. Verifique os logs de saída para confirmar o sucesso da operação
-- 4. O resultado final mostrará o status atual do usuário