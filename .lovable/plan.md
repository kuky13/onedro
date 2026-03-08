

## Diagnóstico

Dois problemas encontrados:

### 1. RPC `get_company_info_by_formatted_id` retorna apenas 4 campos
A RPC no banco só retorna `name, logo_url, address, whatsapp_phone`. Mas o componente espera também `email, cnpj, website, description, business_hours`. Resultado: header mostra nome/logo mas o card de contato fica sem email, CNPJ, website, horário.

### 2. RPC pega o owner errado para OS com formatted_id duplicado
A RPC faz `LIMIT 1` na tabela `service_orders` sem filtrar pelo `directId` (UUID). Para OS0006 que tem 4 donos diferentes, retorna company_info do dono errado.

## Plano

### 1. Criar nova RPC `get_public_company_info` (Migration SQL)

Nova função SECURITY DEFINER que recebe `p_owner_id uuid` e retorna TODOS os campos:
- `id, name, logo_url, address, whatsapp_phone, email, cnpj, website, description, business_hours`

Isso resolve ambos os problemas: retorna todos os campos e usa o `owner_id` correto da OS já carregada.

### 2. Atualizar `ServiceOrderPublicShare.tsx`

Simplificar a lógica de busca de company info: após obter a service order (que inclui `owner_id`), chamar a nova RPC `get_public_company_info(owner_id)` em todos os cenários. Remover a lógica condicional complexa de 4 branches.

```
// Após obter serviceOrderData:
const ownerId = serviceOrderData[0]?.owner_id;
if (ownerId) {
  const { data } = await supabase.rpc('get_public_company_info', { p_owner_id: ownerId });
  // set company info with all fields
}
```

### Arquivos alterados
- **Migration SQL**: criar `get_public_company_info(p_owner_id uuid)`
- **`src/components/ServiceOrderPublicShare.tsx`**: simplificar fetch de company info

