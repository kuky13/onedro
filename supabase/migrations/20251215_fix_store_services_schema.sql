-- Fix Store Services Schema
-- Adds missing columns for installments and pricing features

-- 1. Add max_installments (if not exists)
ALTER TABLE store_services 
ADD COLUMN IF NOT EXISTS max_installments INTEGER DEFAULT 1;

-- 2. Add interest_rate (if not exists) - kept for compatibility, defaulted to 0
ALTER TABLE store_services 
ADD COLUMN IF NOT EXISTS interest_rate DECIMAL(5,2) DEFAULT 0.00;

-- 3. Add installment_price (if not exists)
ALTER TABLE store_services 
ADD COLUMN IF NOT EXISTS installment_price DECIMAL(10,2) DEFAULT NULL;

-- 4. Add comments for documentation
COMMENT ON COLUMN store_services.max_installments IS 'Maximum number of installments allowed for this service';
COMMENT ON COLUMN store_services.interest_rate IS 'Monthly interest rate percentage (deprecated, defaults to 0)';
COMMENT ON COLUMN store_services.installment_price IS 'Total price when paid in installments. If null, same as price.';
