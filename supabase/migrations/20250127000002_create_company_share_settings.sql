-- Create company_share_settings table
CREATE TABLE IF NOT EXISTS public.company_share_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    custom_message TEXT,
    show_address BOOLEAN DEFAULT true,
    show_business_hours BOOLEAN DEFAULT true,
    show_company_name BOOLEAN DEFAULT true,
    show_description BOOLEAN DEFAULT true,
    show_email BOOLEAN DEFAULT true,
    show_logo BOOLEAN DEFAULT true,
    show_phone BOOLEAN DEFAULT true,
    show_special_instructions BOOLEAN DEFAULT true,
    show_warranty_info BOOLEAN DEFAULT true,
    show_welcome_message BOOLEAN DEFAULT true,
    show_whatsapp_button BOOLEAN DEFAULT true,
    special_instructions TEXT,
    theme_color TEXT DEFAULT '#3B82F6',
    warranty_info TEXT,
    welcome_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create index for owner_id for better performance
CREATE INDEX IF NOT EXISTS idx_company_share_settings_owner_id ON public.company_share_settings(owner_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.company_share_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own company share settings" ON public.company_share_settings
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own company share settings" ON public.company_share_settings
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own company share settings" ON public.company_share_settings
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own company share settings" ON public.company_share_settings
    FOR DELETE USING (owner_id = auth.uid());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_company_share_settings_updated_at
    BEFORE UPDATE ON public.company_share_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to authenticated users
GRANT ALL PRIVILEGES ON public.company_share_settings TO authenticated;
GRANT ALL PRIVILEGES ON public.company_share_settings TO anon;

-- Grant usage on sequence if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;