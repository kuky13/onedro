-- Create tables for Store Brands and Devices
CREATE TABLE IF NOT EXISTS store_brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES store_brands(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  chronic_issues TEXT, -- Description of common/chronic problems
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add device_id to store_services to link services to specific models
ALTER TABLE store_services 
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES store_devices(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_store_brands_store ON store_brands(store_id);
CREATE INDEX IF NOT EXISTS idx_store_devices_store ON store_devices(store_id);
CREATE INDEX IF NOT EXISTS idx_store_devices_brand ON store_devices(brand_id);
CREATE INDEX IF NOT EXISTS idx_store_services_device ON store_services(device_id);

-- RLS Policies
ALTER TABLE store_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_devices ENABLE ROW LEVEL SECURITY;

-- Brands Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_brands' AND policyname = 'Users can manage their store brands') THEN
        CREATE POLICY "Users can manage their store brands" ON store_brands
          FOR ALL USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_brands.store_id AND stores.owner_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_brands' AND policyname = 'Public can view store brands') THEN
        CREATE POLICY "Public can view store brands" ON store_brands
          FOR SELECT USING (true);
    END IF;
END $$;

-- Devices Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_devices' AND policyname = 'Users can manage their store devices') THEN
        CREATE POLICY "Users can manage their store devices" ON store_devices
          FOR ALL USING (EXISTS (SELECT 1 FROM stores WHERE stores.id = store_devices.store_id AND stores.owner_id = auth.uid()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_devices' AND policyname = 'Public can view store devices') THEN
        CREATE POLICY "Public can view store devices" ON store_devices
          FOR SELECT USING (true);
    END IF;
END $$;
