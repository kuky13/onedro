-- Função para inserir peças de orçamento a partir da IA do WhatsApp,
-- evitando bloqueios de RLS e mantendo a verificação de dono do orçamento.
create or replace function public.insert_budget_parts_from_whatsapp(
  owner_id uuid,
  budget_id uuid,
  parts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  budget_owner uuid;
  part jsonb;
begin
  -- Garantir que o orçamento existe
  select b.owner_id into budget_owner
  from public.budgets b
  where b.id = budget_id;

  if budget_owner is null then
    raise exception 'Orçamento não encontrado' using errcode = 'P0001';
  end if;

  -- Garantir que o orçamento pertence ao mesmo dono configurado
  if budget_owner <> owner_id then
    raise exception 'Não é possível adicionar partes a orçamentos de outros usuários'
      using errcode = 'P0001';
  end if;

  -- Inserir cada peça recebida em JSON
  for part in
    select jsonb_array_elements(parts)
  loop
    insert into public.budget_parts (
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
    ) values (
      budget_id,
      coalesce(part->> 'name', part->> 'part_type', 'Opção'),
      nullif(part->> 'part_type', ''),
      nullif(part->> 'brand_id', '')::uuid,
      coalesce( (part->> 'quantity')::int, 1 ),
      coalesce( (part->> 'price')::numeric, 0 ),
      nullif(part->> 'cash_price', '')::numeric,
      nullif(part->> 'installment_price', '')::numeric,
      coalesce( (part->> 'installment_count')::int, 0 ),
      case
        when part ? 'warranty_months' is false then null
        when (part->> 'warranty_months')::int <= 1 then 3
        else (part->> 'warranty_months')::int
      end
    );
  end loop;
end;
$$;