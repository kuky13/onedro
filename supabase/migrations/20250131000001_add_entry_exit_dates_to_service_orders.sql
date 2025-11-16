-- Add entry_date and exit_date fields to service_orders table
ALTER TABLE service_orders 
ADD COLUMN entry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN exit_date TIMESTAMP WITH TIME ZONE;

-- Add comments to describe the new fields
COMMENT ON COLUMN service_orders.entry_date IS 'Data de entrada do equipamento para reparo';
COMMENT ON COLUMN service_orders.exit_date IS 'Data de saída/entrega do equipamento após reparo';