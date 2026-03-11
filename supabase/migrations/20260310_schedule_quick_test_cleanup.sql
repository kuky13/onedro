-- Create a function to clean up expired quick tests
CREATE OR REPLACE FUNCTION delete_expired_quick_tests()
RETURNS void AS $$
BEGIN
  DELETE FROM quick_tests
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule the cleanup job to run daily using pg_cron
-- Note: pg_cron extension must be enabled in the database
-- If pg_cron is not available, this step will fail or be ignored.
-- In Supabase, pg_cron is available but needs to be enabled.

-- Enable pg_cron extension if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the job to run every day at 3:00 AM UTC
-- The job name is 'cleanup_expired_quick_tests'
SELECT cron.schedule(
  'cleanup_expired_quick_tests',
  '0 3 * * *',
  $$SELECT delete_expired_quick_tests()$$
);
