

## Diagnóstico

O problema está na função `findBudgetToReplace` (linha 1787). A busca principal (linha 1799) **só executa quando `clientPhone` não é null**:

```
if (clientPhone) {  // ← Se null, pula toda a busca principal!
  const { data: directMatch } = await supabase
    .from("budgets")
    .eq("client_phone", clientPhone)
    ...
```

Em mensagens de grupo WhatsApp (`@g.us`), o `client_phone` frequentemente é `null` porque o JID do grupo é rejeitado por `normalizePotentialCustomerPhone`. Resultado: a busca principal é pulada, o fallback por `chatId` nos logs também falha (ou não encontra match de `part_quality`), e a função **cria novos orçamentos** ao invés de atualizar os existentes.

## Solução

Adicionar uma busca alternativa quando `clientPhone` é null, usando apenas `owner_id + device_model + part_quality + workflow_status=pending`. Também adicionar uma busca por `client_name` como fallback adicional.

### Arquivo: `supabase/functions/whatsapp-zapi-orcamentos/index.ts`

**Alteração na `findBudgetToReplace`** (~linha 1787-1843):

1. Manter a busca por `client_phone` quando disponível (como está)
2. **Adicionar busca sem `client_phone`**: quando `clientPhone` é null OU a busca por phone não encontrou nada, buscar por `owner_id + device_model + part_quality + pending` sem filtrar por phone — isso cobre mensagens de grupo
3. Adicionar parâmetro `clientName` à função e usá-lo como filtro adicional na busca sem phone para evitar falsos positivos

```text
Fluxo revisado:
1. Busca por phone + device + quality (como hoje)
2. SE não encontrou → Busca por owner + device + quality + client_name (NOVO)
3. SE não encontrou → Busca por owner + device + quality apenas (NOVO)  
4. SE não encontrou → Fallback por chatId nos logs (como hoje)
```

Isso garante que mesmo em grupos (onde `client_phone` é null), orçamentos existentes do mesmo dispositivo/qualidade serão encontrados e atualizados.

### Também: passar `client_name` no call site (~linha 1882)

Adicionar `clientName: client_name` na chamada a `findBudgetToReplace`.

