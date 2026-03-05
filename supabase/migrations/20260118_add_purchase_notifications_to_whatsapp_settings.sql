ALTER TABLE whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS admin_notification_phone TEXT,
ADD COLUMN IF NOT EXISTS purchase_approved_template TEXT DEFAULT '💰 Nova compra aprovada!\n\nCliente: {{client_name}}\nValor: R$ {{amount}}\nPlano: {{plan_name}}';
