

## Análise do Sistema de Contagem de Orçamentos

### Situação atual
- `sequential_number` é um contador global por `owner_id` (usuário). Ex: o primeiro orçamento do usuário é 0001, o segundo 0002, independente do dispositivo.
- 61 orçamentos ativos no banco, distribuídos entre vários modelos (Redmi Note 11 Pro 5G com 6, iPhone 14 Pro Max com 4, etc.)

### O que o usuário quer
Numeração **por dispositivo (device_model)**: cada modelo tem sua própria sequência. Ex:
- Xiaomi Redmi Note 12 4G → OR: 0001, OR: 0002, OR: 0003
- iPhone 14 → OR: 0001, OR: 0002, OR: 0003, OR: 0004
- Samsung A52 → OR: 0001, OR: 0002, OR: 0003

### Plano de implementação

**1. Migration SQL — Renumerar todos os orçamentos existentes**
- UPDATE em batch usando `ROW_NUMBER() OVER (PARTITION BY owner_id, device_model ORDER BY created_at ASC)` para atribuir novo `sequential_number` por dispositivo.

**2. Edge Function `_shared/create-budget.ts`**
- Alterar a query de busca do max sequential para filtrar também por `device_model`:
  ```
  .eq('owner_id', userId)
  .eq('device_model', params.device_model)  // NOVO
  ```

**3. Edge Function `chat-ai/modules/create-budget.ts`**
- Mesma alteração: adicionar filtro por `device_model` na busca do próximo sequencial.

**4. Exibição na UI — sem alteração estrutural**
- O formato `OR: 0001` já é usado em todos os componentes. A diferença é que agora o mesmo número pode existir para dispositivos diferentes. A busca por número na lista (`WormBudgetList`) já mostra o device_model junto, então não há ambiguidade visual.

**5. Consideração sobre busca por número sequencial**
- Na busca do chat-ai e do WormBudgetList, a busca por `sequential_number` pode retornar múltiplos resultados (um por device). Isso é aceitável pois o device_model aparece no resultado. Nenhuma alteração necessária.

### Arquivos modificados
| Arquivo | Alteração |
|---|---|
| Nova migration SQL | Renumerar todos os budgets por (owner_id, device_model, created_at) |
| `supabase/functions/_shared/create-budget.ts` | Adicionar `.eq('device_model', ...)` na query do sequencial |
| `supabase/functions/chat-ai/modules/create-budget.ts` | Idem |

