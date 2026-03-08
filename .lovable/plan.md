

## Problema

A atualização em tempo real nos links públicos **não funciona** porque:

1. **Supabase Realtime (postgres_changes)** respeita RLS — usuários anônimos não recebem eventos
2. O hook `useServiceOrderRealTime` usa query direta na tabela `service_orders` quando recebe `serviceOrderId` (linha 100-131), que é bloqueada por RLS
3. O polling também falha pelo mesmo motivo — usa a tabela diretamente

Como a RPC `get_service_order_by_formatted_id` é `SECURITY DEFINER` e funciona para anônimos, a solução é fazer o polling usar essa RPC.

## Plano

### 1. Adicionar opção `directId` + `formattedId` ao hook `useServiceOrderRealTime`

Alterar a interface `UseServiceOrderRealTimeOptions` para aceitar ambos simultaneamente. Quando `formattedId` e `serviceOrderId` estão presentes, o `queryFn` deve:
- Chamar a RPC `get_service_order_by_formatted_id` (bypassa RLS)
- Filtrar o resultado pelo `serviceOrderId` (UUID)

### 2. Atualizar `realtimeOptions` em `ServiceOrderPublicShare.tsx`

Quando `directId` + `tokenIsFormattedId`, passar ambos:
```
{ formattedId: token, serviceOrderId: directId, enablePolling: true }
```

### 3. Ajustar `serviceOrderQuery` no hook

Nova lógica na `queryFn`:
```
if (formattedId && serviceOrderId) {
  // RPC + filter by UUID (public access)
  rpc('get_service_order_by_formatted_id', { p_formatted_id: formattedId })
  → filter where id === serviceOrderId
} else if (formattedId) {
  // existing RPC logic
} else if (serviceOrderId) {
  // existing direct table logic (authenticated users)
}
```

### 4. Reduzir polling interval para links públicos

Mudar de 30s para 15s para dar sensação de "tempo real" via polling, já que websocket não funciona para anônimos.

### 5. Desabilitar websocket subscription para acesso público

Quando o acesso é via RPC pública (formattedId presente), pular `setupRealTimeSubscription` e ir direto para polling, evitando erros no console.

### Arquivos alterados
- `src/hooks/useServiceOrderRealTime.ts`
- `src/components/ServiceOrderPublicShare.tsx`

