-- Add notification statistics columns to push_notifications table
-- This migration adds columns to track delivery statistics for each notification

-- Add statistics columns to push_notifications table
ALTER TABLE public.push_notifications 
ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_delivered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0;

-- Add comments to explain the purpose of each column
COMMENT ON COLUMN public.push_notifications.total_sent IS 'Total number of notifications sent to subscriptions';
COMMENT ON COLUMN public.push_notifications.total_delivered IS 'Total number of notifications successfully delivered';
COMMENT ON COLUMN public.push_notifications.total_failed IS 'Total number of notifications that failed to be sent';

-- Create indexes for better performance on statistics queries
CREATE INDEX IF NOT EXISTS idx_push_notifications_total_sent ON public.push_notifications(total_sent);
CREATE INDEX IF NOT EXISTS idx_push_notifications_total_delivered ON public.push_notifications(total_delivered);
CREATE INDEX IF NOT EXISTS idx_push_notifications_total_failed ON public.push_notifications(total_failed);

-- Create a composite index for statistics overview queries
CREATE INDEX IF NOT EXISTS idx_push_notifications_stats ON public.push_notifications(total_sent, total_delivered, total_failed);

-- Update existing notifications to have default values (if any exist)
UPDATE public.push_notifications 
SET 
    total_sent = COALESCE(total_sent, 0),
    total_delivered = COALESCE(total_delivered, 0),
    total_failed = COALESCE(total_failed, 0)
WHERE 
    total_sent IS NULL 
    OR total_delivered IS NULL 
    OR total_failed IS NULL;

-- Add constraints to ensure statistics are non-negative
ALTER TABLE public.push_notifications 
ADD CONSTRAINT check_total_sent_non_negative CHECK (total_sent >= 0),
ADD CONSTRAINT check_total_delivered_non_negative CHECK (total_delivered >= 0),
ADD CONSTRAINT check_total_failed_non_negative CHECK (total_failed >= 0);

-- Add constraint to ensure delivered + failed <= sent (logical consistency)
ALTER TABLE public.push_notifications 
ADD CONSTRAINT check_stats_consistency CHECK (total_delivered + total_failed <= total_sent);

-- Migration completed successfully
-- The push_notifications table now has statistics columns for tracking delivery metrics