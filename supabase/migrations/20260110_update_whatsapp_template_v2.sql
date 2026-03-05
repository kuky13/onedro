-- Migration to update WhatsApp default template
-- Created automatically to resolve missing data in generated messages

UPDATE whatsapp_message_templates
SET message_template = '📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} 

{qualidades_fim}*📦 Serviços Inclusos:* 
{servicos_inclusos} 
🚫 Não cobre danos por água ou molhado 
📅 Válido até: {data_validade}'
WHERE is_default = true;
