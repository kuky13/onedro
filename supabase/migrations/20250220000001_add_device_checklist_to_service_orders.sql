-- Add device_checklist field to service_orders table
-- This migration adds a JSONB field to store device functionality checklist data

-- Add device_checklist column to service_orders table
ALTER TABLE service_orders 
ADD COLUMN device_checklist JSONB DEFAULT NULL;

-- Add comment to describe the new field
COMMENT ON COLUMN service_orders.device_checklist IS 'Checklist de funcionamento do aparelho em formato JSON com seções: tela_toque, botoes_fisicos, seguranca_sensores, som_comunicacao, cameras, conectividade_energia';

-- Create index for efficient querying of checklist data
CREATE INDEX IF NOT EXISTS idx_service_orders_device_checklist 
ON service_orders USING GIN(device_checklist) 
WHERE device_checklist IS NOT NULL AND deleted_at IS NULL;