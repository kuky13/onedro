

## Problema: Edge Function `template-utils.ts` ainda usa heurística quebrada

O fix anterior corrigiu **apenas o lado do cliente** (`src/utils/whatsappTemplateUtils.ts`), mas a **edge function** `supabase/functions/chat-ai/utils/template-utils.ts` — que é quem formata os orçamentos para a Drippy no chat — **ainda usa a heurística `>= 10000`**.

### Dados reais do orçamento Honnor X7B no banco:
- `cash_price`: 28000 (centavos = R$ 280,00)
- `installment_price`: 7750 (centavos = R$ 77,50 por parcela)
- `installments`: 4
- Total no cartão esperado: 7750 × 4 = 31000 centavos = **R$ 310,00**

### O que acontece hoje:
```
formatSmart(7750) → 7750 < 10000 → formatCurrencyFromReais(7750) → "R$ 7750,00" ❌
```

Deveria ser:
```
formatSmart(7750) → formatCurrency(7750) → 7750/100 → "R$ 77,50"
```

E o total no cartão: `formatSmart(31000) → formatCurrency(31000) → "R$ 310,00"` ✅

### Correções necessárias

**Arquivo: `supabase/functions/chat-ai/utils/template-utils.ts`**

1. **Linha 78-82**: Remover heurística do `formatSmart`, sempre usar `formatCurrency` (dividir por 100):
```typescript
function formatSmart(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return "R$ 0,00";
  return formatCurrency(value); // Sempre centavos
}
```

2. **Linhas 216-219**: Corrigir conversão de valores das peças no bloco `{qualidades_inicio}`:
```typescript
const cashInReais = partPrice / 100;
const installmentInReais = (partInstallmentPrice || partPrice) / 100;
```

3. **Linhas 229-230**: Atualizar `formatCurrencyFromReais(cashInReais)` → usar os valores já convertidos corretamente com `formatCurrencyFromReais`.

4. **Linhas 261-262**: Corrigir `{preco_vista}` e `{preco_parcelado}` globais — `{preco_parcelado}` deve mostrar o **total no cartão** (installment_price × installments ÷ 100).

### Detalhes de implementação

O `generateWhatsAppMessageFromTemplate` na edge function precisa:
- `formatSmart` → sempre `formatCurrency(v)` (centavos → reais)
- No bloco de peças: remover `partPrice >= 10000` check, sempre dividir por 100
- `{preco_parcelado}` global: calcular como `installmentPrice * installments` quando `ip <= cashPrice` (valor por parcela × nº parcelas = total no cartão)

### Deploy
Após editar, fazer deploy da edge function `chat-ai` e testar.

