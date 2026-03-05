-- Rename app_usage_stats to site_events to bypass adblockers
ALTER TABLE IF EXISTS app_usage_stats RENAME TO site_events;
