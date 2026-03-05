-- Create a storage bucket for store assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('store_assets', 'store_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the bucket
-- Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store_assets' );

-- Allow authenticated users to upload files (they will only be able to manage their own stores practically, 
-- but storage RLS is often simpler. Ideally we restrict by folder path = user_id or store_id)
-- For simplicity in this demo: Authenticated users can insert/update/delete
CREATE POLICY "Auth Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'store_assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'store_assets' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'store_assets' AND auth.role() = 'authenticated' );
