UPDATE public.whatsapp_message_templates
SET
  message_template = $$
{nome_empresa}

📱 *Aparelho:* {modelo_dispositivo}
📋 *Serviço:* {nome_reparo}

{qualidades_inicio}
*{qualidade_nome}* / *Garantia:* {peca_garantia_meses} meses

*Parcelado:* {peca_preco_parcelado} em até {peca_parcelas}x no cartão de crédito
*À vista:* {peca_preco_vista} (Pix ou Dinheiro)
{qualidades_fim}

*📦 Serviços Inclusos:*
{servicos_inclusos}

📝 *Observações:*
{observacoes}

📅 *Orçamento válido até:* {data_validade}
$$,
  updated_at = NOW()
WHERE is_default = TRUE;

