-- Fix service order status enum to include all required statuses
-- Date: 2025-01-20
-- Description: Add pending_approval, under_warranty, ready_for_pickup, waiting_parts, waiting_client to service_order_status enum

-- First, add the missing values to the enum
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'under_warranty';
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'waiting_parts';
ALTER TYPE service_order_status ADD VALUE IF NOT EXISTS 'waiting_client';

-- Update the check constraint to include all status values
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_status_check;

ALTER TABLE service_orders 
ADD CONSTRAINT service_orders_status_check 
CHECK (status::text = ANY (ARRAY[
  'opened'::character varying, 
  'pending'::character varying, 
  'pending_approval'::character varying,
  'in_progress'::character varying, 
  'waiting_parts'::character varying,
  'waiting_client'::character varying,
  'under_warranty'::character varying,
  'ready_for_pickup'::character varying,
  'completed'::character varying, 
  'cancelled'::character varying, 
  'delivered'::character varying
]::text[]));

-- Update comment
COMMENT ON TYPE service_order_status IS 'Complete enum with all service order statuses including pending_approval, under_warranty, ready_for_pickup, waiting_parts, waiting_client';