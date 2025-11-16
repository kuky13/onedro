-- Conceder permissões para as tabelas e funções criadas

-- Conceder permissões para a tabela file_upload_audit
GRANT SELECT ON public.file_upload_audit TO authenticated;
GRANT INSERT ON public.file_upload_audit TO authenticated;
GRANT UPDATE ON public.file_upload_audit TO authenticated;
GRANT DELETE ON public.file_upload_audit TO authenticated;

-- Conceder permissões para as funções RPC
GRANT EXECUTE ON FUNCTION public.admin_get_all_logs(INTEGER, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_logs_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_log_types() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_logs(TEXT, UUID[], INTEGER) TO authenticated;

-- Comentários
COMMENT ON TABLE public.file_upload_audit IS 'Tabela de auditoria para uploads de arquivos';
COMMENT ON FUNCTION public.admin_get_all_logs IS 'Função para obter logs unificados - apenas para administradores';
COMMENT ON FUNCTION public.admin_get_logs_statistics IS 'Função para obter estatísticas de logs - apenas para administradores';
COMMENT ON FUNCTION public.admin_get_log_types IS 'Função para obter tipos de logs disponíveis - apenas para administradores';
COMMENT ON FUNCTION public.admin_delete_logs IS 'Função para exclusão em massa de logs - apenas para administradores';