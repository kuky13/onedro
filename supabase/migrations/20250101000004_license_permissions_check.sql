-- Verificar e ajustar permissões das tabelas de licenças
-- Arquivo: 20250101000004_license_permissions_check.sql

-- Verificar permissões atuais
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('licenses', 'license_activation_log', 'user_profiles')
    AND grantee IN ('anon', 'authenticated') 
ORDER BY table_name, grantee;

-- Garantir permissões adequadas para a tabela licenses
GRANT SELECT ON public.licenses TO anon;
GRANT ALL PRIVILEGES ON public.licenses TO authenticated;

-- Garantir permissões adequadas para a tabela license_activation_log
GRANT SELECT ON public.license_activation_log TO anon;
GRANT ALL PRIVILEGES ON public.license_activation_log TO authenticated;

-- Garantir permissões adequadas para a tabela user_profiles
GRANT SELECT ON public.user_profiles TO anon;
GRANT ALL PRIVILEGES ON public.user_profiles TO authenticated;

-- Verificar se as sequences também têm permissões adequadas
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Comentários para documentação
COMMENT ON TABLE public.licenses IS 'Tabela de licenças do sistema - contém códigos, status e datas de expiração';
COMMENT ON TABLE public.license_activation_log IS 'Log de ativações de licenças para auditoria e controle';

-- Verificar permissões após aplicação
SELECT 
    'Permissões aplicadas com sucesso' as status,
    COUNT(*) as total_permissions
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
    AND table_name IN ('licenses', 'license_activation_log', 'user_profiles')
    AND grantee IN ('anon', 'authenticated');