-- Enable UUID extension just in case
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create PDF templates table
-- We use IF NOT EXISTS, but we will also ensure schema updates below
CREATE TABLE IF NOT EXISTS public.pdf_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for global templates
    template_name TEXT NOT NULL,
    service_section_template TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure user_id is nullable (in case table existed as NOT NULL)
DO $$ 
BEGIN 
    ALTER TABLE public.pdf_templates ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. View: Own templates OR Global (user_id is null)
DROP POLICY IF EXISTS "Users can view own or global pdf templates" ON public.pdf_templates;
CREATE POLICY "Users can view own or global pdf templates"
    ON public.pdf_templates
    FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

-- 2. Insert: Only own templates (must have user_id)
DROP POLICY IF EXISTS "Users can insert their own pdf templates" ON public.pdf_templates;
CREATE POLICY "Users can insert their own pdf templates"
    ON public.pdf_templates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- 3. Update: Only own templates
DROP POLICY IF EXISTS "Users can update their own pdf templates" ON public.pdf_templates;
CREATE POLICY "Users can update their own pdf templates"
    ON public.pdf_templates
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 4. Delete: Only own templates
DROP POLICY IF EXISTS "Users can delete their own pdf templates" ON public.pdf_templates;
CREATE POLICY "Users can delete their own pdf templates"
    ON public.pdf_templates
    FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pdf_templates_user_id ON public.pdf_templates(user_id);

-- Trigger Function to manage only one default per user
CREATE OR REPLACE FUNCTION handle_pdf_template_default() 
RETURNS TRIGGER AS $$
BEGIN
  -- If setting to true, set all others for this user (or global if user is null) to false
  IF NEW.is_default = true THEN
    UPDATE public.pdf_templates
    SET is_default = false
    WHERE (user_id = NEW.user_id OR (user_id IS NULL AND NEW.user_id IS NULL))
      AND id != NEW.id
      AND is_default = true;
  END IF;
  return NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition
DROP TRIGGER IF EXISTS on_pdf_template_default_change ON public.pdf_templates;
CREATE TRIGGER on_pdf_template_default_change
    BEFORE INSERT OR UPDATE ON public.pdf_templates
    FOR EACH ROW
    EXECUTE FUNCTION handle_pdf_template_default();

-- Insert Global Standard Template if not exists
INSERT INTO public.pdf_templates (user_id, template_name, service_section_template, is_default)
SELECT 
    NULL, 
    'Modelo Padrão', 
    '*Serviço:* {nome_reparo}

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela}

{qualidades_fim}', 
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.pdf_templates WHERE user_id IS NULL AND is_default = true
);
