

## Plano: 3 Melhorias no /worm

### 1. Mover código OR para não cortar o nome do dispositivo

**Problema**: Na listagem `/worm`, o badge `OR: 0090` está na mesma linha do nome do dispositivo (linha 274-281 de `WormBudgetList.tsx`), causando truncamento em nomes longos de dispositivos móveis.

**Solução**: Mover o badge OR para uma linha separada abaixo do nome do dispositivo, junto com o texto de tipo/contagem.

**Arquivo**: `src/components/worm/WormBudgetList.tsx` (~linhas 272-286)
- Remover o `<Badge>` OR de dentro do `flex items-center` do título
- Adicionar o OR code na linha de subtítulo (`<p>` abaixo), ficando: `"Celular • OR: 0090 • 3 orçamento(s) • Último em ..."`

### 2. Cancelar na edição deve funcionar + IA não deve preencher "Cliente WhatsApp"

**Problema A**: O botão Cancelar em `/worm/edit/:id` chama `onCancel` que é `() => navigate('/worm')` — isso já deveria funcionar. Vou verificar se há algo impedindo a navegação (o form pode estar bloqueando com dirty state). O `onCancel` está correto no `WormAIBudgetEditPage` (linha 60). Possível causa: o botão tem `text-white` que pode torná-lo invisível em tema claro, mas funcionalidade deveria estar ok.

**Problema B**: A IA do WhatsApp define `client_name = "Cliente WhatsApp"` quando não encontra cliente (linha 1639 do edge function). A tabela `clients` tem coluna `is_default`. Em vez de "Cliente WhatsApp", a IA deve buscar o cliente padrão do usuário (`is_default = true`).

**Arquivos**:
- `supabase/functions/whatsapp-zapi-orcamentos/index.ts` (~linha 1639): Antes de usar fallback "Cliente WhatsApp", buscar cliente com `is_default = true` e `user_id = ownerId`. Se encontrar, usar seu `id`, `name` e `phone`.
- `src/components/worm/WormBudgetForm.tsx` (linha 689): Corrigir cor do botão cancelar — remover `text-white` que pode estar invisível em tema claro.

### 3. Pesquisa mais inteligente

**Problema**: O filtro de busca (linha 93 de `WormBudgetList.tsx`) só busca por `client_name`, `device_model`, `device_type` e `sequential_number`. Não busca por `part_quality`, `issue`, preço, etc.

**Solução**: Expandir o filtro para incluir `part_quality`, `issue`, `notes`, `custom_services` e busca por número de OR com/sem zeros.

**Arquivo**: `src/components/worm/WormBudgetList.tsx` (~linha 93)
- Adicionar ao filtro: `budget.part_quality?.toLowerCase().includes(searchLower)`, `budget.issue?.toLowerCase().includes(searchLower)`, `budget.notes?.toLowerCase().includes(searchLower)`

### Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/components/worm/WormBudgetList.tsx` | Mover badge OR para subtítulo; expandir filtro de busca |
| `src/components/worm/WormBudgetForm.tsx` | Corrigir cor do botão Cancelar |
| `supabase/functions/whatsapp-zapi-orcamentos/index.ts` | Buscar cliente padrão (`is_default`) ao invés de "Cliente WhatsApp" |

