-- Set global default WhatsApp template for all users

DO $$
BEGIN
  -- Apagar TODOS os templates existentes
  DELETE FROM public.whatsapp_message_templates;

  -- Inserir template padrão com placeholders para todos os usuários
  INSERT INTO public.whatsapp_message_templates (user_id, template_name, message_template, is_default, created_at, updated_at)
  SELECT u.id,
         'Template Padrão',
         '📱{nome_empresa} 
*Aparelho:* {modelo_dispositivo} 
*Serviço:* {nome_reparo} 

{inicio_pecas} 
*{qualidade_peca}* – {garantia_meses} meses de garantia 
💰 {preco_vista} | {preco_parcelado} ({num_parcelas}x {valor_parcela}) 

{fim_pecas} 

*📦 Serviços Inclusos:* 
{servicos_inclusos} 

*🛡️ Garantia até {garantia_meses} meses* 
*🚫 Não cobre danos por água ou molhado* 

*📝 Observações:* 
{observacoes} 

*📅 Válido até: {data_validade}*',
         true,
         now(),
         now()
  FROM auth.users u;
END $$;