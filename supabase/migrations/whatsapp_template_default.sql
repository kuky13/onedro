BEGIN;

-- Atualização e normalização do template WhatsApp para todos os usuários
DO $block$
DECLARE template_text text := $$📱{nome_empresa} 
*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

*{qualidade_peca}* – {garantia_meses} meses de garantia 
💰 À vista {preco_vista} | no cartão (crédito) {preco_parcelado} {num_parcelas}x de {valor_parcela} 

*📦 Serviços Inclusos:* 
{servicos_inclusos} 

*🛡️ Garantia até {garantia_meses} meses* 
🚫 Não cobre danos por água ou molhado 
📅 Válido até: {data_validade}$$;
BEGIN
  -- Atualiza todos os templates existentes para o novo padrão
  UPDATE public.whatsapp_message_templates
  SET message_template = template_text,
      is_default = true;

  -- Insere template padrão para usuários sem template
  INSERT INTO public.whatsapp_message_templates (user_id, template_name, message_template, is_default)
  SELECT p.id, 'Padrão', template_text, true
  FROM public.user_profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.whatsapp_message_templates t WHERE t.user_id = p.id
  );
END
$block$;

-- Função e trigger para garantir template em novos usuários
CREATE OR REPLACE FUNCTION public.ensure_default_whatsapp_template()
RETURNS trigger AS $func$
DECLARE template_text text := $$📱{nome_empresa} 
*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

*{qualidade_peca}* – {garantia_meses} meses de garantia 
💰 À vista {preco_vista} | no cartão (crédito) {preco_parcelado} {num_parcelas}x de {valor_parcela} 

*📦 Serviços Inclusos:* 
{servicos_inclusos} 

*🛡️ Garantia até {garantia_meses} meses* 
🚫 Não cobre danos por água ou molhado 
📅 Válido até: {data_validade}$$;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.whatsapp_message_templates WHERE user_id = NEW.id) THEN
    INSERT INTO public.whatsapp_message_templates (user_id, template_name, message_template, is_default)
    VALUES (NEW.id, 'Padrão', template_text, true);
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ensure_default_whatsapp_template ON public.user_profiles;
CREATE TRIGGER trg_ensure_default_whatsapp_template
AFTER INSERT ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_default_whatsapp_template();

COMMIT;