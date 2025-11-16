-- Performance optimization indexes for service orders restructuring
-- This migration adds indexes for efficient querying and real-time updates

-- Composite index for efficient service order listing with filters
CREATE INDEX IF NOT EXISTS idx_service_orders_listing 
ON service_orders(owner_id, deleted_at, status, priority, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index for share token lookups (from service_order_shares table)
CREATE INDEX IF NOT EXISTS idx_service_order_shares_token 
ON service_order_shares(share_token) 
WHERE expires_at > NOW() OR expires_at IS NULL;

-- Index for active shares by service order
CREATE INDEX IF NOT EXISTS idx_service_order_shares_active 
ON service_order_shares(service_order_id, created_at DESC) 
WHERE expires_at > NOW() OR expires_at IS NULL;

-- Composite index for customer timeline queries
CREATE INDEX IF NOT EXISTS idx_service_order_events_customer_timeline 
ON service_order_events(service_order_id, customer_visible, created_at DESC) 
WHERE customer_visible = true;

-- Index for real-time event notifications
CREATE INDEX IF NOT EXISTS idx_service_order_events_recent 
ON service_order_events(service_order_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Index for payment status analytics
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_analytics 
ON service_orders(payment_status, created_at, owner_id) 
WHERE deleted_at IS NULL;

-- Index for completion date tracking
CREATE INDEX IF NOT EXISTS idx_service_orders_completion_tracking 
ON service_orders(estimated_completion, actual_completion, status) 
WHERE deleted_at IS NULL AND (estimated_completion IS NOT NULL OR actual_completion IS NOT NULL);

-- Partial index for overdue service orders
CREATE INDEX IF NOT EXISTS idx_service_orders_overdue 
ON service_orders(estimated_completion, status, owner_id) 
WHERE deleted_at IS NULL 
  AND estimated_completion < NOW() 
  AND status NOT IN ('completed', 'delivered', 'cancelled');

-- Index for customer-visible service orders
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_visible 
ON service_orders(customer_visible, last_customer_update DESC) 
WHERE deleted_at IS NULL AND customer_visible = true;

-- Index for search optimization with new fields
CREATE INDEX IF NOT EXISTS idx_service_orders_search_optimized 
ON service_orders USING gin(search_vector) 
WHERE deleted_at IS NULL AND customer_visible = true;

-- Create materialized view for service order statistics (optional, for dashboard performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS service_order_stats AS
SELECT 
  owner_id,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'received') as received_count,
  COUNT(*) FILTER (WHERE status = 'diagnosing') as diagnosing_count,
  COUNT(*) FILTER (WHERE status = 'waiting_approval') as waiting_approval_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'testing') as testing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as payment_pending_count,
  COUNT(*) FILTER (WHERE payment_status = 'partial') as payment_partial_count,
  COUNT(*) FILTER (WHERE payment_status = 'paid') as payment_paid_count,
  COUNT(*) FILTER (WHERE payment_status = 'overdue') as payment_overdue_count,
  COUNT(*) FILTER (WHERE estimated_completion < NOW() AND status NOT IN ('completed', 'delivered', 'cancelled')) as overdue_count,
  AVG(EXTRACT(EPOCH FROM (actual_completion - created_at))/86400) FILTER (WHERE actual_completion IS NOT NULL) as avg_completion_days,
  MAX(last_customer_update) as last_activity
FROM service_orders 
WHERE deleted_at IS NULL 
GROUP BY owner_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_order_stats_owner 
ON service_order_stats(owner_id);

-- Create function to refresh stats (can be called periodically)
CREATE OR REPLACE FUNCTION refresh_service_order_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY service_order_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get service order performance metrics
CREATE OR REPLACE FUNCTION get_service_order_metrics(p_owner_id UUID)
RETURNS TABLE(
  total_orders BIGINT,
  active_orders BIGINT,
  completed_orders BIGINT,
  overdue_orders BIGINT,
  avg_completion_days NUMERIC,
  payment_pending BIGINT,
  payment_overdue BIGINT,
  recent_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(s.total_orders, 0),
    COALESCE(s.received_count + s.diagnosing_count + s.waiting_approval_count + s.approved_count + s.in_progress_count + s.testing_count, 0),
    COALESCE(s.completed_count + s.delivered_count, 0),
    COALESCE(s.overdue_count, 0),
    COALESCE(s.avg_completion_days, 0),
    COALESCE(s.payment_pending_count, 0),
    COALESCE(s.payment_overdue_count, 0),
    COALESCE(s.last_activity, NOW())
  FROM service_order_stats s
  WHERE s.owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get recent customer activity
CREATE OR REPLACE FUNCTION get_recent_customer_activity(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  service_order_id UUID,
  event_type TEXT,
  customer_message TEXT,
  created_at TIMESTAMPTZ,
  device_info TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.service_order_id,
    e.event_type,
    e.customer_message,
    e.created_at,
    CONCAT(so.device_type, ' ', so.device_model) as device_info
  FROM service_order_events e
  JOIN service_orders so ON e.service_order_id = so.id
  WHERE e.customer_visible = true 
    AND so.deleted_at IS NULL
    AND so.customer_visible = true
    AND e.created_at > NOW() - INTERVAL '7 days'
  ORDER BY e.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON service_order_stats TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_service_order_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_order_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_customer_activity TO authenticated;

-- Add RLS policies for materialized view
ALTER TABLE service_order_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own stats" ON service_order_stats
  FOR SELECT USING (owner_id = auth.uid());

-- Create a trigger to automatically refresh stats periodically (optional)
-- This would typically be handled by a cron job or scheduled function
CREATE OR REPLACE FUNCTION auto_refresh_stats()
RETURNS void AS $$
BEGIN
  -- Only refresh if the last refresh was more than 1 hour ago
  IF NOT EXISTS (
    SELECT 1 FROM pg_stat_user_tables 
    WHERE relname = 'service_order_stats' 
    AND last_autoanalyze > NOW() - INTERVAL '1 hour'
  ) THEN
    PERFORM refresh_service_order_stats();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW service_order_stats IS 'Aggregated statistics for service orders by owner for dashboard performance';
COMMENT ON FUNCTION get_service_order_metrics IS 'Returns comprehensive metrics for a specific owner';
COMMENT ON FUNCTION get_recent_customer_activity IS 'Returns recent customer-visible activity across all service orders';
COMMENT ON FUNCTION refresh_service_order_stats IS 'Refreshes the materialized view with current data';