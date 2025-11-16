-- Atualizar todos os templates existentes para usar o novo formato com sistema de blocos 
UPDATE whatsapp_message_templates 
SET message_template = '📱 *{nome_empresa}* 

*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{qualidades_inicio}*{qualidade_nome}* – {peca_garantia_meses} meses de garantia 
💰 À vista {peca_preco_vista} | no cartão (crédito) {peca_preco_parcelado} {peca_parcelas}x de {peca_valor_parcela} 

{qualidades_fim} 
*📦 Serviços Inclusos:* 
{servicos_inclusos} 

🚫 Não cobre danos por água ou molhado 

📝 *Observações:* 
{observacoes} 

📅 Válido até: {data_validade}', 
    updated_at = now()