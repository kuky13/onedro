-- =====================================================
-- CONCESSÃO DE PERMISSÕES PARA TABELAS
-- =====================================================
-- Garante que as tabelas tenham as permissões corretas para anon e authenticated

-- Verificar permissões atuais
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name IN ('licenses', 'license_history', 'system_logs')
ORDER BY table_name, grantee;

-- Conceder permissões para a tabela licenses
GRANT SELECT ON public.licenses TO anon, authenticated;
GRANT INSERT ON public.licenses TO authenticated;
GRANT UPDATE ON public.licenses TO authenticated;

-- Conceder permissões para a tabela license_history
GRANT SELECT ON public.license_history TO authenticated;
GRANT INSERT ON public.license_history TO authenticated;

-- Conceder permissões para a tabela system_logs (já concedidas na migração anterior)
-- GRANT SELECT ON public.system_logs TO anon, authenticated;
-- GRANT INSERT ON public.system_logs TO anon, authenticated;

-- Verificar permissões após concessão
SELECT 
  grantee, 
  table_name, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated') 
  AND table_name IN ('licenses', 'license_history', 'system_logs')
ORDER BY table_name, grantee;

-- Log da operação
INSERT INTO public.system_logs (
  log_level,
  message,
  details,
  created_at
) VALUES (
  'info',
  'Permissões de tabela verificadas e atualizadas',
  jsonb_build_object(
    'tables', jsonb_build_array('licenses', 'license_history', 'system_logs'),
    'roles', jsonb_build_array('anon', 'authenticated'),
    'action', 'grant_permissions'
  ),
  NOW()
);