-- Atualizar template de mensagem WhatsApp para remover detalhes de parcelas
UPDATE whatsapp_message_templates
SET message_template = '📱 *{nome_empresa}*

*Aparelho:* {modelo_dispositivo}
*Serviço:* {nome_reparo}

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão

{qualidades_fim}
*📦 Serviços Inclusos:*
{servicos_inclusos}

🚫 Não cobre danos por água ou molhado

📝 *Observações*
{observacoes}

📅 Válido até: {data_validade}',
updated_at = now()
WHERE message_template LIKE '%{peca_parcelas}x de {peca_valor_parcela}%';