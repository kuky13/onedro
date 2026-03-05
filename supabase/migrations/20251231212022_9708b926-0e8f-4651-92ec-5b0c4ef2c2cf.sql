-- Fix foreign key constraint blocking auth user deletions
-- The auth delete endpoint fails with:
-- ERROR: update or delete on table "users" violates foreign key constraint "admin_logs_admin_user_id_fkey" on table "admin_logs"
-- We relax this constraint on public.admin_logs so historical admin logs do not block user deletion.

ALTER TABLE public.admin_logs
  DROP CONSTRAINT IF EXISTS admin_logs_admin_user_id_fkey;