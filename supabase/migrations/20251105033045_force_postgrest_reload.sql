-- Force PostgREST schema reload by updating comments on core tables
BEGIN;

COMMENT ON TABLE public.budgets IS 'Force PostgREST schema reload - 2025-11-05';
COMMENT ON TABLE public.budget_parts IS 'Force PostgREST schema reload - 2025-11-05';

COMMIT;