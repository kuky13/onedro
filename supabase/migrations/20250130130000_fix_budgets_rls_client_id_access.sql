-- Corrigir políticas RLS da tabela budgets para permitir consultas por client_id
-- Problema: Consultas usando client_id estão falhando porque RLS só permite acesso por owner_id

-- 1. Remover políticas RLS atuais da tabela budgets
DROP POLICY IF EXISTS "rls_budgets_select" ON public.budgets;
DROP POLICY IF EXISTS "rls_budgets_insert" ON public.budgets;
DROP POLICY IF EXISTS "rls_budgets_update" ON public.budgets;
DROP POLICY IF EXISTS "rls_budgets_delete" ON public.budgets;

-- 2. Criar novas políticas RLS que permitem acesso por owner_id OU por client_id (quando o cliente pertence ao usuário)

-- Política SELECT: Permite ver orçamentos próprios OU orçamentos de clientes próprios
CREATE POLICY "budgets_select_policy" ON public.budgets
FOR SELECT USING (
  (
    -- Orçamentos próprios (não excluídos)
    owner_id = auth.uid() AND deleted_at IS NULL
  ) OR (
    -- Orçamentos de clientes próprios (não excluídos)
    client_id IS NOT NULL 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = budgets.client_id 
      AND c.user_id = auth.uid()
    )
  ) OR (
    -- Admins podem ver tudo
    public.is_current_user_admin()
  )
);

-- Política INSERT: Permite inserir orçamentos próprios
CREATE POLICY "budgets_insert_policy" ON public.budgets
FOR INSERT WITH CHECK (
  owner_id = auth.uid() 
  AND auth.uid() IS NOT NULL
  AND (
    client_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = budgets.client_id 
      AND c.user_id = auth.uid()
    )
  )
);

-- Política UPDATE: Permite atualizar orçamentos próprios OU orçamentos de clientes próprios
CREATE POLICY "budgets_update_policy" ON public.budgets
FOR UPDATE USING (
  (
    -- Orçamentos próprios (não excluídos)
    owner_id = auth.uid() AND deleted_at IS NULL
  ) OR (
    -- Orçamentos de clientes próprios (não excluídos)
    client_id IS NOT NULL 
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = budgets.client_id 
      AND c.user_id = auth.uid()
    )
  ) OR (
    -- Admins podem atualizar tudo
    public.is_current_user_admin()
  )
);

-- Política DELETE: Permite excluir orçamentos próprios OU orçamentos de clientes próprios
CREATE POLICY "budgets_delete_policy" ON public.budgets
FOR DELETE USING (
  (
    -- Orçamentos próprios
    owner_id = auth.uid()
  ) OR (
    -- Orçamentos de clientes próprios
    client_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.clients c 
      WHERE c.id = budgets.client_id 
      AND c.user_id = auth.uid()
    )
  ) OR (
    -- Admins podem excluir tudo
    public.is_current_user_admin()
  )
);

-- 3. Comentários explicativos
COMMENT ON POLICY "budgets_select_policy" ON public.budgets IS 
'Permite acesso a orçamentos próprios (owner_id) ou orçamentos de clientes próprios (client_id)';

COMMENT ON POLICY "budgets_insert_policy" ON public.budgets IS 
'Permite inserir orçamentos próprios, validando que client_id pertence ao usuário';

COMMENT ON POLICY "budgets_update_policy" ON public.budgets IS 
'Permite atualizar orçamentos próprios ou de clientes próprios';

COMMENT ON POLICY "budgets_delete_policy" ON public.budgets IS 
'Permite excluir orçamentos próprios ou de clientes próprios'