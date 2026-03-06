

## Plano: Corrigir navegação em /worm/edit e adicionar botão voltar

### Problema
1. Não há botão de voltar no topo da página `/worm/edit/:id`
2. Ao clicar "Cancelar" ou "Voltar para os orçamentos", a navegação para `/worm` acontece mas a página fica "fantasma" (não interativa) até recarregar

### Causa raiz do "fantasma"
O `SmartNavigation` (linhas 47-65) tem um listener de `popstate` que chama `routeMiddleware.canAccessRoute()` de forma assíncrona. Quando `navigate('/worm')` é chamado programaticamente, o React Router atualiza a URL e renderiza a nova rota, mas o `popstate` handler dispara em seguida e pode chamar `navigate(redirectTo, { replace: true })` novamente, causando um loop ou estado inconsistente que congela a UI.

Além disso, o `WormAIBudgetEditPage` passa `budget` via `location.state` — ao navegar de volta para `/worm`, o state anterior pode persistir e causar re-renderizações conflitantes.

### Correções

**1. `src/pages/WormAIBudgetEditPage.tsx`**:
- Adicionar um header com botão de voltar (ícone ArrowLeft + "Voltar") que navega para `/worm` usando `navigate('/worm', { replace: true })`
- Usar `replace: true` em todas as navegações de volta para evitar conflito com popstate

**2. `src/pages/WormAIBudgetEditPage.tsx`** (callbacks):
- Trocar `navigate('/worm')` por `navigate('/worm', { replace: true })` nos callbacks `onSuccess` e `onCancel` — isso evita que o popstate handler re-intercepte a navegação

**3. `src/components/worm/WormBudgetForm.tsx`** (botão Cancelar):
- Garantir que o `onCancel` limpa o formulário antes de navegar (`clearSavedData()` + `reset()`)

### Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/WormAIBudgetEditPage.tsx` | Adicionar header com botão voltar; usar `replace: true` em todos os `navigate('/worm')` |
| `src/components/worm/WormBudgetForm.tsx` | Limpar form state no cancelar antes de chamar `onCancel` |

