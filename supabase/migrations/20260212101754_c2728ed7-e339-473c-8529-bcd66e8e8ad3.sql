
CREATE TABLE public.ia_product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price_min INTEGER,
  price_max INTEGER,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_product_catalog_owner_id ON public.ia_product_catalog(owner_id);

ALTER TABLE public.ia_product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products"
  ON public.ia_product_catalog
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
