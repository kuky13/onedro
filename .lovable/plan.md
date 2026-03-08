

## Diagnóstico

O problema está na lógica de busca em `ServiceOrderPublicShare.tsx` (linhas 247-267):

1. Quando o link tem `?id={uuid}`, o código tenta buscar direto na tabela `service_orders`
2. Como o usuário público **não está autenticado**, o RLS bloqueia o acesso — mas `.maybeSingle()` retorna `data: null` sem erro
3. O fallback para a RPC só é acionado quando há **erro** (`soError`), mas neste caso não há erro, apenas `data = null`
4. Resultado: `serviceOrderData = [null]` → vira `[]` → "Ordem não encontrada"

A RPC `get_service_order_by_formatted_id` é `SECURITY DEFINER` e **funciona** para acesso público, mas nunca é chamada neste fluxo.

## Correção

**Arquivo: `src/components/ServiceOrderPublicShare.tsx`** (função `loadData`, bloco `if (directId)`)

Alterar a lógica para: quando `directId` está presente **e** o token é um formatted ID, usar a RPC `get_service_order_by_formatted_id` como método primário (já que ela é SECURITY DEFINER e bypassa RLS). Depois, filtrar o resultado pelo `directId` para garantir que retorna a OS correta (eliminando ambiguidade do sequential_number).

Lógica corrigida:
```
if (directId && tokenIsFormattedId) {
  // Use RPC (SECURITY DEFINER) and filter by UUID
  → call get_service_order_by_formatted_id(token)
  → filter results where id === directId
} else if (directId) {
  // Direct UUID only (no formatted ID) - try table, fallback RPC
  → existing logic
} else if (tokenIsFormattedId) {
  // Legacy formatted ID without UUID
  → existing RPC call
} else {
  // Legacy share token
  → existing logic
}
```

Mesma correção para a busca de `company_info`: quando temos `directId` + `tokenIsFormattedId`, usar a RPC `get_company_info_by_formatted_id` em vez de query direta.

**Arquivo: `src/hooks/useServiceOrderRealTime.ts`** — verificar se o mesmo padrão de fallback é necessário para o polling em tempo real.

