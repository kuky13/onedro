-- Auto cleanup trash budgets after 90 days
-- This migration creates functions and triggers to automatically delete budgets from trash after 90 days

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cleanup_old_deleted_budgets();

-- Function to clean up old deleted budgets
CREATE FUNCTION cleanup_old_deleted_budgets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete budgets that have been in trash for more than 90 days
  DELETE FROM budgets 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '90 days';
  
  -- Delete corresponding audit records for budgets deleted more than 90 days ago
  DELETE FROM budget_deletion_audit 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleanup completed: Removed budgets and audit records older than 90 days';
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS schedule_daily_cleanup();

-- Function to schedule daily cleanup using pg_cron extension
-- Note: pg_cron extension needs to be enabled in Supabase
CREATE FUNCTION schedule_daily_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule daily cleanup at 2 AM UTC
  -- This will run every day at 2:00 AM
  PERFORM cron.schedule(
    'cleanup-old-budgets',
    '0 2 * * *',
    'SELECT cleanup_old_deleted_budgets();'
  );
  
  RAISE NOTICE 'Daily cleanup job scheduled successfully';
EXCEPTION
  WHEN OTHERS THEN
    -- If pg_cron is not available, create a trigger-based approach
    RAISE NOTICE 'pg_cron not available, using trigger-based cleanup';
END;
$$;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS trigger_cleanup_old_budgets();

-- Alternative trigger-based approach for cleanup
-- This trigger will check for old records on each budget deletion
CREATE FUNCTION trigger_cleanup_old_budgets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only run cleanup occasionally to avoid performance issues
  -- Use random to run cleanup approximately once per 100 deletions
  IF random() < 0.01 THEN
    PERFORM cleanup_old_deleted_budgets();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on budget_deletion_audit table
DROP TRIGGER IF EXISTS trigger_periodic_cleanup ON budget_deletion_audit;
CREATE TRIGGER trigger_periodic_cleanup
  AFTER INSERT ON budget_deletion_audit
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_old_budgets();

-- Try to schedule the daily cleanup job
SELECT schedule_daily_cleanup();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_deleted_budgets() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_daily_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_cleanup_old_budgets() TO authenticated;

-- Create an index to improve performance of cleanup queries
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_deletion_audit_created_at ON budget_deletion_audit(created_at);

COMMIT;