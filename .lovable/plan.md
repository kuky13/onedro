

## Plano: 3 Correções no /worm

### 1. Valores errados nos detalhes expandidos

**Causa raiz**: As peças (`budget_parts`) são salvas em **centavos** (linha 69 de `useBudgetParts.ts`: `Math.round(part.price * 100)`), mas nos detalhes expandidos do card (linha 342 de `WormBudgetCard.tsx`) usa-se `formatCurrencyFromReais()` que trata o valor como **reais**. Resultado: R$ 260 vira R$ 26.000.

**Correção** em `WormBudgetCard.tsx` (linhas 339-352): Trocar `formatCurrencyFromReais(cashTotal)` por `formatCurrency(cashTotal)` e `formatCurrencyFromReais(installmentTotal)` por `formatCurrency(installmentTotal)`.

### 2. Nome do modelo cortado (truncate)

**Causa**: Linha 276 tem classe `truncate` no `<h3>` do nome do dispositivo.

**Correção** em `WormBudgetList.tsx` (linha 276): Trocar `truncate` por `break-words` para que o texto quebre em vez de cortar.

### 3. Botão de pesquisar + placeholder atualizado

**Correção** em `WormBudgetSearch.tsx`:
- Adicionar um `<Button>` de pesquisa ao lado do input (dentro do form, type="submit")
- Atualizar o placeholder para refletir a busca ampla: "Buscar por cliente, modelo, OR, peça, serviço..."
- Quando há inputValue, mostrar o botão de pesquisar no lugar do X (ou ao lado)

