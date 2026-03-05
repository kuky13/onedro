-- Create warranties table
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL, -- References auth.users or profiles, typically handled by RLS
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'delivered')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_warranties_owner_id ON public.warranties(owner_id);
CREATE INDEX IF NOT EXISTS idx_warranties_service_order_id ON public.warranties(service_order_id);

-- Enable RLS
ALTER TABLE public.warranties ENABLE ROW LEVEL SECURITY;

-- Create policies (assuming similar to service_orders)
CREATE POLICY "Users can view their own warranties"
    ON public.warranties FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own warranties"
    ON public.warranties FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own warranties"
    ON public.warranties FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete (soft) their own warranties"
    ON public.warranties FOR UPDATE
    USING (auth.uid() = owner_id); -- Soft delete usually is an update setting deleted_at

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS set_warranties_updated_at ON public.warranties;
CREATE TRIGGER set_warranties_updated_at
    BEFORE UPDATE ON public.warranties
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
