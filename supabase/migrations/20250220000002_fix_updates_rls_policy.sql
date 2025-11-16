-- Corrigir políticas RLS para a tabela updates
-- Permitir que usuários autenticados vejam atualizações ativas

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view active updates" ON public.updates;

-- Criar política para permitir que usuários autenticados vejam atualizações ativas
CREATE POLICY "Users can view active updates" ON public.updates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Garantir que RLS está habilitado
ALTER TABLE public.updates ENABLE ROW LEVEL SECURITY;