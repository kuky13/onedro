

## Plan: Links permanentes com formatted_id para compartilhamento de OS

### Problema atual
- O link de compartilhamento usa um `share_token` gerado (UUID/random) com expiração
- O QR code da etiqueta usa `/status/${order.id}` (UUID)
- Os links não são sincronizados entre si e não são amigáveis

### Solução
Mudar o sistema para usar o `formatted_id` (ex: `OS0001`) como identificador na URL, tornando o link permanente e sincronizado com o QR code.

**Nova URL**: `/share/service-order/OS0001`

### Alterações necessárias

#### 1. Nova RPC no banco de dados (migration)
Criar uma função `get_service_order_by_formatted_id` que busca a OS pelo `sequential_number` extraído do formatted_id (ex: `OS0001` -> sequential_number `1`), sem precisar de token ou expiração. A função deve:
- Receber `p_formatted_id` (string como "OS0001")
- Extrair o número sequencial
- Buscar a OS e retornar os mesmos campos que `get_service_order_by_share_token` retorna
- Criar também `get_company_info_by_formatted_id` para buscar dados da empresa

#### 2. Atualizar rota (`src/App.tsx`)
- Manter a rota `/share/service-order/:shareToken` (compatibilidade)
- O componente vai detectar se o token é um formatted_id (começa com "OS") ou um token antigo

#### 3. Atualizar `ServiceOrderPublicShare.tsx`
- Detectar se o token é um formatted_id (regex `/^OS\d+$/i`)
- Se sim, chamar a nova RPC `get_service_order_by_formatted_id`
- Se não, manter comportamento antigo com `get_service_order_by_share_token` (retrocompatibilidade)
- Mesma lógica para company info e realtime

#### 4. Atualizar `useServiceOrderShare.ts`
- `generateShareToken` passa a retornar o link baseado no formatted_id (`/share/service-order/OS0001`)
- Não precisa mais gerar token no banco -- apenas monta a URL com o `sequential_number`
- Fallback para token antigo se a OS não tiver `sequential_number`

#### 5. Atualizar `useServiceOrderRealTime.ts`
- Suportar busca por formatted_id além de share_token

#### 6. Sincronizar QR code da etiqueta (`PrintLabelDialog.tsx`)
- Linha 47: mudar `qrValue` de `/status/${order.id}` para `/share/service-order/OS${padStart(sequential_number, 4, '0')}`

#### 7. Atualizar referências auxiliares
- `ServiceOrderActions.tsx`: usar formatted_id na URL
- `useBudgetServiceOrder.ts`: `getShareUrl` com formatted_id

### Detalhes técnicos

**SQL Migration** - Nova function:
```sql
CREATE OR REPLACE FUNCTION get_service_order_by_formatted_id(p_formatted_id text)
RETURNS SETOF ... -- mesmos campos do get_service_order_by_share_token
AS $$
  -- Extrair número: 'OS0001' -> 1
  -- Buscar por sequential_number
  -- Retornar dados da OS com joins necessários
$$
```

**Formato do link**: `/share/service-order/OS` + `sequential_number.padStart(4, '0')`
- Ex: sequential_number 1 -> `OS0001`
- Ex: sequential_number 1234 -> `OS1234`
- Ex: sequential_number 12345 -> `OS12345` (sem truncar)

