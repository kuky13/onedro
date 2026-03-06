

## Plano: IA do WhatsApp — Detectar duplicatas, atualizar ao invés de criar, e relatar alterações

### Situação Atual

A função `whatsapp-zapi-orcamentos` já tem um `findBudgetToReplace` que busca orçamentos duplicados, mas:
1. Só busca dentro de uma **janela de 24h** (`windowStartIso`)
2. Exige que `issue` e `part_quality` sejam idênticos para detectar duplicata
3. Quando atualiza, **não diferencia** o que mudou — não gera resumo
4. A mensagem de confirmação (`getBudgetGroupConfirmation`) é genérica ("Prontinho! Salvo.") e não menciona se foi atualização ou criação

### Mudanças Planejadas

#### 1. Expandir `findBudgetToReplace` (whatsapp-zapi-orcamentos/index.ts)
- **Remover a janela de 24h** — buscar qualquer orçamento pendente do mesmo owner, client_phone, device_model e part_quality (sem filtro temporal rígido)
- **Relaxar o filtro de `issue`** — buscar por device_model + part_quality + client_phone, aceitando issue diferente (pois o serviço pode ter mudado ligeiramente)

#### 2. Na atualização, sempre renovar a validade (valid_until / expires_at)
- Recalcular `valid_until` e `expires_at` com base na data atual + `defaultValidityDays` — já acontece pois `baseBudgetData` inclui isso, mas garantir que o update explícito aplica esses campos

#### 3. Gerar resumo breve das alterações (~150 chars max)
- Após detectar orçamento existente, comparar campos-chave (preço, qualidade, issue, validade) entre o existente e os novos dados
- Montar uma string curta tipo: `"Atualizado: preço R$120→R$150, validade renovada até 21/03"` (max 150 chars)

#### 4. Atualizar `getBudgetGroupConfirmation` em `_shared/ai-messages.ts`
- Adicionar nova função `getBudgetUpdateConfirmation(changesSummary: string)` que retorna a mensagem curta de atualização
- Alterar o fluxo no loop principal para usar essa mensagem quando `replacedCount > 0`

### Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/whatsapp-zapi-orcamentos/index.ts` | Expandir busca de duplicatas (sem janela 24h, match por device+phone+quality), gerar diff resumido, enviar mensagem diferenciada |
| `supabase/functions/_shared/ai-messages.ts` | Adicionar `getBudgetUpdateConfirmation()` para mensagens de atualização |

### Detalhes Técnicos

**Diff builder** (dentro do loop de partes, após encontrar `existingBudget`):
```text
const changes: string[] = [];
if (existingBudget.total_price !== budgetInsertData.total_price)
  changes.push(`preço ${formatCents(existingBudget.total_price)}→${formatCents(budgetInsertData.total_price)}`);
if (existingBudget.issue !== budgetInsertData.issue)
  changes.push(`serviço atualizado`);
changes.push(`validade renovada até ${validUntilStr}`);
const summary = changes.join(", ").slice(0, 150);
```

**Nova query de busca** (sem janela de 24h, match mais amplo):
```text
.eq("owner_id", ownerId)
.eq("client_phone", clientPhone)
.eq("device_model", deviceModel)
.eq("part_quality", partQuality)
.in("workflow_status", ["pending"])
.is("deleted_at", null)
.order("created_at", { ascending: false })
.limit(1)
```

**Mensagem de confirmação diferenciada**:
- Criação: mensagem atual genérica
- Atualização: `"Orçamento atualizado! {summary}"` (max ~150 chars)

