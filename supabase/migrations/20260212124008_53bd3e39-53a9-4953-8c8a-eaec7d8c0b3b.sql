
-- Bridge table linking budget_parts <-> store_services for bidirectional sync
CREATE TABLE public.service_sync_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_part_id UUID NOT NULL REFERENCES public.budget_parts(id) ON DELETE CASCADE,
  store_service_id UUID NOT NULL REFERENCES public.store_services(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sync_direction TEXT NOT NULL DEFAULT 'worm_to_store',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_budget_part UNIQUE (budget_part_id),
  CONSTRAINT uq_store_service UNIQUE (store_service_id)
);

-- Indexes
CREATE INDEX idx_sync_links_owner ON public.service_sync_links(owner_id);
CREATE INDEX idx_sync_links_store_service ON public.service_sync_links(store_service_id);

-- RLS
ALTER TABLE public.service_sync_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync links"
  ON public.service_sync_links FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own sync links"
  ON public.service_sync_links FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own sync links"
  ON public.service_sync_links FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sync links"
  ON public.service_sync_links FOR DELETE
  USING (auth.uid() = owner_id);
