-- Wipe all budgets and directly related data for all users
-- WARNING: This is destructive and irreversible. It will run once when this migration is applied.
BEGIN;

-- Truncate child tables first (if any exist) to avoid FK issues.
-- budget_parts: items/services linked to budgets
TRUNCATE TABLE public.budget_parts RESTART IDENTITY CASCADE;

-- budget_deletion_audit: audit logs related to deleted budgets
TRUNCATE TABLE public.budget_deletion_audit RESTART IDENTITY CASCADE;

-- Finally, truncate the main budgets table
TRUNCATE TABLE public.budgets RESTART IDENTITY CASCADE;

COMMIT;