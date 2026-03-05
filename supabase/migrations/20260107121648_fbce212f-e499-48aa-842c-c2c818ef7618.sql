-- Update admin_renew_license to regenerate code when renewing TRIAL licenses
CREATE OR REPLACE FUNCTION public.admin_renew_license(license_id uuid, additional_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  license_record RECORD;
  new_expiration TIMESTAMP WITH TIME ZONE;
  v_is_trial BOOLEAN;
  v_new_code TEXT;
BEGIN
  -- Verificar se é admin
  IF NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem renovar licenças';
  END IF;
  
  -- Buscar a licença
  SELECT * INTO license_record
  FROM public.licenses
  WHERE id = license_id;
  
  IF license_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Licença não encontrada');
  END IF;
  
  -- Identificar se o código atual é TRIAL*
  v_is_trial := license_record.code LIKE 'TRIAL%';
  
  -- Calcular nova data de expiração
  IF license_record.expires_at IS NULL OR license_record.expires_at < NOW() THEN
    new_expiration := NOW() + (additional_days || ' days')::INTERVAL;
  ELSE
    new_expiration := license_record.expires_at + (additional_days || ' days')::INTERVAL;
  END IF;
  
  IF v_is_trial THEN
    -- Gerar novo código "normal" de 13 caracteres alfanuméricos (A-Z0-9)
    LOOP
      v_new_code := UPPER(SUBSTRING(
        REPLACE(ENCODE(DIGEST(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT, 'md5'), 'hex'), '-', ''),
        1, 13
      ));
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.licenses WHERE code = v_new_code
      );
    END LOOP;

    -- Atualizar licença: trocar código TRIAL pelo novo código e renovar expiração
    UPDATE public.licenses
    SET 
      code = v_new_code,
      expires_at = new_expiration
    WHERE id = license_id;

    -- Registrar no histórico de licenças a renovação de TRIAL com novo código
    INSERT INTO public.license_history (
      license_id,
      action_type,
      admin_user_id,
      details,
      notes
    ) VALUES (
      license_id,
      'renew_trial_with_new_code',
      auth.uid(),
      jsonb_build_object(
        'old_code', license_record.code,
        'new_code', v_new_code,
        'additional_days', additional_days,
        'new_expiration', new_expiration
      ),
      'Renovação de licença TRIAL com geração de novo código permanente'
    );

    RETURN jsonb_build_object(
      'success', true,
      'new_expiration', new_expiration,
      'new_code', v_new_code
    );
  ELSE
    -- Fluxo normal: licença não-TRIAL, apenas renovar
    UPDATE public.licenses
    SET expires_at = new_expiration
    WHERE id = license_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'new_expiration', new_expiration
    );
  END IF;
END;
$function$;