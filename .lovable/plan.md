
# Melhorar Pop-up de Impressão Térmica em /service-orders (Mobile)

## Problema
O `DialogContent` usa `sm:max-w-md` sem largura responsiva para mobile, e o container do preview tem altura fixa `max-h-[400px]` e padding `p-4` que desperdiça espaço em telas pequenas. Isso causa corte do conteúdo como visto na screenshot.

## Solução

**Arquivo:** `src/components/printing/PrintLabelDialog.tsx`

### Alterações (mesmo padrão aplicado no PrintGroupDialog do /worm):

1. **DialogContent** (linha 286): Adicionar `w-[calc(100vw-32px)]` e `max-h-[85vh] overflow-y-auto`
2. **Preview container** (linha 307): Padding responsivo `p-2 sm:p-4`, altura responsiva `max-h-[50vh] sm:max-h-[400px]`, adicionar `overflow-x-auto`, background dark mode `dark:bg-gray-800`
3. **Select wrapper** (linhas 292-305): Remover wrapper `flex items-center gap-4` desnecessário, simplificar layout
4. **Footer button**: Já tem `w-full sm:w-auto`, está ok
