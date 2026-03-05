
-- Drop the previous unique index
DROP INDEX IF EXISTS public.idx_budgets_user_device_sequential;

-- Renumerar: mesmo sequential_number para todos os budgets do mesmo (owner_id, device_model)
WITH group_ranks AS (
  SELECT 
    owner_id,
    device_model,
    DENSE_RANK() OVER (
      PARTITION BY owner_id 
      ORDER BY MIN(created_at)
    )::int AS group_seq
  FROM public.budgets
  GROUP BY owner_id, device_model
)
UPDATE public.budgets b
SET sequential_number = gr.group_seq
FROM group_ranks gr
WHERE b.owner_id = gr.owner_id AND b.device_model = gr.device_model;
