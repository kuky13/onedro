-- WhatsApp CRM module (OneDrip)

-- 1) Common updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Agents
CREATE TABLE IF NOT EXISTS public.whatsapp_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  system_prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_agents_owner_id ON public.whatsapp_agents(owner_id);

DROP TRIGGER IF EXISTS trg_whatsapp_agents_updated_at ON public.whatsapp_agents;
CREATE TRIGGER trg_whatsapp_agents_updated_at
BEFORE UPDATE ON public.whatsapp_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_agents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own whatsapp agents"
  ON public.whatsapp_agents
  FOR SELECT
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own whatsapp agents"
  ON public.whatsapp_agents
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own whatsapp agents"
  ON public.whatsapp_agents
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own whatsapp agents"
  ON public.whatsapp_agents
  FOR DELETE
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 3) Settings (Evolution/Typebot integration per owner)
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  evolution_api_url text NULL,
  evolution_instance_id text NULL,
  webhook_secret text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_settings_owner_id ON public.whatsapp_settings(owner_id);

DROP TRIGGER IF EXISTS trg_whatsapp_settings_updated_at ON public.whatsapp_settings;
CREATE TRIGGER trg_whatsapp_settings_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own whatsapp settings"
  ON public.whatsapp_settings
  FOR SELECT
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own whatsapp settings"
  ON public.whatsapp_settings
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own whatsapp settings"
  ON public.whatsapp_settings
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own whatsapp settings"
  ON public.whatsapp_settings
  FOR DELETE
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 4) Conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  phone_number text NOT NULL,
  client_id uuid NULL,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- prevent duplicates per owner
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_conversations_owner_phone
ON public.whatsapp_conversations(owner_id, phone_number);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_owner_id ON public.whatsapp_conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at ON public.whatsapp_conversations(last_message_at DESC);

DROP TRIGGER IF EXISTS trg_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER trg_whatsapp_conversations_updated_at
BEFORE UPDATE ON public.whatsapp_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own whatsapp conversations"
  ON public.whatsapp_conversations
  FOR SELECT
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own whatsapp conversations"
  ON public.whatsapp_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own whatsapp conversations"
  ON public.whatsapp_conversations
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own whatsapp conversations"
  ON public.whatsapp_conversations
  FOR DELETE
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 5) Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL, -- 'in' | 'out'
  content text NOT NULL,
  agent_id uuid NULL REFERENCES public.whatsapp_agents(id) ON DELETE SET NULL,
  raw_payload jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_owner_id ON public.whatsapp_messages(owner_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id_created_at ON public.whatsapp_messages(conversation_id, created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own whatsapp messages"
  ON public.whatsapp_messages
  FOR SELECT
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own whatsapp messages"
  ON public.whatsapp_messages
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own whatsapp messages"
  ON public.whatsapp_messages
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own whatsapp messages"
  ON public.whatsapp_messages
  FOR DELETE
  USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 6) Webhook events audit (raw events from Evolution/Typebot)
CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NULL,
  source text NOT NULL, -- 'evolution' | 'typebot' | 'other'
  event_type text NULL,
  phone_number text NULL,
  conversation_id uuid NULL REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  request_id text NULL,
  payload jsonb NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_received_at ON public.whatsapp_webhook_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_owner_id ON public.whatsapp_webhook_events(owner_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_phone_number ON public.whatsapp_webhook_events(phone_number);

ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only owner can read their own events (owner_id may be null for pre-routing events)
DO $$ BEGIN
  CREATE POLICY "Users can view their own whatsapp webhook events"
  ON public.whatsapp_webhook_events
  FOR SELECT
  USING (owner_id IS NOT NULL AND auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users can insert only events attributed to themselves (typically via app UI, not webhook)
DO $$ BEGIN
  CREATE POLICY "Users can create their own whatsapp webhook events"
  ON public.whatsapp_webhook_events
  FOR INSERT
  WITH CHECK (owner_id IS NOT NULL AND auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
