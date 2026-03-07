-- Create storage bucket for service order photos if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-order-photos', 'service-order-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated uploads to storage
BEGIN;
  DROP POLICY IF EXISTS "Authenticated users can upload service order photos" ON storage.objects;
  CREATE POLICY "Authenticated users can upload service order photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-order-photos');

  DROP POLICY IF EXISTS "Authenticated users can select service order photos" ON storage.objects;
  CREATE POLICY "Authenticated users can select service order photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'service-order-photos');
COMMIT;

-- Create table to link photos to service orders
CREATE TABLE IF NOT EXISTS public.service_order_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    photo_type TEXT CHECK (photo_type IN ('front', 'back', 'side', 'other', 'label')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.service_order_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view photos of their service orders" ON public.service_order_photos;
CREATE POLICY "Users can view photos of their service orders"
ON public.service_order_photos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.service_orders so
        WHERE so.id = service_order_photos.service_order_id
        AND (so.owner_id = auth.uid() OR so.owner_id IS NULL) 
    )
);

DROP POLICY IF EXISTS "Users can insert photos for their service orders" ON public.service_order_photos;
CREATE POLICY "Users can insert photos for their service orders"
ON public.service_order_photos FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.service_orders so
        WHERE so.id = service_order_photos.service_order_id
        AND (so.owner_id = auth.uid() OR so.owner_id IS NULL)
    )
);
