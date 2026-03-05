
-- =============================================
-- Multi-instância: add instance_id to conversations
-- Transferência humana: add ai_paused + assigned_to to conversations
-- =============================================

-- Add instance_id to link conversations to specific instances
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL;

-- Add human handoff columns
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_paused_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookup of paused conversations
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_ai_paused 
  ON public.whatsapp_conversations(owner_id, ai_paused) WHERE ai_paused = true;

-- Index for instance lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_instance 
  ON public.whatsapp_conversations(instance_id);
