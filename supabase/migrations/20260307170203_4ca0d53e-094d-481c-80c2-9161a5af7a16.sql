
-- Create os_pdf_templates table
CREATE TABLE public.os_pdf_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    template_name text NOT NULL,
    template_type text NOT NULL DEFAULT 'os_receipt' CHECK (template_type IN ('os_receipt', 'thermal_label')),
    template_content text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.os_pdf_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own templates + global templates (user_id IS NULL)
CREATE POLICY "Users can view own and global os_pdf_templates"
ON public.os_pdf_templates FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

-- Users can insert their own templates
CREATE POLICY "Users can insert own os_pdf_templates"
ON public.os_pdf_templates FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY "Users can update own os_pdf_templates"
ON public.os_pdf_templates FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY "Users can delete own os_pdf_templates"
ON public.os_pdf_templates FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger to unset other defaults when setting a new default
CREATE OR REPLACE FUNCTION public.handle_os_pdf_template_default()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.os_pdf_templates
        SET is_default = false
        WHERE id != NEW.id
          AND user_id = NEW.user_id
          AND template_type = NEW.template_type
          AND is_default = true;
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_os_pdf_template_default
BEFORE INSERT OR UPDATE ON public.os_pdf_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_os_pdf_template_default();

-- Insert global default templates
INSERT INTO public.os_pdf_templates (user_id, template_name, template_type, template_content, is_default) VALUES
(NULL, 'Recibo OS Padrão', 'os_receipt',
'================================
{nome_empresa}
{endereco}
Tel: {telefone} | CNPJ: {cnpj}
================================

ORDEM DE SERVIÇO: {num_os}
Status: {status}
Data Entrada: {data_entrada}
Previsão: {data_previsao}

--- CLIENTE ---
{nome_cliente}
Tel: {telefone_cliente}

--- EQUIPAMENTO ---
{tipo_dispositivo} - {modelo_dispositivo}
IMEI/Serial: {imei_serial}

--- SERVIÇO ---
Defeito: {defeito}
Observações: {observacoes}

--- VALORES ---
Total: {valor_total}
Pagamento: {status_pagamento}

--- GARANTIA ---
{garantia_meses} meses de garantia

{termos_cancelamento}
{lembretes_garantia}
================================', true),

(NULL, 'Etiqueta Térmica Padrão', 'thermal_label',
'{nome_empresa}
{telefone}
---
OS: {num_os}
{data_entrada}
---
{nome_cliente}
{modelo_dispositivo}
{defeito}
---
{qr_code}', true);
