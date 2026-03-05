-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create mercadopago_subscriptions table (separate from Stripe subscriptions)
CREATE TABLE IF NOT EXISTS public.mercadopago_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mercadopago_preapproval_id TEXT UNIQUE NOT NULL,
  plan_type TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_authorization',
  start_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  latest_payment_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events table for debugging
CREATE TABLE IF NOT EXISTS public.mercadopago_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.mercadopago_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link mercadopago subscriptions to licenses
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'licenses' 
    AND column_name = 'mercadopago_subscription_id'
  ) THEN
    ALTER TABLE public.licenses ADD COLUMN mercadopago_subscription_id UUID NULL REFERENCES public.mercadopago_subscriptions(id);
  END IF;
END $$;

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mercadopago_subscriptions_user_id ON public.mercadopago_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_subscriptions_preapproval_id ON public.mercadopago_subscriptions(mercadopago_preapproval_id);
CREATE INDEX IF NOT EXISTS idx_mercadopago_subscription_events_subscription_id ON public.mercadopago_subscription_events(subscription_id);

-- RLS for mercadopago_subscriptions
ALTER TABLE public.mercadopago_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mercadopago subscriptions" ON public.mercadopago_subscriptions;
CREATE POLICY "Users can view own mercadopago subscriptions" ON public.mercadopago_subscriptions
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mercadopago subscriptions" ON public.mercadopago_subscriptions;
CREATE POLICY "Users can insert own mercadopago subscriptions" ON public.mercadopago_subscriptions
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mercadopago subscriptions" ON public.mercadopago_subscriptions;
CREATE POLICY "Users can update own mercadopago subscriptions" ON public.mercadopago_subscriptions
FOR UPDATE USING (auth.uid() = user_id);

-- RLS for events
ALTER TABLE public.mercadopago_subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mercadopago subscription events" ON public.mercadopago_subscription_events;
CREATE POLICY "Users can view own mercadopago subscription events" ON public.mercadopago_subscription_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.mercadopago_subscriptions s
    WHERE s.id = mercadopago_subscription_events.subscription_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can insert mercadopago subscription events" ON public.mercadopago_subscription_events;
CREATE POLICY "Service role can insert mercadopago subscription events" ON public.mercadopago_subscription_events
FOR INSERT WITH CHECK (true);

-- Trigger to keep mercadopago_subscriptions.updated_at fresh
DROP TRIGGER IF EXISTS set_mercadopago_subscriptions_updated_at ON public.mercadopago_subscriptions;
CREATE TRIGGER set_mercadopago_subscriptions_updated_at
BEFORE UPDATE ON public.mercadopago_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();