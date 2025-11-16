-- Padronizar bloco de garantia em linha única e normalizar formatos antigos
BEGIN;

UPDATE public.whatsapp_message_templates AS t
SET message_template = regexp_replace(
  t.message_template,
  E'(\n[[:space:]]*🚫[^\n]*\n?)',
  E'\n🛡 Garantia de até {garantia_meses} meses\n\n\\1'
);

-- Converter bloco antigo de duas linhas para o formato único
UPDATE public.whatsapp_message_templates AS t
SET message_template = regexp_replace(
  t.message_template,
  E'\n[[:space:]]*🛡️?[[:space:]]*Garantia[[:space:]]*\n[[:space:]]*Garantia até[[:space:]]*\\*?\\{garantia_meses\\}\\*?[[:space:]]*meses',
  E'\n🛡 Garantia de até {garantia_meses} meses',
  'gi'
);

-- Converter formato antigo em linha única com "🛡️ Garantia até" para o novo padrão
UPDATE public.whatsapp_message_templates AS t
SET message_template = regexp_replace(
  t.message_template,
  E'🛡️?[[:space:]]*Garantia até[[:space:]]*\\*?\\{garantia_meses\\}\\*?[[:space:]]*meses',
  E'🛡 Garantia de até {garantia_meses} meses',
  'gi'
);

COMMIT;