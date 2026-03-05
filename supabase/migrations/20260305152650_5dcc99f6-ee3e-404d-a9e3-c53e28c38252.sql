
-- Substituir o trigger de validação de propriedade do budget_parts
-- O trigger atual usa auth.uid() que é NULL quando chamado via service role (edge functions).
-- A validação de propriedade já é feita pela função RPC insert_budget_parts_from_whatsapp().
-- Nova versão: permite inserts quando auth.uid() é NULL (service role / security definer).

CREATE OR REPLACE FUNCTION public.validate_budget_part_ownership()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Se não há sessão de usuário (service role, security definer), permitir
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verificar se o orçamento pertence ao usuário atual
  IF NOT EXISTS (
    SELECT 1 FROM public.budgets 
    WHERE id = NEW.budget_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Não é possível adicionar partes a orçamentos de outros usuários';
  END IF;
  
  RETURN NEW;
END;
$function$;
