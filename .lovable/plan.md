

## Problema Identificado

O `sequential_number` **nao e unico globalmente** -- ele e unico por loja/owner. Existem **5 ordens de servico** com `sequential_number = 4` de donos diferentes:

```text
owner (email)                          | total_price | id
oliveira@onedrip.email                 | 30000.00    | 34285cf0...
joabesilva15333@gmail.com              | 190.00      | 23d86962...  <-- retornado pelo RPC
gabrielborges...@gmail.com             | 30.00       | d54c0c7e...
oliveira2@onedrip.email                | 765.00      | d2c7d186...  <-- o correto
(outro)                                | 250.00      | 1c7f0b34...
```

A RPC `get_service_order_by_formatted_id` filtra apenas por `WHERE sequential_number = v_seq_number` sem contexto de owner, retornando a OS errada.

---

## Solucao: Incluir owner_id no link via query param

A abordagem mais simples e backward-compatible:

### 1. Alterar a geracao do QR Code/link (PrintLabelDialog.tsx)

Incluir um parametro `oid` (owner_id curto, primeiros 8 chars) na URL:

```
/share/service-order/OS0004?oid=49e47da5
```

O `order` ja tem acesso ao `owner_id` ou podemos usar o usuario logado.

### 2. Atualizar a RPC `get_service_order_by_formatted_id`

Adicionar parametro opcional `p_owner_id uuid DEFAULT NULL` e filtrar:

```sql
WHERE so.sequential_number = v_seq_number
  AND (p_owner_id IS NULL OR so.owner_id = p_owner_id)
```

Se `p_owner_id` for NULL (links antigos), retorna como antes. Se presente, filtra corretamente.

### 3. Atualizar ServiceOrderPublicShare.tsx

- Extrair `oid` da query string da URL
- Buscar o `owner_id` completo fazendo match pelo prefixo (nova RPC simples ou incluir logica no RPC existente)
- Passar para a RPC

### 4. Atualizar a RPC `get_company_info_by_formatted_id`

Mesma logica: aceitar `p_owner_id` opcional para filtrar corretamente.

### 5. Atualizar useServiceOrderRealTime.ts

Passar o owner_id tambem no polling/realtime para manter consistencia.

---

## Alternativa mais simples (recomendada)

Em vez de owner_id parcial (que exige match por prefixo), usar o **UUID completo** do service order como fallback no link:

```
/share/service-order/OS0004?id=d2c7d186-57c2-4923-b312-8f2d9912d9f7
```

O frontend, ao detectar o param `id`, busca diretamente por UUID (query simples, sem ambiguidade). Se nao tiver `id`, usa o RPC atual como fallback.

Isso e:
- 100% backward-compatible (links antigos continuam funcionando, mesmo que ambiguos)
- Links novos sao sempre precisos
- Minima mudanca no codigo

### Arquivos a alterar:
1. **`src/components/printing/PrintLabelDialog.tsx`** -- adicionar `?id={order.id}` na URL do QR
2. **`src/components/ServiceOrderPublicShare.tsx`** -- ler `id` da query string; se presente, buscar por UUID diretamente em vez de usar a RPC por formatted_id
3. **`src/hooks/useServiceOrderRealTime.ts`** -- mesmo ajuste para o polling
4. **Migration SQL** -- atualizar RPC para aceitar `p_owner_id` opcional (para quem nao tem `?id=`)

