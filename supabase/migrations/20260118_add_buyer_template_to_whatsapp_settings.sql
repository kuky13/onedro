-- Add buyer_notification_template to whatsapp_zapi_settings
ALTER TABLE whatsapp_zapi_settings
ADD COLUMN IF NOT EXISTS buyer_notification_template TEXT DEFAULT 'Olá {{client_name}}! Sua compra de {{plan_name}} no valor de R$ {{amount}} foi confirmada. Obrigado!';

-- Comment on column
COMMENT ON COLUMN whatsapp_zapi_settings.buyer_notification_template IS 'Template for the message sent to the buyer after purchase approval';
