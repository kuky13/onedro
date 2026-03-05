-- Add AI mode selection per WhatsApp instance (Drippy vs custom model)
ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS ai_mode text NOT NULL DEFAULT 'agent';

ALTER TABLE public.whatsapp_instances
ADD COLUMN IF NOT EXISTS ai_agent_id uuid NULL;

-- Optional FK to whatsapp_agents (safe: only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'whatsapp_agents'
  ) THEN
    -- Add FK if not present
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'whatsapp_instances'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.constraint_name = 'whatsapp_instances_ai_agent_id_fkey'
    ) THEN
      ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_ai_agent_id_fkey
      FOREIGN KEY (ai_agent_id) REFERENCES public.whatsapp_agents(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Constrain values to avoid typos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_instances_ai_mode_check'
  ) THEN
    ALTER TABLE public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_ai_mode_check
    CHECK (ai_mode IN ('agent','drippy','off'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_ai_mode ON public.whatsapp_instances(ai_mode);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_ai_agent_id ON public.whatsapp_instances(ai_agent_id);
