BEGIN;

-- Create test user
INSERT INTO auth.users (id, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'test_user@example.com')
ON CONFLICT (id) DO NOTHING;

-- Test 1: Insert quick test
INSERT INTO quick_tests (user_id, name, url, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'Test 1', 
  'http://example.com/1', 
  NOW() + INTERVAL '7 days'
);

SELECT * FROM quick_tests WHERE name = 'Test 1';

-- Test 2: Verify expiration logic (manual simulation)
INSERT INTO quick_tests (user_id, name, url, expires_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'Expired Test', 
  'http://example.com/expired', 
  NOW() - INTERVAL '1 day'
);

-- Run cleanup function
SELECT delete_expired_quick_tests();

-- Verify 'Expired Test' is gone
SELECT * FROM quick_tests WHERE name = 'Expired Test';

ROLLBACK;
