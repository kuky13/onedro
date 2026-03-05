-- Add the missing unique constraint so upserts from edge functions work
ALTER TABLE public.whatsapp_instances
  ADD CONSTRAINT uq_whatsapp_instances_user_instance UNIQUE (user_id, instance_name);
