-- Ensure columns exist (idempotent)
ALTER TABLE whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS admin_notification_phone TEXT,
ADD COLUMN IF NOT EXISTS purchase_approved_template TEXT DEFAULT '💰 Nova compra aprovada!\n\nCliente: {{client_name}}\nValor: R$ {{amount}}\nPlano: {{plan_name}}',
ADD COLUMN IF NOT EXISTS buyer_notification_template TEXT DEFAULT 'Olá {{client_name}}! Sua compra de {{plan_name}} no valor de R$ {{amount}} foi confirmada. Obrigado!';

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload config';
