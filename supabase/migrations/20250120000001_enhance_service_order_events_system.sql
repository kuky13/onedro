-- Enhance service_order_events system with new event types and customer-focused logging
-- This migration adds new event types and improves the event logging system for better customer tracking

-- Add new event types for customer-focused tracking
DO $$
BEGIN
  -- Add new event types if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_order_event_type_new') THEN
    CREATE TYPE service_order_event_type_new AS ENUM (
      'created',
      'status_changed',
      'payment_status_changed',
      'delivery_date_changed',
      'priority_changed',
      'item_added',
      'item_updated',
      'item_removed',
      'estimated_completion_set',
      'estimated_completion_changed',
      'actual_completion_set',
      'customer_notes_added',
      'customer_notes_updated',
      'technician_notes_added',
      'technician_notes_updated',
      'shared_with_customer',
      'customer_viewed',
      'progress_update',
      'diagnostic_completed',
      'repair_started',
      'repair_completed',
      'quality_check',
      'ready_for_pickup',
      'delivered'
    );
  END IF;
END $$;

-- Add customer_visible column to service_order_events if it doesn't exist
ALTER TABLE service_order_events 
ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_message TEXT;

-- Create index for customer-visible events
CREATE INDEX IF NOT EXISTS idx_service_order_events_customer_visible 
ON service_order_events(service_order_id, customer_visible, created_at) 
WHERE customer_visible = true;

-- Create index for notification tracking
CREATE INDEX IF NOT EXISTS idx_service_order_events_notification 
ON service_order_events(notification_sent, created_at) 
WHERE notification_sent = false;

