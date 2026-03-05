-- Add remote_jid column to whatsapp_conversations to preserve the original JID format
-- This is needed because LID contacts (e.g. 220727613640816@lid) cannot be reached via @s.whatsapp.net
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS remote_jid TEXT;