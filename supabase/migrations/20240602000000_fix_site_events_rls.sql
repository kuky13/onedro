-- Enable RLS for site_events
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to insert events
CREATE POLICY "Allow public insert to site_events"
ON public.site_events
FOR INSERT
TO public, anon
WITH CHECK (true);

-- Allow users to view their own events
CREATE POLICY "Users can view own events"
ON public.site_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins (if you have an admin role logic) or specific users to view all
-- For now, let's keep it simple or restricted. 
-- If you need a dashboard to view these events, you might need a more permissive select policy for admins.
