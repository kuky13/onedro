

## Correção: Valores financeiros exibidos sem conversão de centavos

### Problema
Os valores no banco são armazenados em **centavos** (ex: 1500 = R$ 15,00), mas o componente `ServiceOrderPublicShare.tsx` exibe o valor bruto sem dividir por 100, mostrando R$ 15.000,00 ao invés de R$ 15,00 (ou R$ 1.500,00 para 150000 centavos).

### Correção
Em `src/components/ServiceOrderPublicShare.tsx`, nas **duas** ocorrências de `format(serviceOrder.total_price)`:
- Linha ~494: trocar para `format(serviceOrder.total_price / 100)`
- Linha ~617: trocar para `format(serviceOrder.total_price / 100)`

Também verificar `labor_cost` e `parts_cost` se exibidos — mesma lógica.

Alteração mínima, dois pontos no mesmo arquivo.

