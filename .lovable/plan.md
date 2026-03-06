

## Problema

O badge "Antigo (51d)" é calculado com base na **data de criação** (`created_at`) — linha 146:

```ts
const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
const isOld = isWarningEnabled && daysOld >= warningDays;
```

Quando a IA do WhatsApp atualiza a validade do orçamento, o `created_at` continua o mesmo (antigo), então o badge "Antigo" aparece mesmo que a validade tenha sido renovada. Resultado: mostra "Restam 14 dias" E "Antigo (51d)" ao mesmo tempo — contraditório.

## Solução

Alterar a lógica do "Antigo" no `WormBudgetCard.tsx` (linhas 144-147):

- Se o orçamento tem `valid_until`/`expires_at` e essa data ainda está no futuro → **nunca** mostrar "Antigo" (a validade foi renovada)
- Só mostrar "Antigo" quando:
  - Não tem data de validade E `created_at` é antigo, OU
  - A data de validade já expirou

Isso resolve a contradição: se "Restam X dias" aparece, "Antigo" jamais aparecerá junto.

### Arquivo: `src/components/worm/WormBudgetCard.tsx` (~linhas 144-147)

Substituir o cálculo de `isOld` por:

```ts
const createdDate = new Date(budget.created_at);
const daysOld = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
const hasValidFutureExpiry = expiryDate && expiryDate.getTime() > now.getTime();
const isOld = isWarningEnabled && daysOld >= warningDays && !hasValidFutureExpiry;
```

Uma linha adicionada. Se a validade foi renovada (futuro), `isOld` é `false`.

