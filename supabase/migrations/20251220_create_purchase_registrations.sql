-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create purchase_registrations table to store customer purchase data
CREATE TABLE IF NOT EXISTS purchase_registrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  mercadopago_payment_id TEXT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  plan_type TEXT, -- 'monthly' or 'yearly'
  plan_id TEXT, -- ID do plano
  amount DECIMAL(10, 2),
  currency TEXT DEFAULT 'BRL',
  payment_method TEXT, -- 'pix', 'card', etc
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  license_code TEXT, -- Código da licença gerada
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_email ON purchase_registrations(customer_email);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_phone ON purchase_registrations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_mercadopago_payment_id ON purchase_registrations(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_license_code ON purchase_registrations(license_code);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_status ON purchase_registrations(status);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_user_id ON purchase_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_registrations_created_at ON purchase_registrations(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_purchase_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_purchase_registrations_updated_at
  BEFORE UPDATE ON purchase_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_registrations_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE purchase_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow service role to do everything (for Edge Functions)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_registrations' AND policyname = 'Service role can manage all purchase registrations'
    ) THEN
        CREATE POLICY "Service role can manage all purchase_registrations" ON purchase_registrations
          FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;

    -- Allow users to view their own purchase registrations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_registrations' AND policyname = 'Users can view their own purchase registrations'
    ) THEN
        CREATE POLICY "Users can view their own purchase_registrations" ON purchase_registrations
          FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Allow public to insert (for guest purchases)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'purchase_registrations' AND policyname = 'Public can insert purchase registrations'
    ) THEN
        CREATE POLICY "Public can insert purchase_registrations" ON purchase_registrations
          FOR INSERT WITH CHECK (true);
    END IF;
END $$;

