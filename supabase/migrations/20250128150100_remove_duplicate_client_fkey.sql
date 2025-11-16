-- Remove duplicate foreign key constraint between service_orders and clients
-- This fixes the "more than one relationship" error in Supabase PostgREST

-- Drop the older foreign key constraint (keeping the newer one: fk_service_orders_client_id)
ALTER TABLE service_orders 
DROP CONSTRAINT IF EXISTS service_orders_client_id_fkey;

-- Verify that the remaining constraint exists and has the correct properties
-- The fk_service_orders_client_id constraint should remain with ON DELETE SET