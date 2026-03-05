-- Rename activity_events to app_usage_stats to bypass adblockers
ALTER TABLE IF EXISTS activity_events RENAME TO app_usage_stats;
