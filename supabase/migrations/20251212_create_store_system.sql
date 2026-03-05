-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Stores Table
CREATE TABLE IF NOT EXISTS stores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  contact_info JSONB DEFAULT '{}'::JSONB, -- { phone, email, address, whatsapp }
  theme_config JSONB DEFAULT '{"primaryColor": "#000000", "font": "Inter"}'::JSONB,
  policies JSONB DEFAULT '{"warranty_days": 90, "delivery_info": "Pickup only"}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster slug lookup
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON stores(owner_id);

-- 2. Store Services (Catalog)
CREATE TABLE IF NOT EXISTS store_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'Screen Replacement', 'Battery', 'Software'
  price DECIMAL(10, 2), -- Estimated price
  estimated_time_minutes INTEGER,
  warranty_days INTEGER DEFAULT 90,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_services_store ON store_services(store_id);

-- 3. Chronic Problems (Technical Knowledge Base)
CREATE TABLE IF NOT EXISTS chronic_problems (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  device_model TEXT NOT NULL,
  symptom TEXT NOT NULL,
  description TEXT,
  solution TEXT,
  frequency TEXT, -- 'High', 'Medium', 'Low'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chronic_problems_store ON chronic_problems(store_id);
CREATE INDEX IF NOT EXISTS idx_chronic_problems_device ON chronic_problems(device_model);

-- 4. Store Budgets (Independent Module)
CREATE TABLE IF NOT EXISTS store_budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  device_model TEXT NOT NULL,
  device_imei TEXT,
  problem_description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'in_progress', 'completed'
  total_amount DECIMAL(10, 2),
  items JSONB DEFAULT '[]'::JSONB, -- Array of services/parts
  notes TEXT,
  public_token UUID DEFAULT uuid_generate_v4(), -- For public tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_budgets_store ON store_budgets(store_id);
CREATE INDEX IF NOT EXISTS idx_store_budgets_token ON store_budgets(public_token);

-- RLS Policies (Row Level Security)

-- Stores: Owners can do everything, Public can view by slug
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Users can manage their own stores'
    ) THEN
        CREATE POLICY "Users can manage their own stores" ON stores
          FOR ALL USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'stores' AND policyname = 'Public can view stores by slug'
    ) THEN
        CREATE POLICY "Public can view stores by slug" ON stores
          FOR SELECT USING (true);
    END IF;
END $$;

-- Services: Owners manage, Public view
ALTER TABLE store_services ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'store_services' AND policyname = 'Users can manage their store services'
    ) THEN
        CREATE POLICY "Users can manage their store services" ON store_services
          FOR ALL USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_services.store_id AND stores.owner_id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'store_services' AND policyname = 'Public can view store services'
    ) THEN
        CREATE POLICY "Public can view store services" ON store_services
          FOR SELECT USING (true);
    END IF;
END $$;

-- Budgets: Owners manage all, Public can create (request) and view their own (via token)
ALTER TABLE store_budgets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'store_budgets' AND policyname = 'Users can manage their store budgets'
    ) THEN
        CREATE POLICY "Users can manage their store budgets" ON store_budgets
          FOR ALL USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_budgets.store_id AND stores.owner_id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'store_budgets' AND policyname = 'Public can create budgets'
    ) THEN
        CREATE POLICY "Public can create budgets" ON store_budgets
          FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'store_budgets' AND policyname = 'Public can view their budget via token'
    ) THEN
        CREATE POLICY "Public can view their budget via token" ON store_budgets
          FOR SELECT USING (public_token::text = current_setting('request.headers', true)::json->>'x-budget-token'); 
    END IF;
END $$;
