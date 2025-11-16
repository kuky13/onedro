-- Verificação do status do usuário teste@onedrip.email
-- Este script verifica se o acesso admin foi concedido com sucesso

SELECT 
    u.email,
    u.id as user_id,
    u.created_at as user_created_at,
    up.role as user_role,
    up.name as profile_name,
    up.username,
    up.created_at as profile_created_at,
    up.updated_at as profile_updated_at,
    up.advanced_features_enabled,
    CASE 
        WHEN up.role = 'admin' THEN 'SIM - ACESSO ADMIN ATIVO'
        WHEN up.role = 'user' THEN 'NÃO - USUÁRIO COMUM'
        WHEN up.role IS NULL THEN 'PERFIL NÃO ENCONTRADO'
        ELSE CONCAT('ROLE PERSONALIZADA: ', up.role)
    END as status_admin
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.email = 'teste@onedrip.email';

-- Verificar se existem outros admins no sistema
SELECT 
    'TOTAL DE ADMINS NO SISTEMA:' as info,
    COUNT(*) as total_admins
FROM user_profiles 
WHERE role = 'admin';

-- Listar todos os admins
SELECT 
    u.email,
    up.name,
    up.role,
    up.created_at,
    up.updated_at
FROM auth.users u
INNER JOIN user_profiles up ON u.id = up.id
WHERE up.role = 'admin'
ORDER BY up.updated_at DESC;