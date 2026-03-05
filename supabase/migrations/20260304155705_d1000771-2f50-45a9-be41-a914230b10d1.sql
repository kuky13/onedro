CREATE OR REPLACE FUNCTION public.sync_device_test_session_to_service_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_message text;
BEGIN
  IF NEW.service_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = COALESCE(NEW.status, '') THEN
    UPDATE public.service_orders
    SET updated_at = now()
    WHERE id = NEW.service_order_id;

    RETURN NEW;
  END IF;

  IF NEW.status = 'in_progress' THEN
    v_customer_message := 'O diagnóstico do dispositivo foi iniciado.';
  ELSIF NEW.status = 'completed' THEN
    v_customer_message := 'O diagnóstico do dispositivo foi concluído.';
  ELSE
    UPDATE public.service_orders
    SET updated_at = now()
    WHERE id = NEW.service_order_id;

    RETURN NEW;
  END IF;

  UPDATE public.service_orders
  SET updated_at = now()
  WHERE id = NEW.service_order_id;

  INSERT INTO public.service_order_events (
    service_order_id,
    event_type,
    payload,
    customer_visible,
    customer_message
  )
  SELECT
    NEW.service_order_id,
    CASE
      WHEN NEW.status = 'in_progress' THEN 'device_test_started'
      WHEN NEW.status = 'completed' THEN 'device_test_completed'
      ELSE 'device_test_updated'
    END,
    jsonb_build_object(
      'device_test_session_id', NEW.id,
      'status', NEW.status,
      'overall_score', NEW.overall_score,
      'started_at', NEW.started_at,
      'completed_at', NEW.completed_at,
      'updated_at', NEW.updated_at
    ),
    true,
    v_customer_message
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.service_order_events e
    WHERE e.service_order_id = NEW.service_order_id
      AND e.event_type = CASE
        WHEN NEW.status = 'in_progress' THEN 'device_test_started'
        WHEN NEW.status = 'completed' THEN 'device_test_completed'
        ELSE 'device_test_updated'
      END
      AND e.payload ->> 'device_test_session_id' = NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_device_test_session_to_service_order_trigger ON public.device_test_sessions;

CREATE TRIGGER sync_device_test_session_to_service_order_trigger
AFTER INSERT OR UPDATE ON public.device_test_sessions
FOR EACH ROW
EXECUTE FUNCTION public.sync_device_test_session_to_service_order();