-- Update the event logging function to handle new event types and customer visibility
CREATE OR REPLACE FUNCTION log_service_order_event(
  p_service_order_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}',
  p_customer_visible BOOLEAN DEFAULT true,
  p_customer_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO service_order_events (
    service_order_id,
    event_type,
    payload,
    customer_visible,
    customer_message,
    created_by
  ) VALUES (
    p_service_order_id,
    p_event_type,
    p_payload,
    p_customer_visible,
    p_customer_message,
    auth.uid()
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced trigger function for automatic event logging
CREATE OR REPLACE FUNCTION log_service_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  event_payload JSONB := '{}';
  customer_msg TEXT;
  is_customer_visible BOOLEAN := true;
BEGIN
  -- Status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    event_payload := jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', NOW()
    );
    
    customer_msg := CASE NEW.status
      WHEN 'received' THEN 'Seu dispositivo foi recebido e está sendo analisado'
      WHEN 'diagnosing' THEN 'Diagnóstico em andamento'
      WHEN 'waiting_approval' THEN 'Aguardando sua aprovação para o reparo'
      WHEN 'approved' THEN 'Reparo aprovado, iniciando os trabalhos'
      WHEN 'in_progress' THEN 'Reparo em andamento'
      WHEN 'testing' THEN 'Realizando testes de qualidade'
      WHEN 'completed' THEN 'Reparo concluído! Seu dispositivo está pronto'
      WHEN 'delivered' THEN 'Dispositivo entregue com sucesso'
      WHEN 'cancelled' THEN 'Serviço cancelado'
      ELSE 'Status atualizado para: ' || NEW.status
    END;
    
    PERFORM log_service_order_event(
      NEW.id,
      'status_changed',
      event_payload,
      true,
      customer_msg
    );
  END IF;

  -- Payment status changes
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    event_payload := jsonb_build_object(
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status,
      'changed_at', NOW()
    );
    
    customer_msg := CASE NEW.payment_status
      WHEN 'pending' THEN 'Pagamento pendente'
      WHEN 'partial' THEN 'Pagamento parcial recebido'
      WHEN 'paid' THEN 'Pagamento confirmado! Obrigado'
      WHEN 'overdue' THEN 'Pagamento em atraso'
      WHEN 'cancelled' THEN 'Pagamento cancelado'
      ELSE 'Status de pagamento atualizado'
    END;
    
    PERFORM log_service_order_event(
      NEW.id,
      'payment_status_changed',
      event_payload,
      true,
      customer_msg
    );
  END IF;

  -- Estimated completion changes
  IF TG_OP = 'UPDATE' AND OLD.estimated_completion IS DISTINCT FROM NEW.estimated_completion THEN
    event_payload := jsonb_build_object(
      'old_estimated_completion', OLD.estimated_completion,
      'new_estimated_completion', NEW.estimated_completion,
      'changed_at', NOW()
    );
    
    customer_msg := CASE 
      WHEN OLD.estimated_completion IS NULL AND NEW.estimated_completion IS NOT NULL THEN
        'Previsão de conclusão definida para: ' || to_char(NEW.estimated_completion, 'DD/MM/YYYY')
      WHEN NEW.estimated_completion IS NULL THEN
        'Previsão de conclusão removida'
      ELSE
        'Previsão de conclusão atualizada para: ' || to_char(NEW.estimated_completion, 'DD/MM/YYYY')
    END;
    
    PERFORM log_service_order_event(
      NEW.id,
      CASE 
        WHEN OLD.estimated_completion IS NULL THEN 'estimated_completion_set'
        ELSE 'estimated_completion_changed'
      END,
      event_payload,
      true,
      customer_msg
    );
  END IF;

  -- Actual completion
  IF TG_OP = 'UPDATE' AND OLD.actual_completion IS DISTINCT FROM NEW.actual_completion AND NEW.actual_completion IS NOT NULL THEN
    event_payload := jsonb_build_object(
      'actual_completion', NEW.actual_completion,
      'changed_at', NOW()
    );
    
    PERFORM log_service_order_event(
      NEW.id,
      'actual_completion_set',
      event_payload,
      true,
      'Serviço concluído em: ' || to_char(NEW.actual_completion, 'DD/MM/YYYY às HH24:MI')
    );
  END IF;

  -- Customer notes changes
  IF TG_OP = 'UPDATE' AND OLD.customer_notes IS DISTINCT FROM NEW.customer_notes THEN
    event_payload := jsonb_build_object(
      'old_notes', OLD.customer_notes,
      'new_notes', NEW.customer_notes,
      'changed_at', NOW()
    );
    
    PERFORM log_service_order_event(
      NEW.id,
      CASE 
        WHEN OLD.customer_notes IS NULL OR OLD.customer_notes = '' THEN 'customer_notes_added'
        ELSE 'customer_notes_updated'
      END,
      event_payload,
      false, -- Customer notes changes are not visible to customer
      NULL
    );
  END IF;

  -- Technician notes changes (internal only)
  IF TG_OP = 'UPDATE' AND OLD.technician_notes IS DISTINCT FROM NEW.technician_notes THEN
    event_payload := jsonb_build_object(
      'old_notes', OLD.technician_notes,
      'new_notes', NEW.technician_notes,
      'changed_at', NOW()
    );
    
    PERFORM log_service_order_event(
      NEW.id,
      CASE 
        WHEN OLD.technician_notes IS NULL OR OLD.technician_notes = '' THEN 'technician_notes_added'
        ELSE 'technician_notes_updated'
      END,
      event_payload,
      false, -- Technician notes are never visible to customer
      NULL
    );
  END IF;

  -- Delivery date changes
  IF TG_OP = 'UPDATE' AND OLD.delivery_date IS DISTINCT FROM NEW.delivery_date THEN
    event_payload := jsonb_build_object(
      'old_delivery_date', OLD.delivery_date,
      'new_delivery_date', NEW.delivery_date,
      'changed_at', NOW()
    );
    
    customer_msg := CASE 
      WHEN OLD.delivery_date IS NULL AND NEW.delivery_date IS NOT NULL THEN
        'Data de entrega agendada para: ' || to_char(NEW.delivery_date, 'DD/MM/YYYY')
      WHEN NEW.delivery_date IS NULL THEN
        'Data de entrega removida'
      ELSE
        'Data de entrega atualizada para: ' || to_char(NEW.delivery_date, 'DD/MM/YYYY')
    END;
    
    PERFORM log_service_order_event(
      NEW.id,
      'delivery_date_changed',
      event_payload,
      true,
      customer_msg
    );
  END IF;

  -- Priority changes (internal tracking)
  IF TG_OP = 'UPDATE' AND OLD.priority IS DISTINCT FROM NEW.priority THEN
    event_payload := jsonb_build_object(
      'old_priority', OLD.priority,
      'new_priority', NEW.priority,
      'changed_at', NOW()
    );
    
    PERFORM log_service_order_event(
      NEW.id,
      'priority_changed',
      event_payload,
      false, -- Priority changes are internal
      NULL
    );
  END IF;

  -- Creation event
  IF TG_OP = 'INSERT' THEN
    event_payload := jsonb_build_object(
      'device_type', NEW.device_type,
      'device_model', NEW.device_model,
      'reported_issue', NEW.reported_issue,
      'created_at', NEW.created_at
    );
    
    PERFORM log_service_order_event(
      NEW.id,
      'created',
      event_payload,
      true,
      'Ordem de serviço criada! Acompanhe o progresso do seu reparo aqui.'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create function to log custom progress updates
CREATE OR REPLACE FUNCTION log_progress_update(
  p_service_order_id UUID,
  p_message TEXT,
  p_details JSONB DEFAULT '{}'
) RETURNS UUID AS $$
BEGIN
  RETURN log_service_order_event(
    p_service_order_id,
    'progress_update',
    jsonb_build_object(
      'message', p_message,
      'details', p_details,
      'timestamp', NOW()
    ),
    true,
    p_message
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log customer view events
CREATE OR REPLACE FUNCTION log_customer_view(
  p_service_order_id UUID,
  p_share_token TEXT DEFAULT NULL
) RETURNS UUID AS $$
BEGIN
  RETURN log_service_order_event(
    p_service_order_id,
    'customer_viewed',
    jsonb_build_object(
      'share_token', p_share_token,
      'viewed_at', NOW(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    ),
    false, -- View events are for internal tracking
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_service_order_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_progress_update TO authenticated;
GRANT EXECUTE ON FUNCTION log_customer_view TO anon, authenticated;

-- Update existing events to have customer_visible = true by default
UPDATE service_order_events 
SET customer_visible = true 
WHERE customer_visible IS NULL 
  AND event_type IN ('status_changed', 'payment_status_changed', 'delivery_date_changed');

UPDATE service_order_events 
SET customer_visible = false 
WHERE customer_visible IS NULL 
  AND event_type IN ('priority_changed', 'item_added', 'item_updated', 'item_removed');

-- Add comments for documentation
COMMENT ON COLUMN service_order_events.customer_visible IS 'Whether this event should be visible to customers in the public timeline';
COMMENT ON COLUMN service_order_events.notification_sent IS 'Whether a notification has been sent to the customer for this event';
COMMENT ON COLUMN service_order_events.customer_message IS 'User-friendly message to display to customers for this event';
COMMENT ON FUNCTION log_service_order_event IS 'Logs a service order event with customer visibility and messaging options';
COMMENT ON FUNCTION log_progress_update IS 'Logs a custom progress update visible to customers';
COMMENT ON FUNCTION log_customer_view IS 'Logs when a customer views their service order via share link';