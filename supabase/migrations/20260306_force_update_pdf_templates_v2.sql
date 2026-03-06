-- Force update ALL PDF templates to include {endereco} variable
-- This updates both the global default template and all user-specific templates
-- including those that users might have customized, as per "quero tds msm os q ja mudaram"

UPDATE public.pdf_templates
SET service_section_template = '{nome_empresa} 
{endereco}
{num_or} 
{telefone_contato} 
Aparelho:{modelo_dispositivo} 
Serviço: {nome_reparo} 

{qualidades_inicio}{qualidade_nome} – {peca_garantia_meses} meses de garantia 
À vista {peca_preco_vista} ou {peca_preco_parcelado} no cartão em até {peca_parcelas}x de {peca_valor_parcela} no cartão 

{qualidades_fim} 
Observações: {observacoes} 

Valido até {data_validade}';
