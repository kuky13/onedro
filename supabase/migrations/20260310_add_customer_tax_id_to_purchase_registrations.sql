-- Add customer_tax_id to purchase_registrations
ALTER TABLE purchase_registrations ADD COLUMN IF NOT EXISTS customer_tax_id TEXT;

-- Create index for customer_tax_id
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_customer_tax_id ON purchase_registrations(customer_tax_id);
