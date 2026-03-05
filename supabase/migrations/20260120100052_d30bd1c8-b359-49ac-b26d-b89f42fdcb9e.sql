-- Add external message id for idempotency (Evolution/Baileys key.id)
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS external_id text;

-- Prevent duplicate processing of the same inbound webhook message
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_owner_external_id_uidx
ON public.whatsapp_messages (owner_id, external_id)
WHERE external_id IS NOT NULL;