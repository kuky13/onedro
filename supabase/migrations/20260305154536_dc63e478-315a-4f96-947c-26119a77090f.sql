-- 1. Remover unique constraint antiga (global por owner)
DROP INDEX IF EXISTS public.idx_budgets_user_sequential;

-- 2. Temporariamente setar todos sequential_number para NULL para evitar conflitos
UPDATE public.budgets SET sequential_number = NULL;

-- 3. Renumerar por (owner_id, device_model, created_at)
UPDATE public.budgets b
SET sequential_number = sub.new_seq
FROM (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY owner_id, device_model 
    ORDER BY created_at ASC
  )::int AS new_seq
  FROM public.budgets
) sub
WHERE b.id = sub.id;

-- 4. Criar nova unique constraint por (owner_id, device_model, sequential_number)
CREATE UNIQUE INDEX idx_budgets_user_device_sequential 
ON public.budgets (owner_id, device_model, sequential_number);