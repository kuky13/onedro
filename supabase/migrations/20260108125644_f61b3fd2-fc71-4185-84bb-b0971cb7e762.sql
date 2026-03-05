-- Remover sobrecarga antiga com JSONB para evitar conflito na RPC
DROP FUNCTION IF EXISTS public.insert_budget_parts_from_whatsapp(uuid, uuid, jsonb);

-- Garantir que a versão correta (com JSON) permaneça definida
CREATE OR REPLACE FUNCTION public.insert_budget_parts_from_whatsapp(
  owner_id uuid,
  budget_id uuid,
  parts json
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  budget_owner uuid;
  part json;
BEGIN
  -- Garantir que o orçamento existe
  SELECT b.owner_id INTO budget_owner
  FROM public.budgets b
  WHERE b.id = budget_id;

  IF budget_owner IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado' USING errcode = 'P0001';
  END IF;

  -- Inserir cada peça recebida em JSON
  FOR part IN
    SELECT json_array_elements(parts)
  LOOP
    INSERT INTO public.budget_parts (
      budget_id,
      name,
      part_type,
      brand_id,
      quantity,
      price,
      cash_price,
      installment_price,
      installment_count,
      warranty_months
    ) VALUES (
      budget_id,
      coalesce(part->> 'name', part->> 'part_type', 'Opção'),
      nullif(part->> 'part_type', ''),
      nullif(part->> 'brand_id', '')::uuid,
      coalesce( (part->> 'quantity')::int, 1 ),
      coalesce( (part->> 'price')::numeric, 0 ),
      nullif(part->> 'cash_price', '')::numeric,
      nullif(part->> 'installment_price', '')::numeric,
      coalesce( (part->> 'installment_count')::int, 0 ),
      CASE
        WHEN part ? 'warranty_months' IS FALSE THEN NULL
        WHEN (part->> 'warranty_months')::int <= 1 THEN 3
        ELSE (part->> 'warranty_months')::int
      END
    );
  END LOOP;
END;
$$;