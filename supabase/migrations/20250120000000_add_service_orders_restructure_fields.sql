-- Add new fields to service_orders table for restructuring
-- This migration adds fields for payment status, completion dates, customer notes, and visibility controls

-- Add new columns to service_orders table
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_completion TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS technician_notes TEXT,
ADD COLUMN IF NOT EXISTS last_customer_update TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT true;

-- Create index for payment_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_service_orders_payment_status ON service_orders(payment_status) WHERE deleted_at IS NULL;

-- Create index for estimated_completion for timeline queries
CREATE INDEX IF NOT EXISTS idx_service_orders_estimated_completion ON service_orders(estimated_completion) WHERE deleted_at IS NULL;

-- Create index for last_customer_update for real-time updates
CREATE INDEX IF NOT EXISTS idx_service_orders_last_customer_update ON service_orders(last_customer_update) WHERE deleted_at IS NULL;

-- Create index for customer_visible for public sharing
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_visible ON service_orders(customer_visible) WHERE deleted_at IS NULL;

-- Create composite index for efficient customer queries
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_status ON service_orders(customer_visible, status, payment_status) WHERE deleted_at IS NULL;

-- Update the search vector trigger to include new searchable fields
DROP TRIGGER IF EXISTS service_orders_search_vector_trigger ON service_orders;

CREATE OR REPLACE FUNCTION update_service_orders_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', COALESCE(NEW.device_type, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.device_model, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.imei_serial, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.reported_issue, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.customer_notes, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.technician_notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_orders_search_vector_trigger
  BEFORE INSERT OR UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_service_orders_search_vector();

-- Create function to update last_customer_update when customer-relevant fields change
CREATE OR REPLACE FUNCTION update_last_customer_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if customer-relevant fields have changed
  IF (OLD.status IS DISTINCT FROM NEW.status) OR
     (OLD.payment_status IS DISTINCT FROM NEW.payment_status) OR
     (OLD.estimated_completion IS DISTINCT FROM NEW.estimated_completion) OR
     (OLD.actual_completion IS DISTINCT FROM NEW.actual_completion) OR
     (OLD.customer_notes IS DISTINCT FROM NEW.customer_notes) OR
     (OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) THEN
    
    NEW.last_customer_update := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_customer_update_trigger
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_last_customer_update();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON service_orders TO authenticated;
GRANT SELECT ON service_orders TO anon;

-- Update existing records to have default values
UPDATE service_orders 
SET 
  payment_status = CASE 
    WHEN is_paid = true THEN 'paid'
    ELSE 'pending'
  END,
  last_customer_update = COALESCE(updated_at, created_at),
  customer_visible = true
WHERE payment_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN service_orders.payment_status IS 'Current payment status: pending, partial, paid, overdue, cancelled';
COMMENT ON COLUMN service_orders.estimated_completion IS 'Estimated completion date for the service';
COMMENT ON COLUMN service_orders.actual_completion IS 'Actual completion date when service is finished';
COMMENT ON COLUMN service_orders.customer_notes IS 'Notes visible to and editable by customers';
COMMENT ON COLUMN service_orders.technician_notes IS 'Internal notes for technicians only';
COMMENT ON COLUMN service_orders.last_customer_update IS 'Timestamp of last update relevant to customer';
COMMENT ON COLUMN service_orders.customer_visible IS 'Whether this service order is visible to customers via share links';