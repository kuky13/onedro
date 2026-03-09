

# Fix: Preview do Orçamento Cortado em /worm

## Problema
O container do preview tem `max-h-[50vh] sm:max-h-[400px]` que limita a altura visível. Em mobile, 50vh não é suficiente para mostrar o recibo completo, e o `overflow-y-auto` faz o conteúdo ficar escondido atrás do scroll.

## Solução

**Arquivo:** `src/components/worm/PrintGroupDialog.tsx`

1. **Remover max-height fixo do preview container** (linhas 137, 157): Trocar `max-h-[50vh] sm:max-h-[400px]` por nenhum limite de altura no preview. O scroll já está no `DialogContent` (`max-h-[85vh] overflow-y-auto`), então não precisa de duplo scroll.

2. **Resultado**: O preview expande para mostrar todo o conteúdo, e o dialog inteiro rola se necessário. O usuário consegue ver tudo sem scroll interno escondido.

