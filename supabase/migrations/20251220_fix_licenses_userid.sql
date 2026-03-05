-- Ensure user_id can be null in licenses table (for guest purchases)
ALTER TABLE licenses ALTER COLUMN user_id DROP NOT NULL;
