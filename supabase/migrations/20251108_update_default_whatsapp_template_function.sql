-- Atualizar função de template padrão para novos usuários
BEGIN;

CREATE OR REPLACE FUNCTION public.ensure_default_whatsapp_template()
RETURNS trigger AS $func$
DECLARE template_text text := $$📱 *{nome_empresa}*

*Aparelho:* {modelo_dispositivo}
*Serviço:* {nome_reparo}

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em {peca_parcelas}x de {peca_valor_parcela}

{qualidades_fim}
*📦 Serviços Inclusos:*
{servicos_inclusos}

🚫 Não cobre danos por água ou molhado

📝 *Observações:*
{observacoes}

📅 Válido até: {data_validade}$$;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.whatsapp_message_templates WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.whatsapp_message_templates (user_id, template_name, message_template, is_default, created_at, updated_at)
    VALUES (NEW.id, 'Padrão', template_text, true, now(), now());
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger para garantir o template em novos usuários
DROP TRIGGER IF EXISTS trg_ensure_default_whatsapp_template ON public.user_profiles;
CREATE TRIGGER trg_ensure_default_whatsapp_template
AFTER INSERT ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.ensure_default_whatsapp_template();

COMMIT;