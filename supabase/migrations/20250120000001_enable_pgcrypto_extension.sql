-- Enable pgcrypto extension to provide gen_random_bytes function
-- This extension is required for secure random token generation

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify that gen_random_bytes function is now available
-- This is a test query to ensure the function works
DO $$
BEGIN
  -- Test gen_random_bytes function
  PERFORM encode(gen_random_bytes(32), 'base64url');
  RAISE NOTICE 'pgcrypto extension enabled successfully - gen_random_bytes is working';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to enable pgcrypto extension: %', SQLERRM;
END $$;