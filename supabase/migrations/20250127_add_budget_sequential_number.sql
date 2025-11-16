-- Add sequential_number field to budgets table
ALTER TABLE budgets ADD COLUMN sequential_number INTEGER;

-- Create budget sequence table similar to service_order_sequence
CREATE TABLE IF NOT EXISTS budget_sequence (
  id SERIAL PRIMARY KEY,
  current_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reset_at TIMESTAMP WITH TIME ZONE
);

-- Insert initial record
INSERT INTO budget_sequence (current_number) VALUES (0) ON CONFLICT DO NOTHING;

-- Create function to generate sequential number for budgets
CREATE OR REPLACE FUNCTION generate_budget_sequential_number()
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Update and get the next sequential number
  UPDATE budget_sequence 
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE id = 1
  RETURNING current_number INTO next_number;
  
  -- If no record exists, create one
  IF next_number IS NULL THEN
    INSERT INTO budget_sequence (current_number) VALUES (1)
    ON CONFLICT (id) DO UPDATE SET current_number = 1
    RETURNING current_number INTO next_number;
  END IF;
  
  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to format budget ID similar to service orders
CREATE OR REPLACE FUNCTION format_budget_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS-' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign sequential number on budget creation
CREATE OR REPLACE FUNCTION assign_budget_sequential_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if sequential_number is not already set
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_budget_sequential_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_assign_budget_sequential_number ON budgets;
CREATE TRIGGER trigger_assign_budget_sequential_number
  BEFORE INSERT ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION assign_budget_sequential_number();

-- Grant permissions
GRANT SELECT, UPDATE ON budget_sequence TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_budget_sequential_number() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION format_budget_id(INTEGER) TO anon, authenticated;