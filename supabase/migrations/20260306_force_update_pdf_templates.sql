-- Atualiza o template de PDF para TODOS os usuários e templates existentes
-- Sobrescreve personalizações anteriores conforme solicitado
UPDATE public.pdf_templates
SET service_section_template = '{nome_empresa} 
{num_or} 
{telefone_contato} 
Aparelho:{modelo_dispositivo} 
Serviço: {nome_reparo} 

{qualidades_inicio}{qualidade_nome} – {peca_garantia_meses} meses de garantia 
À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} no cartão 

{qualidades_fim} 
Observações: {observacoes} 

Valido até {data_validade}';
