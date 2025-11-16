-- Adicionar campos de termos de garantia à tabela company_info
-- Data: 2025-01-27
-- Descrição: Adiciona campos para armazenar termos de cancelamento e Lembretes da garantia

ALTER TABLE public.company_info 
ADD COLUMN IF NOT EXISTS warranty_cancellation_terms TEXT DEFAULT 'A GARANTIA É CANCELADA AUTOMATICAMENTE NOS SEGUINTES CASOS: 
Em ocasião de quedas, esmagamentos, sobrecarga elétrica; exposição do aparelho a altas temperaturas, umidade ou 
líquidos; exposição do aparelho a poeira, pó e/ou limalha de metais, ou ainda quando constatado mau uso do aparelho, 
instalações, modificações ou atualizações no seu sistema operacional; abertura do equipamento ou tentativa de conserto 
deste por terceiros que não sejam os técnicos da NOMEDALOJA, mesmo que para realização de outros serviços; bem como 
a violação do selo/lacre de garantia colocado pela NOMEDALOJA.',

ADD COLUMN IF NOT EXISTS warranty_legal_reminders TEXT DEFAULT 'Vale lembrar que: 
1) A GARANTIA DE 90 (NOVENTA) dias está de acordo com o artigo 26 inciso II do código de defesa do 
consumidor. 
2) Funcionamento, instalação e atualização de aplicativos, bem como o sistema operacional do aparelho NÃO FAZEM 
parte desta garantia. 
3) Limpeza e conservação do aparelho NÃO FAZEM parte desta garantia. 
4) A não apresentação de documento (nota fiscal ou este termo) que comprove o serviço INVÁLIDA a garantia. 
5) Qualquer mal funcionamento APÓS ATUALIZAÇÕES do sistema operacional ou aplicativos NÃO FAZEM PARTE 
DESSA GARANTIA. 
6) A GARANTIA é válida somente para o item ou serviço descrito na nota fiscal, ordem de serviço ou neste termo 
de garantia, NÃO ABRANGENDO OUTRAS PARTES e respeitando as condições aqui descritas.',

ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- Comentários para documentação
COMMENT ON COLUMN company_info.warranty_cancellation_terms IS 'Termos e condições que cancelam a garantia automaticamente';
COMMENT ON COLUMN company_info.warranty_legal_reminders IS 'Lembretes sobre direitos do consumidor e limitações da garantia';
COMMENT ON COLUMN company_info.cnpj IS 'CNPJ da empresa para documentos formais';

-- Atualizar registros existentes que não possuem os termos
UPDATE public.company_info 
SET warranty_cancellation_terms = 'A GARANTIA É CANCELADA AUTOMATICAMENTE NOS SEGUINTES CASOS: 
Em ocasião de quedas, esmagamentos, sobrecarga elétrica; exposição do aparelho a altas temperaturas, umidade ou 
líquidos; exposição do aparelho a poeira, pó e/ou limalha de metais, ou ainda quando constatado mau uso do aparelho, 
instalações, modificações ou atualizações no seu sistema operacional; abertura do equipamento ou tentativa de conserto 
deste por terceiros que não sejam os técnicos da NOMEDALOJA, mesmo que para realização de outros serviços; bem como 
a violação do selo/lacre de garantia colocado pela NOMEDALOJA.'
WHERE warranty_cancellation_terms IS NULL;

UPDATE public.company_info 
SET warranty_legal_reminders = 'Vale lembrar que: 
1) A GARANTIA DE 90 (NOVENTA) dias está de acordo com o artigo 26 inciso II do código de defesa do 
consumidor. 
2) Funcionamento, instalação e atualização de aplicativos, bem como o sistema operacional do aparelho NÃO FAZEM 
parte desta garantia. 
3) Limpeza e conservação do aparelho NÃO FAZEM parte desta garantia. 
4) A não apresentação de documento (nota fiscal ou este termo) que comprove o serviço INVÁLIDA a garantia. 
5) Qualquer mal funcionamento APÓS ATUALIZAÇÕES do sistema operacional ou aplicativos NÃO FAZEM PARTE 
DESSA GARANTIA. 
6) A GARANTIA é válida somente para o item ou serviço descrito na nota fiscal, ordem de serviço ou neste termo 
de garantia, NÃO ABRANGENDO OUTRAS PARTES e respeitando as condições aqui descritas.'
WHERE warranty_legal_reminders IS NULL;