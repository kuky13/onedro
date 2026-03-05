CREATE TABLE IF NOT EXISTS public.whatsapp_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  event TEXT NOT NULL,
  remote_jid TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own WhatsApp events"
  ON public.whatsapp_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert WhatsApp events"
  ON public.whatsapp_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_user_instance_created
  ON public.whatsapp_events(user_id, instance_name, created_at DESC);

