

## Problema

Cada orçamento individual mostra seu próprio "OR: 0012", "OR: 0013", etc. O usuário quer que exista **uma única OR por grupo de dispositivo** — ou seja, o "OR: 0001" aparece no nível do grupo "Xiaomi Redmi Note 12 4G", não em cada orçamento individual.

## Entendimento

- Grupo "Xiaomi Redmi Note 12 4G" → **OR: 0001** (no header do grupo)
- Grupo "iPhone 14 Pro Max" → **OR: 0002**
- Os orçamentos individuais dentro de cada grupo **não mostram OR** — são diferenciados pela qualidade da peça (Original Nacional, Incel, etc.)

## Plano

### 1. Atribuir um sequential_number por grupo de dispositivo (não por orçamento)

Atualmente o `sequential_number` é por orçamento. A nova lógica seria: todos os orçamentos do **mesmo device_model** compartilham o **mesmo sequential_number**.

**Migration SQL:**
- Renumerar todos os budgets para que orçamentos do mesmo `(owner_id, device_model)` tenham o **mesmo** `sequential_number`
- Usar `DENSE_RANK() OVER (PARTITION BY owner_id ORDER BY MIN(created_at) ASC)` agrupado por `device_model`
- Remover o unique index atual e criar um novo que reflita essa lógica

### 2. Edge Functions — Criar budget com sequential por device_model

Alterar `_shared/create-budget.ts` e `chat-ai/modules/create-budget.ts`:
- Ao criar um novo orçamento, verificar se já existe algum budget para aquele `(owner_id, device_model)`
- Se sim, reutilizar o mesmo `sequential_number`
- Se não, pegar o MAX sequential do owner e incrementar

### 3. UI — Mover OR do card para o header do grupo

**`WormBudgetCard.tsx`:** Remover a exibição "OR: XXXX" do card individual. Substituir por informação da qualidade/peça ou simplesmente remover.

**`WormBudgetList.tsx`:** Adicionar "OR: XXXX" no header do grupo de dispositivo, usando o `sequential_number` do primeiro orçamento do grupo (todos terão o mesmo).

### 4. Outros arquivos que referenciam OR

- `WormBudgetForm.tsx` — manter OR no form de edição
- `WormBudgetActions.tsx` — manter para nome do PDF
- `wormChatIntegration.ts` — manter referências ao sequential_number (agora é por device)

### Arquivos modificados
| Arquivo | Alteração |
|---|---|
| Nova migration SQL | Renumerar sequential_number por (owner_id, device_model) com DENSE_RANK |
| `supabase/functions/_shared/create-budget.ts` | Reutilizar sequential se device_model já existe |
| `supabase/functions/chat-ai/modules/create-budget.ts` | Idem |
| `src/components/worm/WormBudgetList.tsx` | Mostrar OR: no header do grupo |
| `src/components/worm/WormBudgetCard.tsx` | Remover OR: do card individual |

